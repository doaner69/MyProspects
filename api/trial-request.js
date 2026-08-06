const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_USE_CASES = new Set(['b2b', 'b2c', 'recruitment', 'nonprofit', 'other']);
const ALLOWED_TRAFFIC = new Set(['under-10k', '10k-50k', '50k-250k', '250k-plus', 'unknown']);
const {
  getUserAgent,
  saveLeadWithNotification,
} = require('./_lead-submissions.js');

function cleanString(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeWebsite(value) {
  const cleaned = cleanString(value, 240);
  if (!cleaned) return '';
  return /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
}

function validatePayload(body = {}) {
  const payload = {
    firstName: cleanString(body.firstName, 80),
    lastName: cleanString(body.lastName, 80),
    workEmail: cleanString(body.workEmail, 160).toLowerCase(),
    company: cleanString(body.company, 160),
    website: normalizeWebsite(body.website),
    useCase: cleanString(body.useCase, 40),
    monthlyTraffic: cleanString(body.monthlyTraffic, 40),
    notes: cleanString(body.notes, 1200),
    consent: body.consent === true,
    websiteConfirm: cleanString(body.website_confirm, 160),
  };

  if (payload.websiteConfirm) return { ok: true, honeypot: true, payload: null };

  const errors = {};
  if (!payload.firstName) errors.firstName = 'First name is required.';
  if (!payload.lastName) errors.lastName = 'Last name is required.';
  if (!EMAIL_PATTERN.test(payload.workEmail)) errors.workEmail = 'A valid work email is required.';
  if (!payload.company) errors.company = 'Company is required.';

  try {
    const url = new URL(payload.website);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid protocol');
  } catch {
    errors.website = 'A valid website is required.';
  }

  if (!ALLOWED_USE_CASES.has(payload.useCase)) errors.useCase = 'Select a valid use case.';
  if (!ALLOWED_TRAFFIC.has(payload.monthlyTraffic)) errors.monthlyTraffic = 'Select a valid traffic range.';
  if (!payload.consent) errors.consent = 'Consent is required.';

  return Object.keys(errors).length
    ? { ok: false, errors, payload: null }
    : { ok: true, errors: {}, payload };
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function createHandler(dependencies = {}) {
  const submitLead = dependencies.submitLead ?? saveLeadWithNotification;
  const logger = dependencies.logger ?? console;

  return async function handler(req, res) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return sendJson(res, 405, { error: 'Method not allowed.' });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return sendJson(res, 400, { error: 'Request body must be valid JSON.' });
      }
    }

    const validation = validatePayload(body);
    if (!validation.ok) return sendJson(res, 400, { error: 'Review the highlighted fields.', fields: validation.errors });
    if (validation.honeypot) return sendJson(res, 200, { ok: true });

    try {
      const name = `${validation.payload.firstName} ${validation.payload.lastName}`.trim();
      await submitLead({
        submissionType: 'free_trial',
        source: 'myprospects-trial-page',
        name,
        firstName: validation.payload.firstName,
        lastName: validation.payload.lastName,
        email: validation.payload.workEmail,
        company: validation.payload.company,
        website: validation.payload.website,
        useCase: validation.payload.useCase,
        monthlyTraffic: validation.payload.monthlyTraffic,
        notes: validation.payload.notes,
        consent: validation.payload.consent,
        userAgent: getUserAgent(req),
      });
      return sendJson(res, 200, { ok: true });
    } catch (error) {
      logger.error('Trial request persistence failed:', error);
      return sendJson(res, 503, { error: 'We could not save your request right now. Please try again shortly.' });
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
module.exports.validatePayload = validatePayload;
