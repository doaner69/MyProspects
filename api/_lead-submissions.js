const DATABASE_URL_KEYS = [
  'NEON_DATABASE_URL',
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL_NON_POOLING',
  'DATABASE_URL_UNPOOLED',
];

const SLACK_MESSAGE_LIMIT = 1200;
const SLACK_FIELD_LIMIT = 280;

let defaultStorePromise;

function cleanEnvironmentValue(value) {
  const cleaned = value?.trim();
  return cleaned && cleaned !== '""' && cleaned !== "''" ? cleaned : undefined;
}

function resolveDatabaseUrl(env = {}) {
  const connectionString = DATABASE_URL_KEYS
    .map((key) => cleanEnvironmentValue(env[key]))
    .find(Boolean);

  if (!connectionString) {
    throw new Error(`Missing Neon database URL. Configure one of: ${DATABASE_URL_KEYS.join(', ')}.`);
  }

  return connectionString;
}

function resolveSlackWebhookUrl(env = {}) {
  const key = env.VERCEL_ENV === 'production'
    ? 'SLACK_WEBHOOK_URL'
    : 'SLACK_WEBHOOK_URL_PREVIEW';
  const value = cleanEnvironmentValue(env[key]);
  if (!value) return undefined;

  const url = new URL(value);
  const isSlackWebhook = url.protocol === 'https:'
    && url.hostname === 'hooks.slack.com'
    && url.pathname.startsWith('/services/');

  if (!isSlackWebhook) {
    throw new Error(`${key} must be a Slack incoming webhook URL.`);
  }

  return url.toString();
}

function cleanSlackText(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function escapeSlackText(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 16).trimEnd()}... [truncated]`;
}

function formatSlackValue(value, maxLength = SLACK_FIELD_LIMIT) {
  const cleaned = cleanSlackText(value);
  return cleaned ? escapeSlackText(truncate(cleaned, maxLength)) : 'Not provided';
}

function slackField(label, value) {
  return {
    type: 'mrkdwn',
    text: `*${label}*\n${formatSlackValue(value)}`,
  };
}

function buildSlackMessage(input) {
  const isTrial = input.submissionType === 'free_trial';
  const title = isTrial ? 'New MyProspects free trial request' : 'New MyProspects contact request';
  const detail = isTrial ? input.notes : input.message;
  const fields = [
    slackField('Name', input.name),
    slackField('Email', input.email),
  ];

  if (isTrial) {
    fields.push(
      slackField('Company', input.company),
      slackField('Website', input.website),
      slackField('Use case', input.useCase),
      slackField('Monthly traffic', input.monthlyTraffic),
    );
  }

  return {
    text: `${title} from ${cleanSlackText(input.name) || 'Unknown visitor'} (${cleanSlackText(input.email) || 'no email provided'})`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: title, emoji: false },
      },
      { type: 'section', fields },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${isTrial ? 'What they want to learn' : 'Message'}*\n${formatSlackValue(detail, SLACK_MESSAGE_LIMIT)}`,
        },
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `*Source:* ${formatSlackValue(input.source)}` },
          { type: 'mrkdwn', text: `*Environment:* ${formatSlackValue(process.env.VERCEL_ENV || 'local')}` },
        ],
      },
    ],
  };
}

function createLeadStore(sql) {
  let schemaReady;

  async function ensureSchema() {
    if (!schemaReady) {
      schemaReady = (async () => {
        await sql`
          CREATE TABLE IF NOT EXISTS public.myprospects_leads (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            submission_type TEXT NOT NULL,
            source TEXT NOT NULL,
            name TEXT,
            first_name TEXT,
            last_name TEXT,
            email TEXT NOT NULL,
            company TEXT,
            website TEXT,
            use_case TEXT,
            monthly_traffic TEXT,
            message TEXT,
            notes TEXT,
            consent BOOLEAN,
            user_agent TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT myprospects_leads_submission_type_check
              CHECK (submission_type IN ('contact', 'free_trial'))
          )
        `;

        await sql`
          CREATE INDEX IF NOT EXISTS myprospects_leads_created_at_idx
            ON public.myprospects_leads (created_at DESC)
        `;

        await sql`
          CREATE INDEX IF NOT EXISTS myprospects_leads_source_idx
            ON public.myprospects_leads (source, created_at DESC)
        `;
      })().catch((error) => {
        schemaReady = undefined;
        throw error;
      });
    }

    return schemaReady;
  }

  async function saveLead(input) {
    await ensureSchema();

    const rows = await sql`
      INSERT INTO public.myprospects_leads (
        submission_type,
        source,
        name,
        first_name,
        last_name,
        email,
        company,
        website,
        use_case,
        monthly_traffic,
        message,
        notes,
        consent,
        user_agent
      )
      VALUES (
        ${input.submissionType},
        ${input.source},
        ${input.name ?? null},
        ${input.firstName ?? null},
        ${input.lastName ?? null},
        ${input.email},
        ${input.company ?? null},
        ${input.website ?? null},
        ${input.useCase ?? null},
        ${input.monthlyTraffic ?? null},
        ${input.message ?? null},
        ${input.notes ?? null},
        ${input.consent ?? null},
        ${input.userAgent ?? null}
      )
      RETURNING id, created_at
    `;

    return rows[0];
  }

  return { ensureSchema, saveLead };
}

async function getDefaultStore() {
  if (!defaultStorePromise) {
    defaultStorePromise = import('@neondatabase/serverless')
      .then(({ neon }) => createLeadStore(neon(resolveDatabaseUrl(process.env))))
      .catch((error) => {
        defaultStorePromise = undefined;
        throw error;
      });
  }

  return defaultStorePromise;
}

async function saveLead(input) {
  return (await getDefaultStore()).saveLead(input);
}

async function notifySlack(input, options = {}) {
  const env = options.env ?? process.env;
  const webhookUrl = resolveSlackWebhookUrl(env);
  if (!webhookUrl) return { status: 'skipped', reason: 'missing_webhook' };

  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildSlackMessage(input)),
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Slack webhook returned ${response.status}${responseText ? `: ${truncate(responseText, 200)}` : ''}`);
  }

  return { status: 'sent' };
}

async function saveLeadWithNotification(input, dependencies = {}) {
  const persist = dependencies.saveLead ?? saveLead;
  const sendNotification = dependencies.notifySlack ?? notifySlack;
  const logger = dependencies.logger ?? console;

  const savedLead = await persist(input);
  try {
    await sendNotification(input);
  } catch (error) {
    logger.warn('MyProspects Slack lead notification failed.', error);
  }

  return savedLead;
}

function getUserAgent(req) {
  const value = req?.headers?.['user-agent'];
  return typeof value === 'string' ? value.trim().slice(0, 500) : null;
}

module.exports = {
  buildSlackMessage,
  createLeadStore,
  getUserAgent,
  notifySlack,
  resolveDatabaseUrl,
  resolveSlackWebhookUrl,
  saveLeadWithNotification,
};
