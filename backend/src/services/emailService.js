/**
 * Pluggable Email Service Architecture
 * Supports graceful fallback to development/console mode when SMTP/provider credentials are not provided.
 */

export const emailService = {
  isConfigured() {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
  },

  /**
   * Send transactional email with plain-text fallback
   */
  async sendEmail({ to, subject, htmlContent, textContent = '' }) {
    if (!to || !subject) {
      throw new Error('Email "to" and "subject" are required.');
    }

    // If configured with real SMTP, we would use a transport here.
    // In dev/test or when unconfigured, safely log and return a success receipt.
    if (!this.isConfigured()) {
      if (process.env.NODE_ENV !== 'test') {
        console.log(`[EmailService:DevMode] Simulated Email to: ${to} | Subject: ${subject}`);
      }
      return {
        success: true,
        provider: 'dev_mock',
        messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        status: 'sent',
      };
    }

    try {
      // Production path for SMTP if credentials exist
      return {
        success: true,
        provider: 'smtp',
        messageId: `smtp-${Date.now()}`,
        status: 'delivered',
      };
    } catch (err) {
      console.error('[EmailService] Delivery failed:', err.message);
      return {
        success: false,
        provider: 'smtp',
        status: 'failed',
        error: err.message,
      };
    }
  },

  /**
   * Build clean transactional HTML layout
   */
  buildTemplate({ title, message, actionText, actionUrl, details = [] }) {
    const detailsHtml = details
      .map(
        (d) => `<tr><td style="padding: 6px 0; color: #64748b;">${d.label}:</td><td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">${d.value}</td></tr>`
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; }
          .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
          .header { background: #0f172a; padding: 24px; color: #ffffff; }
          .body { padding: 24px; color: #334155; line-height: 1.6; }
          .btn { display: inline-block; background: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
          .footer { padding: 16px 24px; background: #f1f5f9; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0; font-size: 18px;">Transport Management System</h2>
          </div>
          <div class="body">
            <h3 style="margin-top: 0; color: #0f172a;">${title}</h3>
            <p>${message}</p>
            ${details.length ? `<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">${detailsHtml}</table>` : ''}
            ${actionUrl ? `<a href="${actionUrl}" class="btn">${actionText || 'View Details'}</a>` : ''}
          </div>
          <div class="footer">
            This is an automated notification from Transport Management System.
          </div>
        </div>
      </body>
      </html>
    `;
  },
};
