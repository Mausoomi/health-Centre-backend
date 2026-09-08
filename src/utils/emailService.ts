import nodemailer, { Transporter } from 'nodemailer';

interface SendOtpEmailOptions {
  to: string;
  otp: string;
  name?: string;
}

// Create reusable Nodemailer transporter
let transporter: Transporter | null = null;

const getTransporter = (): Transporter | null => {
  if (transporter) return transporter;

  const user = process.env.SMTP_USER || '';
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 465;
  const secure = process.env.SMTP_SECURE !== 'false';

  if (!user || !pass) {
    return null;
  }

  // If host is Gmail, use optimized Gmail service configuration
  if (host.includes('gmail') || user.endsWith('@gmail.com')) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
      connectionTimeout: 4000,
      greetingTimeout: 3000,
      socketTimeout: 5000,
    } as any);
    return transporter;
  }

  // Standard SMTP transport
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 4000,
    greetingTimeout: 3000,
    socketTimeout: 5000,
  } as any);

  return transporter;
};

/**
 * Send OTP verification email using Nodemailer
 */
export const sendOtpEmail = async ({
  to,
  otp,
  name,
}: SendOtpEmailOptions): Promise<{
  sent: boolean;
  messageId?: string;
  previewUrl?: string;
  deliveredTo?: string;
}> => {
  const recipientName = name || to.split('@')[0] || 'Member';
  const user = process.env.SMTP_USER || '';
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const fromAddress =
    host.includes('gmail') || user.endsWith('@gmail.com')
      ? `"HealthCentreApp" <${user}>`
      : process.env.EMAIL_FROM || `"HealthCentreApp" <${user || 'no-reply@healthcentreapp.com'}>`;
  const normalizedTo = to.trim().toLowerCase();

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HealthCentreApp Login Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; color: #173f42;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7f6; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="560" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border: 1px solid #e5eceb;">
          <!-- Header -->
          <tr>
            <td style="background-color: #0f8f8f; padding: 32px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">HealthCentreApp</h1>
              <p style="color: #e0f2f1; margin: 6px 0 0 0; font-size: 13px;">Care &amp; Community Health Portal</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #173f42;">Your Login Verification Code</h2>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #466567;">
                Hello <strong>${recipientName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #466567;">
                Use the following 6-digit verification code to complete your secure sign-in to HealthCentreApp:
              </p>

              <!-- OTP Box -->
              <div style="background-color: #f0f7f6; border: 2px dashed #0f8f8f; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 28px;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #0f8f8f; display: inline-block;">
                  ${otp}
                </span>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #5f7d80;">Valid for <strong>5 minutes</strong></p>
              </div>

              <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.5; color: #6e888a;">
                If you did not request this login code, you can safely ignore this email. No one can access your account without this code.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafcfb; padding: 20px 40px; border-top: 1px solid #edf2f1; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #8fa5a7;">
                &copy; ${new Date().getFullYear()} HealthCentreApp. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
 </body>
</html>
  `;

  console.log('=========================================================');
  console.log(`[NODEMAILER DISPATCH] Destination: ${normalizedTo} | OTP Code: ${otp}`);
  console.log('=========================================================');

  try {
    const activeTransporter = getTransporter();
    if (!activeTransporter) {
      console.warn(`[NODEMAILER SKIPPED] No SMTP credentials configured. Generated OTP for ${normalizedTo}: ${otp}`);
      return { sent: false, deliveredTo: normalizedTo };
    }

    const info = await activeTransporter.sendMail({
      from: fromAddress,
      to: normalizedTo,
      subject: `Your HealthCentreApp Login Code: ${otp}`,
      text: `Your HealthCentreApp login verification code is: ${otp}. It expires in 5 minutes.`,
      html: htmlContent,
    });

    console.log(`[NODEMAILER SUCCESS] Email delivered to ${normalizedTo}! Message ID: ${info.messageId}`);
    return { sent: true, messageId: info.messageId, deliveredTo: normalizedTo };
  } catch (err) {
    console.error('[NODEMAILER ERROR] Failed to send email:', (err as Error).message);
    return { sent: false, deliveredTo: normalizedTo };
  }
};
