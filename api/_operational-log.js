const { randomUUID } = require('node:crypto');

// Only fixed operational fields enter diagnostics. Request bodies, headers,
// database results and Error objects must never be passed to the logger.
function createRequestContext({ route, logger = console, now = () => performance.now() } = {}) {
  const requestId = randomUUID();
  const startedAt = now();
  let persistenceFailureLogged = false;
  const elapsed = (start = startedAt) => Math.max(0, Math.round(now() - start));
  function event(level, name, { outcome, durationMs, status, reason } = {}) {
    const record = { event: name, requestId, route, outcome, durationMs };
    if (status !== undefined) record.status = status;
    if (reason !== undefined) record.reason = reason;
    // A broken log sink must not turn an already-persisted submission into a retry.
    try { if (typeof logger[level] === 'function') logger[level](JSON.stringify(record)); } catch {}
  }
  function persistenceFailed(start = startedAt) {
    if (persistenceFailureLogged) return;
    persistenceFailureLogged = true;
    event('error', 'lead.persistence', { outcome: 'failed', durationMs: elapsed(start) });
  }
  return { requestId, event, elapsed, now, persistenceFailed };
}

module.exports = { createRequestContext };
