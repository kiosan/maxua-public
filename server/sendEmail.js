const { Resend } = require('resend');
const { pool } = require('./utils');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail({ to, subject, text, html = null, sessionId = null, reply_to = null }) {
  if (!to || !subject || !text) {
    throw new Error('Missing required fields: to, subject or text');
  }

  if (sessionId) {
    const result = await pool.query(
      'SELECT id FROM sessions WHERE id = $1 AND expires_at > NOW()',
      [sessionId]
    );
    if (result.rows.length === 0) {
      throw new Error('Invalid or expired session');
    }
  }

  const { data, error } = await resend.emails.send({
    from: 'Max Ischenko <hello@maxua.com>',
    to,
    subject,
    text,
    html: html || `<p>${text}</p>`,
    ...(reply_to && { reply_to: reply_to }),
  });

  if (error) throw new Error(error.message);
  return data.id;
}

module.exports = { sendEmail };

