/**
 * Professional HTML email template for form submissions.
 * Used by both Sidebar and Contact Us page forms.
 */

interface EmailData {
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
  source: string; // "Sidebar" or "Contact Page"
}

export function buildEmailHtml(data: EmailData): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          
          <!-- Header -->
          <tr>
            <td style="background:#111;padding:30px 40px;text-align:center;">
              <h1 style="margin:0;color:#ff5722;font-size:24px;font-weight:700;letter-spacing:2px;">RUNR</h1>
              <p style="margin:8px 0 0;color:#ffffffaa;font-size:12px;text-transform:uppercase;letter-spacing:1px;">New Enquiry Received</p>
            </td>
          </tr>

          <!-- Source Badge -->
          <tr>
            <td style="padding:24px 40px 0;">
              <span style="display:inline-block;background:#ff57221a;color:#ff5722;font-size:12px;font-weight:600;padding:6px 14px;border-radius:20px;text-transform:uppercase;">
                ${data.source}
              </span>
            </td>
          </tr>

          <!-- Details -->
          <tr>
            <td style="padding:24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
                    <span style="display:block;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Name</span>
                    <span style="font-size:16px;color:#111;font-weight:500;">${escapeHtml(data.name)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
                    <span style="display:block;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Email</span>
                    <a href="mailto:${escapeHtml(data.email)}" style="font-size:16px;color:#ff5722;text-decoration:none;font-weight:500;">${escapeHtml(data.email)}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
                    <span style="display:block;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Phone</span>
                    <a href="tel:${escapeHtml(data.phone)}" style="font-size:16px;color:#111;text-decoration:none;font-weight:500;">${escapeHtml(data.phone)}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
                    <span style="display:block;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Service</span>
                    <span style="font-size:16px;color:#111;font-weight:500;">${escapeHtml(data.service)}</span>
                  </td>
                </tr>
                ${data.message.trim() ? `
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
                    <span style="display:block;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Message</span>
                    <span style="font-size:15px;color:#333;line-height:1.6;">${escapeHtml(data.message)}</span>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding:12px 0;">
                    <span style="display:block;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Submitted On</span>
                    <span style="font-size:14px;color:#666;">${dateStr} at ${timeStr}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fafafa;padding:20px 40px;text-align:center;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#999;">RUNR &mdash; Create Together. Grow Forever.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildEmailSubject(data: { name: string; source: string }): string {
  return `New Enquiry from ${data.name} (${data.source})`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
