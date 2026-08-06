const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

async function handler(req, res) {
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

  const webhookUrl = process.env.TRIAL_REQUEST_WEBHOOK_URL;
  if (!webhookUrl) {
    return sendJson(res, 503, { error: 'Online contact requests are being configured. Please try again shortly.' });
  }

  try {
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validation.payload,
        source: 'myprospects-contact-page',
        submittedAt: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!webhookResponse.ok) throw new Error(`Webhook returned ${webhookResponse.status}`);
    return sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error('Contact request forwarding failed:', error.message);
    return sendJson(res, 502, { error: 'We could not send your message right now. Please try again shortly.' });
  }
}

module.exports = handler;
module.exports.validatePayload = validatePayload;
