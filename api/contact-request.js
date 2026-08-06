const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const {
  getUserAgent,
  saveLeadWithNotification,
} = require('./_lead-submissions.js');

function cleanString(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function validatePayload(body = {}) {
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
      await submitLead({
        submissionType: 'contact',
        source: 'myprospects-contact-page',
        ...validation.payload,
        userAgent: getUserAgent(req),
      });
      return sendJson(res, 200, { ok: true });
    } catch (error) {
      logger.error('Contact request persistence failed:', error);
      return sendJson(res, 503, { error: 'We could not save your message right now. Please try again shortly.' });
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
module.exports.validatePayload = validatePayload;
