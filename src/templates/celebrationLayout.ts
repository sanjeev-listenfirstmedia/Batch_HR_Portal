/**
 * Celebration emails: shared plain-text + two distinct HTML themes (birthday / anniversary).
 *
 * Images are loaded from CELEBRATION_ASSET_BASE_URL (set in .env / serverless.yml).
 * Upload the contents of the `public/` folder to your S3 bucket (or CDN) and set:
 *   CELEBRATION_ASSET_BASE_URL=https://your-bucket.s3.amazonaws.com/celebrations
 * If the variable is not set, inline SVG fallbacks are used instead.
 */

export interface CelebrationEmailParams {
  subject: string;
  body: string;
  /** If set, greeting becomes "Hi {userName},"; else "Hi Team," */
  userName?: string;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const externalAssetBaseUrl = process.env.CELEBRATION_ASSET_BASE_URL?.trim().replace(/\/+$/, "");

function assetUrl(fileName: string): string {
  if (!externalAssetBaseUrl) return "";
  return `${externalAssetBaseUrl}/${fileName}`;
}

function bodySectionHtml(body: string, textColor: string): string {
  const sections = body
    .split("\n\n")
    .map((section) => section.trim())
    .filter((section) => section.length > 0);

  return sections
    .map(
      (section) => `
        <p style="margin:0 0 16px;font-size:16px;line-height:1.75;color:${textColor};white-space:pre-line;">
          ${escapeHtml(section)}
        </p>
      `,
    )
    .join("");
}

/* ─── SVG fallbacks (shown when CELEBRATION_ASSET_BASE_URL is not set) ─────── */



/** Balloons cluster SVG fallback — right accent */
const svgBalloons = `<svg width="96" height="110" viewBox="0 0 96 110" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><line x1="48" y1="64" x2="40" y2="104" stroke="#44403c" stroke-width="1.5"/><line x1="48" y1="64" x2="56" y2="104" stroke="#44403c" stroke-width="1.5"/><ellipse cx="32" cy="24" rx="14" ry="18" fill="#ef4444"/><ellipse cx="56" cy="28" rx="14" ry="18" fill="#facc15"/><ellipse cx="46" cy="44" rx="14" ry="18" fill="#22d3ee"/><circle cx="28" cy="18" r="3" fill="white" opacity="0.4"/><circle cx="52" cy="22" r="3" fill="white" opacity="0.4"/></svg>`;

/** Stars cluster SVG fallback — anniversary accent */
const svgStarCluster = `<svg width="80" height="88" viewBox="0 0 80 88" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><path d="M40 4 L44 16 L56 16 L46 24 L50 36 L40 28 L30 36 L34 24 L24 16 L36 16 Z" fill="#f59e0b"/><path d="M62 44 L65 52 L74 52 L67 58 L70 68 L62 62 L54 68 L57 58 L50 52 L59 52 Z" fill="#d97706"/><path d="M18 48 L21 56 L30 56 L23 62 L26 72 L18 66 L10 72 L13 62 L6 56 L15 56 Z" fill="#eab308"/></svg>`;


/* ─── Image helpers ─────────────────────────────────────────────────────────── */

/**
 * Returns an <img> tag if the asset URL is configured, otherwise the SVG fallback.
 * `imgStyle` is extra inline CSS added to the <img> (e.g. CSS filter for anniversary theme).
 */
function imgOrFallback(params: {
  fileName: string;
  width: number;
  alt: string;
  fallbackHtml: string;
  imgStyle?: string;
}): string {
  const url = assetUrl(params.fileName);
  if (!url) return params.fallbackHtml;
  const extra = params.imgStyle ? ` ${params.imgStyle}` : "";
  return `<img src="${escapeHtml(url)}" alt="${escapeHtml(params.alt)}" width="${params.width}" style="display:block;width:100%;max-width:${params.width}px;height:auto;border:0;${extra}" />`;
}

/* ─── Birthday HTML ─────────────────────────────────────────────────────────── */

function birthdayCelebrationHtml(params: CelebrationEmailParams): string {
  const greeting = params.userName ? `Hi ${params.userName},` : "Hi Team,";
  const sectionHtml = bodySectionHtml(params.body, "#3d2c1f");

  const balloonsImg = imgOrFallback({
    fileName: "baloons.png",
    width: 150,
    alt: "",
    fallbackHtml: svgBalloons,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(params.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#fce7f3;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fce7f3;">
    <tr>
      <td align="center" style="padding:28px 16px 36px;">
        <!-- Card -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0"
               style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #f9a8d4;">

          <!-- ① Coloured header: title left, balloons right -->
          <tr>
            <td style="background:linear-gradient(135deg,#f9a8d4 0%,#fbcfe8 50%,#fce7f3 100%);padding:0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td valign="middle" style="padding:28px 0 20px 32px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:800;letter-spacing:0.45em;color:#9d174d;text-transform:uppercase;">People Lens · HR</p>
                    <p style="margin:0;font-size:46px;line-height:1.1;color:#831843;font-family:Georgia,'Times New Roman',serif;font-weight:400;">Happy<br/>Birthday! 🎂</p>
                  </td>
                  <td valign="bottom" align="right" width="160" style="padding:0 0 0 0;vertical-align:bottom;">
                    ${balloonsImg}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ② Body -->
          <tr>
            <td style="padding:28px 32px 12px;border-top:2px solid #fce7f3;">
              <p style="margin:0 0 18px;font-size:18px;font-weight:700;color:#3d2c1f;">${escapeHtml(greeting)}</p>
              ${sectionHtml}
            </td>
          </tr>

          <!-- ⑤ Callout -->
          <tr>
            <td style="padding:0 32px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:16px 20px;border-radius:12px;background:#fdf2f8;border-left:4px solid #ec4899;">
                    <p style="margin:0 0 4px;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#9d174d;">Spread the joy</p>
                    <p style="margin:0;font-size:15px;line-height:1.6;color:#831843;">Drop a message, or say it in person — every wish counts. 🥳</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ⑥ Footer -->
          <tr>
            <td style="padding:18px 32px 20px;background:#831843;border-radius:0 0 18px 18px;">
              <p style="margin:0 0 2px;color:#fce7f3;font-size:15px;font-weight:700;">Cheers,</p>
              <p style="margin:0;color:#fce7f3;font-size:13px;opacity:0.85;">People Lens Team · HR Notifications</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ─── Anniversary HTML ──────────────────────────────────────────────────────── */

function anniversaryCelebrationHtml(params: CelebrationEmailParams): string {
  const greeting = params.userName ? `Hi ${params.userName},` : "Hi Team,";
  const sectionHtml = bodySectionHtml(params.body, "#451a03");

  /*
   * Same image set, but a warm golden CSS filter shifts the palette:
   *   sepia(50%) → warms everything  |  hue-rotate(-15deg) → pink→amber/gold
   *   saturate(1.4) → richer gold    |  brightness(1.05) → slightly brighter
   * Works in Gmail, Apple Mail, Outlook.com.
   * Outlook desktop ignores filters and shows the original image — still fine.
   */
  const f = "filter:sepia(50%) saturate(1.4) hue-rotate(-15deg) brightness(1.05);";

  const balloonsImg = imgOrFallback({
    fileName: "baloons.png",
    width: 150,
    alt: "",
    fallbackHtml: svgStarCluster,
    imgStyle: f,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(params.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#fef3c7;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fef3c7;">
    <tr>
      <td align="center" style="padding:28px 16px 36px;">
        <!-- Card -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0"
               style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #fde68a;">

          <!-- ① Coloured header: title left, balloons (golden-tinted) right -->
          <tr>
            <td style="background:linear-gradient(135deg,#fbbf24 0%,#fde68a 55%,#fef3c7 100%);padding:0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td valign="middle" style="padding:28px 0 20px 32px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:800;letter-spacing:0.45em;color:#92400e;text-transform:uppercase;">People Lens · HR</p>
                    <p style="margin:0;font-size:44px;line-height:1.1;color:#78350f;font-family:Georgia,'Times New Roman',serif;font-weight:400;">Happy<br/>Anniversary! 🏆</p>
                  </td>
                  <td valign="bottom" align="right" width="160" style="padding:0;vertical-align:bottom;">
                    ${balloonsImg}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ② Body -->
          <tr>
            <td style="padding:28px 32px 12px;border-top:2px solid #fde68a;">
              <p style="margin:0 0 18px;font-size:18px;font-weight:700;color:#451a03;">${escapeHtml(greeting)}</p>
              ${sectionHtml}
            </td>
          </tr>

          <!-- ⑤ Callout -->
          <tr>
            <td style="padding:0 32px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:16px 20px;border-radius:12px;background:#fffbeb;border-left:4px solid #f59e0b;">
                    <p style="margin:0 0 4px;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#92400e;">Thank you for the journey</p>
                    <p style="margin:0;font-size:15px;line-height:1.6;color:#78350f;">Every year you've been here has made us better — thank you for the dedication, growth, and impact you bring. ⭐</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ⑥ Footer -->
          <tr>
            <td style="padding:18px 32px 20px;background:#78350f;border-radius:0 0 18px 18px;">
              <p style="margin:0 0 2px;color:#fef3c7;font-size:15px;font-weight:700;">Cheers,</p>
              <p style="margin:0;color:#fef3c7;font-size:13px;opacity:0.85;">People Lens Team · HR Notifications</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function celebrationText(params: CelebrationEmailParams): string {
  const greeting = params.userName ? `Hi ${params.userName},` : "Hi Team,";
  const sections = params.body
    .split("\n\n")
    .map((section) => section.trim())
    .filter((section) => section.length > 0);

  let output = `${greeting}\n\n`;
  output += `${params.subject}\n`;
  output += `${"=".repeat(Math.max(params.subject.length, 10))}\n\n`;
  output += `${sections.join("\n\n")}\n\n`;
  output += "Let's celebrate together.\n\n";
  output += "Cheers,\nPeople Lens Team";
  return output.trim();
}

export function renderBirthdayCelebrationEmail(params: CelebrationEmailParams): { subject: string; html: string; text: string } {
  return {
    subject: params.subject,
    html: birthdayCelebrationHtml(params),
    text: celebrationText(params),
  };
}

export function renderAnniversaryCelebrationEmail(params: CelebrationEmailParams): { subject: string; html: string; text: string } {
  return {
    subject: params.subject,
    html: anniversaryCelebrationHtml(params),
    text: celebrationText(params),
  };
}
