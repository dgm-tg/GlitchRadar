const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const FROM    = process.env.SMTP_FROM || 'GlitchRadar <noreply@glitchradar.io>';

async function sendInvite(email, token) {
  const url = `${APP_URL}/invite/${token}`;
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: "You've been invited to GlitchRadar",
    text: `You've been invited to join a team on GlitchRadar.\n\nAccept your invitation: ${url}`,
    html: `
      <p>You've been invited to join a team on GlitchRadar.</p>
      <p><a href="${url}" style="background:#C1121F;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;margin-top:8px;">Accept invitation</a></p>
      <p style="color:#6b7280;font-size:12px;margin-top:16px;">Or copy this link: ${url}</p>
    `,
  });
}

async function sendDownAlert(emails, monitor) {
  await transporter.sendMail({
    from: FROM,
    to: emails.join(', '),
    subject: `[GlitchRadar] ${monitor.name} is DOWN`,
    text: `Your monitor "${monitor.name}" (${monitor.url}) is not responding.`,
    html: `
      <p>Your monitor <strong>${monitor.name}</strong> is <span style="color:#C1121F">DOWN</span>.</p>
      <p>URL: <a href="${monitor.url}">${monitor.url}</a></p>
    `,
  });
}

async function sendRecoveryAlert(emails, monitor) {
  await transporter.sendMail({
    from: FROM,
    to: emails.join(', '),
    subject: `[GlitchRadar] ${monitor.name} has recovered`,
    text: `Your monitor "${monitor.name}" (${monitor.url}) is back up.`,
    html: `
      <p>Your monitor <strong>${monitor.name}</strong> is back <span style="color:#22c55e">UP</span>.</p>
      <p>URL: <a href="${monitor.url}">${monitor.url}</a></p>
    `,
  });
}

module.exports = { sendInvite, sendDownAlert, sendRecoveryAlert };
