import type { EmailTemplateConfig } from '../types/index.ts';

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULTS: Required<EmailTemplateConfig> = {
  title: '',
  subtitle: '',
  logoUrl: '',
  headerBgColor: '#1e293b',
  headerTextColor: '#ffffff',
  footerHtml: '<p style="margin: 0; font-size: 12px; color: #94a3b8;">This is an automated report. Please do not reply to this email.</p>',
  fontFamily: 'Arial, Helvetica, sans-serif',
  maxWidth: 700,
  bodyBgColor: '#f1f5f9',
  contentBgColor: '#ffffff',
  accentColor: '#2563eb',
};

export function mergeDefaults(
  config?: EmailTemplateConfig,
): Required<EmailTemplateConfig> {
  return { ...DEFAULTS, ...config };
}

// ─── HTML Wrapper ───────────────────────────────────────────────────────────

export function wrapEmailHtml(
  bodyFragments: string[],
  template: Required<EmailTemplateConfig>,
): string {
  const headerSection = buildHeader(template);
  const contentSection = buildContent(bodyFragments, template);
  const footerSection = buildFooter(template);

  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(template.title)}</title>
  <style>
    body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${template.bodyBgColor}; font-family: ${template.fontFamily};">
  <!-- Outer wrapper table -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${template.bodyBgColor};">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <!-- Inner content table -->
        <table role="presentation" width="${template.maxWidth}" cellpadding="0" cellspacing="0" border="0" style="max-width: ${template.maxWidth}px; width: 100%;">
          ${headerSection}
          ${contentSection}
          ${footerSection}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Sections ───────────────────────────────────────────────────────────────

function buildHeader(t: Required<EmailTemplateConfig>): string {
  if (!t.title && !t.subtitle && !t.logoUrl) return '';

  const logoPart = t.logoUrl
    ? `<img src="${t.logoUrl}" alt="Logo" height="32" style="display: block; margin: 0 auto 12px auto; height: 32px; width: auto;" />`
    : '';

  const titlePart = t.title
    ? `<h1 style="margin: 0; font-family: ${t.fontFamily}; font-size: 22px; font-weight: 700; color: ${t.headerTextColor}; line-height: 1.3;">${escapeHtml(t.title)}</h1>`
    : '';

  const subtitlePart = t.subtitle
    ? `<p style="margin: 4px 0 0 0; font-family: ${t.fontFamily}; font-size: 13px; color: ${t.headerTextColor}; opacity: 0.75;">${escapeHtml(t.subtitle)}</p>`
    : '';

  return `
          <tr>
            <td style="background-color: ${t.headerBgColor}; padding: 24px 32px; border-radius: 8px 8px 0 0; text-align: center;">
              ${logoPart}
              ${titlePart}
              ${subtitlePart}
            </td>
          </tr>`;
}

function buildContent(
  fragments: string[],
  t: Required<EmailTemplateConfig>,
): string {
  const hasHeader = !!(t.title || t.subtitle || t.logoUrl);
  const topRadius = hasHeader ? '0' : '8px';

  const rows = fragments
    .map(
      (html) => `
            <tr>
              <td style="padding: 24px 32px 0 32px;">
                ${html}
              </td>
            </tr>`,
    )
    .join('');

  return `
          <tr>
            <td style="background-color: ${t.contentBgColor}; border-radius: ${topRadius} ${topRadius} 0 0; padding: 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${rows}
                <!-- Bottom spacer -->
                <tr><td style="padding: 24px 0 0 0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>`;
}

function buildFooter(t: Required<EmailTemplateConfig>): string {
  if (!t.footerHtml) return '';

  return `
          <tr>
            <td style="background-color: ${t.contentBgColor}; padding: 16px 32px 24px 32px; border-top: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; text-align: center; font-family: ${t.fontFamily};">
              ${t.footerHtml}
            </td>
          </tr>`;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
