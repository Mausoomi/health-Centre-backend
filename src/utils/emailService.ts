import nodemailer from 'nodemailer';

interface SendOtpEmailOptions {
  to: string;
  otp: string;
  name?: string;
}

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

const getTransporter = async (): Promise<nodemailer.Transporter> => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 587;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (user && pass) {
    // If Gmail host or user ends with gmail.com, use standard Gmail service
    if (host?.includes('gmail') || user.endsWith('@gmail.com')) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user,
          pass,
        },
      });
      return transporter;
    }

    // Custom SMTP
    if (host) {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });
      return transporter;
    }
  }

  // Fallback for dev if no credentials provided
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: 'ethereal.user@ethereal.email',
      pass: 'ethereal.pass',
    },
  });

  return transporter;
};

export const sendOtpEmail = async ({ to, otp, name }: SendOtpEmailOptions): Promise<{ sent: boolean; messageId?: string; previewUrl?: string }> => {
  const recipientName = name || to.split('@')[0] || 'Member';
  const fromAddress = process.env.EMAIL_FROM || '"HealthCentreApp" <noreply@healthcentreapp.com>';

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
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #4a6568;">
                Hello <strong>${recipientName}</strong>,<br>
                Use the one-time verification code below to sign in to your HealthCentreApp account.
              </p>

              <!-- OTP Box -->
              <div style="background-color: #f0f8f8; border: 2px dashed #0f8f8f; border-radius: 12px; padding: 24px; text-align: center; margin: 28px 0;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f8f8f; display: inline-block;">${otp}</span>
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

  console.log('---------------------------------------------------------');
  console.log(`[EMAIL DISPATCH] Target: ${to} | Code: ${otp}`);
  console.log('---------------------------------------------------------');

  const resendApiKey = process.env.RESEND_API_KEY;

  // 1. Primary: Use Resend API if API key is provided
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [to],
          subject: `Your HealthCentreApp Login Code: ${otp}`,
          html: htmlContent,
        }),
      });

      const data: any = await response.json().catch(() => ({}));

      if (response.ok) {
        console.log(`[RESEND SUCCESS] Live OTP email dispatched to ${to}! Message ID: ${data?.id}`);
        return { sent: true, messageId: data?.id };
      } else {
        console.error('[RESEND API ERROR]:', data);
      }
    } catch (err) {
      console.error('[RESEND NETWORK ERROR]:', err);
    }
  }

  // 2. Secondary: Fallback to SMTP if configured
  const hasSmtpConfig = Boolean((process.env.SMTP_HOST || process.env.EMAIL_HOST) && (process.env.SMTP_USER || process.env.EMAIL_USER));

  if (!hasSmtpConfig) {
    return { sent: true };
  }

  try {
    const activeTransporter = await getTransporter();
    const info = await activeTransporter.sendMail({
      from: fromAddress,
      to,
      subject: `Your HealthCentreApp Login Code: ${otp}`,
      text: `Your HealthCentreApp login verification code is: ${otp}. It expires in 5 minutes.`,
      html: htmlContent,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    if (previewUrl) {
      console.log(`[EMAIL PREVIEW URL]: ${previewUrl}`);
    }

    return { sent: true, messageId: info.messageId, previewUrl };
  } catch (err) {
    console.error('[EMAIL ERROR] Failed to send email via SMTP:', err);
    return { sent: false };
  }
};
