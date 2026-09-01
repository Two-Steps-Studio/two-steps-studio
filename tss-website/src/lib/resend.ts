import { Resend } from 'resend';

/**
 * Resend Client Configuration
 * Used to send transactional emails for login tokens, password resets, etc.
 */

// Initialize Resend client
export const resend = new Resend(process.env.RESEND_API_KEY);

// Default sender configuration
export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'no-reply@two-steps-studio.com';
export const FROM_DOMAIN = process.env.RESEND_FROM_DOMAIN || 'two-steps-studio.com';

/**
 * Check if Resend is configured
 */
export const isResendConfigured = !!process.env.RESEND_API_KEY;

/**
 * Send an email
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<{ id: string; error?: Error }> {
  if (!isResendConfigured) {
    throw new Error('Resend is not configured. Set RESEND_API_KEY in .env');
  }

  try {
    const result = await resend.emails.send({
      from: `Two Steps Studio <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
    });

    return result;
  } catch (error) {
    console.error('[Resend] Email sending failed:', error);
    throw error;
  }
}

/**
 * Send login token email
 */
export async function sendLoginTokenEmail(email: string, token: string): Promise<{ id: string }> {
  const subject = 'Twój kod weryfikacyjny - Two Steps Studio';
  const html = generateLoginTokenHtml(token);
  const text = `Twój kod weryfikacyjny to:\n\n${token}\n\nTen kod wygasza za 10 minut.`;

  const result = await sendEmail(email, subject, html, text);
  return result;
}

// HTML template for login token
function generateLoginTokenHtml(token: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Two Steps Studio - Kod Weryfikacyjny</title>
  <style>
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
    }
    .logo {
      margin-bottom: 20px;
      font-weight: bold;
      font-size: 24px;
      color: #333;
    }
    h1 {
      font-size: 18px;
      color: #555;
      margin: 0 0 10px 0;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .token {
      font-family: 'Courier New', monospace;
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
      background: #f5f5f5;
      padding: 15px 20px;
      border-radius: 8px;
      margin: 20px 0;
      letter-spacing: 4px;
      border: 2px dashed #667eea;
    }
    .description {
      color: #666;
      font-size: 14px;
      line-height: 1.6;
    }
    .warning {
      background: #fff3cd;
      border: 1px solid #ffc107;
      color: #856404;
      padding: 10px 15px;
      border-radius: 8px;
      margin-top: 20px;
      font-size: 13px;
    }
    .footer {
      margin-top: 30px;
      font-size: 12px;
      color: #999;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Two Steps Studio</div>
    <h1>Twój Kod Weryfikacyjny</h1>
    <div class="description">
      Aby zalogować się do konta Two Steps Studio, wpisz poniższy kod w formularzu logowania.
    </div>
    <div class="token">${token}</div>
    <div class="description">
      Kod jest ważny przez 10 minut. Nie udostępniaj go nikomu.
    </div>
    <div class="warning">
      ⚠️ Ten kod wygasza za 10 minut. Jeśli nie收到了 email, proszę nie wysyłać ponownie.
    </div>
    <div class="footer">
      Nie otrzymujesz kodu?<br>
      <a href="mailto:user@two-steps-studio.com">Skontaktuj się z nami</a>
    </div>
  </div>
</body>
</html>
  `.trim();
}
