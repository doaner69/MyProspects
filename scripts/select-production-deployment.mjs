import { readFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY = 'doaner69/MyProspects';
const SHA = /^[a-f0-9]{40}$/;
const isBot = actor => actor?.id === 35613825 && actor?.login === 'vercel[bot]';
const isRepository = repo => repo?.id === 1204386385 && repo?.full_name === REPOSITORY;
const requireCondition = (condition, message) => { if (!condition) throw new Error(message); };

export async function githubRequest(path, { token = process.env.GH_TOKEN, fetcher = fetch, timeoutMs = 10000 } = {}) {
  requireCondition(token, 'A read-only GitHub token is required.');
  requireCondition(/^(?:\/deployments\?environment=Production&per_page=100&page=[1-5]|\/deployments\/[1-9]\d*\/statuses\?per_page=1|\/compare\/[a-f0-9]{40}\.\.\.main)$/.test(path), 'Unsupported metadata API path.');
  try {
    const response = await fetcher(`https://api.github.com/repos/${REPOSITORY}${path}`, {
      method: 'GET', redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' },
    });
    requireCondition(response.ok, `GitHub metadata request failed (HTTP ${response.status}).`);
    return await response.json();
  } catch (error) {
    if (/^GitHub metadata request failed \(HTTP \d+\)\.$/.test(error?.message)) throw error;
    throw new Error('GitHub metadata request failed or timed out.');
  }
}

export async function selectProductionDeployment({ eventName, event, request = githubRequest }) {
  if (eventName === 'deployment_status') {
    if (!isRepository(event.repository) || !isBot(event.sender) || !isBot(event.deployment?.creator)
      || !isBot(event.deployment_status?.creator) || event.deployment?.environment !== 'Production'
      || event.deployment_status?.state !== 'success') return { run: false, reason: 'Not a trusted successful production event.' };
    requireCondition(SHA.test(event.deployment.sha), 'Deployment SHA must be a full lowercase commit SHA.');
    requireCondition(Number.isSafeInteger(event.deployment.id) && event.deployment.id > 0, 'Invalid deployment ID.');
  } else if (eventName !== 'workflow_dispatch' || (event.repository && !isRepository(event.repository))) {
    return { run: false, reason: 'Unsupported event or repository.' };
  }
  // A newer build is not live yet. Pick the newest active Vercel success, skipping inactive history.
  let current;
  for (let page = 1; page <= 5 && !current; page++) {
    const deployments = await request(`/deployments?environment=Production&per_page=100&page=${page}`);
    requireCondition(Array.isArray(deployments), 'Invalid GitHub deployments response.');
    for (const deployment of deployments) {
      if (deployment.environment !== 'Production' || !isBot(deployment.creator)) continue;
      requireCondition(Number.isSafeInteger(deployment.id) && deployment.id > 0, 'Invalid deployment ID.');
      const statuses = await request(`/deployments/${deployment.id}/statuses?per_page=1`);
      requireCondition(Array.isArray(statuses), 'Invalid GitHub deployment statuses response.');
      if (statuses[0]?.state === 'success' && isBot(statuses[0].creator)) { current = deployment; break; }
    }
    if (deployments.length < 100) break;
  }
  requireCondition(current, 'No active successful Vercel production deployment found in recent history.');
  requireCondition(SHA.test(current.sha), 'Deployment SHA must be a full lowercase commit SHA.');
  if (eventName === 'deployment_status' && current.id !== event.deployment.id) return { run: false, reason: 'Superseded production event.' };
  if (eventName === 'deployment_status') requireCondition(current.sha === event.deployment.sha, 'Deployment event SHA does not match GitHub metadata.');
  const comparison = await request(`/compare/${current.sha}...main`);
  requireCondition(['identical', 'ahead'].includes(comparison?.status), 'Production commit is not in trusted main history.');
  return { run: true, sha: current.sha, deploymentId: current.id };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    requireCondition(process.env.GITHUB_REPOSITORY === REPOSITORY, 'Unexpected workflow repository.');
    const result = await selectProductionDeployment({ eventName: process.env.GITHUB_EVENT_NAME, event: JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')) });
    requireCondition(process.env.GITHUB_OUTPUT, 'GITHUB_OUTPUT is required.');
    appendFileSync(process.env.GITHUB_OUTPUT, `run=${result.run}\nsha=${result.sha || ''}\ndeployment_id=${result.deploymentId || ''}\n`);
    console.log(result.run ? `Selected production deployment ${result.deploymentId} at ${result.sha}.` : result.reason);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
