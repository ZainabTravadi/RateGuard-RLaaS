/**
 * Email Service
 * Handles sending emails via different providers
 */

import nodemailer from 'nodemailer';

export const emailProviders = {
  smtp: "smtp",
  sendgrid: "sendgrid",
  mailgun: "mailgun",
  aws_ses: "aws_ses",
  console: "console",
};

/**
 * Send email using configured provider
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML email body
 * @param {string} text - Plain text email body (optional)
 */
export async function sendEmail(to, subject, html, text = null) {
  const provider =
    process.env.EMAIL_PROVIDER ||
    (process.env.NODE_ENV === "production"
      ? emailProviders.smtp
      : emailProviders.console);

  console.log(`📧 Sending email via ${provider} to ${to}`);

  try {
    switch (provider) {
      case emailProviders.smtp:
        return await sendViaSMTP(to, subject, html, text);
      case emailProviders.sendgrid:
        return await sendViaSendGrid(to, subject, html, text);
      case emailProviders.mailgun:
        return await sendViaMailgun(to, subject, html, text);
      case emailProviders.aws_ses:
        return await sendViaSES(to, subject, html, text);
      case emailProviders.console:
      default:
        return await sendViaConsole(to, subject, html, text);
    }
  } catch (err) {
    console.error("Email sending failed:", err);
    throw err;
  }
}

/**
 * SMTP provider (using nodemailer) - Works with Gmail, Outlook, etc.
 * For Gmail: Enable "App Passwords" in Google Account settings
 */
async function sendViaSMTP(to, subject, html, text) {
  const port = parseInt(process.env.SMTP_PORT || '587');
  const smtpConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: port,
    secure: port === 465, // true for 465, false for other ports (587, 25)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  // For development without SMTP credentials, use ethereal email (creates test account)
  let transporter;
  
  if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
    console.log("⚠️  No SMTP credentials - falling back to console email logging");
    return sendViaConsole(to, subject, html, text);
  } else {
    console.log(`✅ Using SMTP credentials for ${smtpConfig.auth.user}`);
    transporter = nodemailer.createTransport(smtpConfig);
  }

  const fromEmail = process.env.FROM_EMAIL || 'noreply@rateguard.io';
  
  const info = await transporter.sendMail({
    from: `"RateGuard" <${fromEmail}>`,
    to,
    subject,
    text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    html,
  });

  console.log(`✅ Email sent: ${info.messageId}`);
  
  // If using Ethereal, log the preview URL
  if (!smtpConfig.auth.user) {
    console.log(`📬 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  }

  return { 
    success: true, 
    provider: 'smtp', 
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info)
  };
}

/**
 * Development: Log to console
 */
async function sendViaConsole(to, subject, html, text) {
  console.log(`
    ╔════════════════════════════════════════════╗
    ║           EMAIL PREVIEW (DEVELOPMENT)      ║
    ╚════════════════════════════════════════════╝
    TO: ${to}
    SUBJECT: ${subject}
    ────────────────────────────────────────────
    ${html}
    ────────────────────────────────────────────
  `);

  return { success: true, provider: "console", messageId: "dev-" + Date.now() };
}

/**
 * SendGrid integration
 * Requires: SENDGRID_API_KEY environment variable
 */
async function sendViaSendGrid(to, subject, html, text) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || "noreply@rateguard.io";

  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY not configured");
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail, name: "RateGuard" },
      subject,
      content: [
        {
          type: "text/html",
          value: html,
        },
      ],
      ...(text && {
        reply_to: { email: fromEmail },
      }),
    }),
  });

  if (!response.ok) {
    throw new Error(`SendGrid error: ${response.statusText}`);
  }

  return { success: true, provider: "sendgrid", messageId: response.headers.get("x-message-id") };
}

/**
 * Mailgun integration
 * Requires: MAILGUN_API_KEY and MAILGUN_DOMAIN environment variables
 */
async function sendViaMailgun(to, subject, html, text) {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const fromEmail = process.env.FROM_EMAIL || `noreply@${domain}`;

  if (!apiKey || !domain) {
    throw new Error("MAILGUN_API_KEY or MAILGUN_DOMAIN not configured");
  }

  const formData = new FormData();
  formData.append("from", `RateGuard <${fromEmail}>`);
  formData.append("to", to);
  formData.append("subject", subject);
  formData.append("html", html);
  if (text) {
    formData.append("text", text);
  }

  const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`api:${apiKey}`)}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Mailgun error: ${response.statusText}`);
  }

  const data = await response.json();
  return { success: true, provider: "mailgun", messageId: data.id };
}

/**
 * AWS SES integration
 * Requires: AWS SDK credentials and SES_REGION environment variable
 */
async function sendViaSES(to, subject, html, text) {
  try {
    const { SESClient, SendEmailCommand } = await import("@aws-sdk/client-ses");

    const region = process.env.SES_REGION || "us-east-1";
    const fromEmail = process.env.FROM_EMAIL || "noreply@rateguard.io";

    const client = new SESClient({ region });

    const command = new SendEmailCommand({
      Source: `RateGuard <${fromEmail}>`,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject },
        Body: {
          Html: { Data: html },
          ...(text && { Text: { Data: text } }),
        },
      },
    });

    const response = await client.send(command);
    return { success: true, provider: "aws_ses", messageId: response.MessageId };
  } catch (err) {
    throw new Error(`AWS SES error: ${err.message}`);
  }
}

/**
 * Email Templates
 */
export const emailTemplates = {
  passwordReset: (otp) => ({
    subject: "Reset Your RateGuard Password",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 40px 20px; text-align: center; }
            .otp { font-size: 32px; letter-spacing: 5px; font-weight: bold; color: #667eea; font-family: 'Courier New', monospace; margin: 20px 0; }
            .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset</h1>
            </div>
            <div class="content">
              <p>You requested to reset your password. Your verification code is:</p>
              <div class="otp">${otp}</div>
              <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes.</p>
              <p style="color: #6b7280; font-size: 14px;">If you didn't request this, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2026 RateGuard. All rights reserved.</p>
              <p>If you have questions, contact support@rateguard.io</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Your password reset code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, please ignore this email.`,
  }),

  passwordResetSuccess: () => ({
    subject: "Password Reset Successfully",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 40px 20px; text-align: center; }
            .success { color: #10b981; font-weight: bold; }
            .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✓ Password Reset Successful</h1>
            </div>
            <div class="content">
              <p class="success">Your password has been successfully reset.</p>
              <p>You can now log in to your RateGuard account with your new password.</p>
              <p style="color: #6b7280; font-size: 14px;">If you didn't do this, please contact support immediately.</p>
            </div>
            <div class="footer">
              <p>© 2026 RateGuard. All rights reserved.</p>
              <p>If you have questions, contact support@rateguard.io</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Your password has been successfully reset. You can now log in with your new password.\n\nIf you didn't do this, please contact support immediately.`,
  }),

  welcomeEmail: (email) => ({
    subject: "Welcome to RateGuard!",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 40px 20px; }
            .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to RateGuard!</h1>
            </div>
            <div class="content">
              <p>Hi ${email.split("@")[0]},</p>
              <p>Welcome to RateGuard! We're excited to have you on board.</p>
              <p>You're all set to start managing API rate limits. Check out our documentation to get started.</p>
              <p>Questions? Feel free to reach out to support@rateguard.io</p>
            </div>
            <div class="footer">
              <p>© 2026 RateGuard. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Welcome to RateGuard! You're all set to start managing API rate limits.`,
  }),
};
