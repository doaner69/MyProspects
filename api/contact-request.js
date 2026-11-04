const { createRequestContext } = require('./_operational-log.js');
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const {
  getUserAgent,
  saveLeadWithNotification,
} = require('./_lead-submissions.js');

function cleanString(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function validatePayload(body = {}) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: { body: 'Request body must be a JSON object.' }, payload: null };
  }

  const payload = {
    name: cleanString(body.name, 120),
    email: cleanString(body.email, 160).toLowerCase(),
    message: cleanString(body.message, 2000),
    websiteConfirm: cleanString(body.website_confirm, 160),
  };

  if (payload.websiteConfirm) return { ok: true, honeypot: true, payload: null };

  const errors = {};
  if (!payload.name) errors.name = 'Name is required.';
  if (!EMAIL_PATTERN.test(payload.email)) errors.email = 'A valid email is required.';
  if (!payload.message) errors.message = 'Message is required.';

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
    const context = createRequestContext({ route: '/api/contact-request', logger, now: dependencies.now });
    res.setHeader('X-Request-Id', context.requestId);
    const respond = (status, body, outcome) => {
      context.event('info', 'lead.request', { outcome, status, durationMs: context.elapsed() });
      return sendJson(res, status, body);
    };
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return respond(405, { error: 'Method not allowed.' }, 'method_rejected');
    }

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return respond(400, { error: 'Request body must be valid JSON.' }, 'malformed_json');
      }
    }

    const validation = validatePayload(body);
    if (!validation.ok) return respond(400, { error: 'Review the highlighted fields.', fields: validation.errors }, 'validation_rejected');
    if (validation.honeypot) return respond(200, { ok: true }, 'honeypot');

    try {
      await submitLead({
        submissionType: 'contact',
        source: 'myprospects-contact-page',
        ...validation.payload,
        userAgent: getUserAgent(req),
      }, { context, logger });
      return respond(200, { ok: true }, 'accepted');
    } catch {
      context.persistenceFailed();
      return respond(503, { error: 'We could not save your message right now. Please try again shortly.' }, 'unavailable');
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
module.exports.validatePayload = validatePayload;
