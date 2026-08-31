/// <reference path="../worker-configuration.d.ts" />
// @ts-ignore
import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";
import { getISTTime } from "./server-utils";
import type { Env } from "./server-utils";

export async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs: number = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Combine a caller-supplied signal with our timeout signal so both can abort the request.
    const signal = init?.signal
      ? AbortSignal.any([init.signal, controller.signal])
      : controller.signal;
    return await fetch(input, init ? { ...init, signal } : { signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getSecret(
  env: Env,
  key: string,
  isCritical = true,
): Promise<string | null> {
  const val = await env.PLATFORM_SECRETS.get(key);
  if (!val && isCritical) {
    console.warn(`[Config Missing] Key: ${key}`);
    // Non-blocking alert
    sendRedAlert(
      env,
      "Missing Configuration",
      `Critical configuration key '${key}' is missing or empty in PLATFORM_SECRETS.`,
    ).catch(() => { });
  }
  return val;
}

export async function getBackupEncryptionSecret(env: Env): Promise<string | undefined> {
  return (await getSecret(env, "BACKUP_ENCRYPTION_KEY", false)) ||
    (await getSecret(env, "JWT_SECRET", false)) ||
    undefined;
}

export async function sendRedAlert(env: Env, subject: string, message: string) {
  try {
    const adminEmail = await getSecret(env, "ADMIN_CONTACT_EMAIL", false);
    if (!adminEmail) return;

    const escapeHtml = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

    if (typeof safeSendEmail === "function") {
      const htmlBody = `
        <p><strong>Context:</strong> ${escapeHtml(subject)}</p>
        <p><strong>Error Details:</strong></p>
        <pre style="background: #fecaca; padding: 12px; border-radius: 8px; overflow-x: auto; font-size: 13px;">${escapeHtml(message)}</pre>
      `;
      const textBody = `Context: ${subject}\n\nError Details:\n${message}`;
      await safeSendEmail(
        env,
        adminEmail,
        `[URGENT] ${subject}`,
        `System Error: ${subject}`,
        htmlBody,
        textBody,
        true,
      );
    }
  } catch (e) {
    console.error("Failed to send red alert", e);
  }
}

export async function sendWhatsAppAlert(env: Env, context: string, error: any) {
  try {
    const apiKey = await getSecret(env, "INFOBIP_API_KEY");
    const baseUrl = await getSecret(env, "INFOBIP_BASE_URL");
    const adminWhatsApp = await getSecret(env, "ADMIN_WHATSAPP_NUMBER");

    if (!apiKey || !baseUrl || !adminWhatsApp) return;

    const message = `[YAGYA LMS ERROR]\nContext: ${context}\nError: ${error instanceof Error ? error.message : String(error).substring(0, 500)}`;

    await fetchWithTimeout(`${baseUrl.replace(/\/$/, "")}/whatsapp/1/message/text`, {
      method: "POST",
      headers: {
        Authorization: `App ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "919669509950",
        to: adminWhatsApp,
        content: { text: message },
      }),
    }, 5000);
  } catch (e) {
    console.error("Failed to send WhatsApp alert:", e);
  }
}

let _siteSettingsCache: { settings: Record<string, string>; ts: number } | null = null;
const SITE_SETTINGS_TTL_MS = 60_000;

export async function getSiteSettings(env: Env): Promise<Record<string, string>> {
  try {
    const now = Date.now();
    if (_siteSettingsCache && now - _siteSettingsCache.ts < SITE_SETTINGS_TTL_MS) {
      return _siteSettingsCache.settings;
    }
    const { results } = await env.DB.prepare(
      "SELECT key, value FROM SiteSettings",
    ).all();
    const settings: Record<string, string> = {};
    results.forEach((row: any) => {
      settings[row.key] = row.value;
    });
    _siteSettingsCache = { settings, ts: now };
    return settings;
  } catch (error) {
    console.error("[Settings Error] Failed to fetch settings from DB:", error);
    if (_siteSettingsCache) return _siteSettingsCache.settings;
    return {};
  }
}

export function generateEmailHTML(
  title: string,
  bodyContent: string,
  siteName: string = "Adityanveshan",
  dashboardName: string = "Adityanveshan Swadhyaya Vedika",
  childCompany: string = "Yagya Ashram",
): string {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
      <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">🙏 ${title}</h1>
      </div>
      <div style="background: #f8fafc; padding: 32px; color: #334155;">
        ${bodyContent}
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; text-align: center;">
          <p style="margin: 0;">Om! 🙏</p>
          <p style="margin: 4px 0 0 0;">${dashboardName} (${childCompany})</p>
        </div>
      </div>
    </div>
  `;
}

export function generateRedAlertHTML(
  title: string,
  bodyContent: string,
  siteName: string = "Adityanveshan",
): string {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #fecaca; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.1), 0 2px 4px -1px rgba(239, 68, 68, 0.06);">
      <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">🚨 ${title}</h1>
      </div>
      <div style="background: #fff1f2; padding: 32px; color: #881337;">
        ${bodyContent}
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #fecaca; color: #9f1239; font-size: 14px; text-align: center;">
          <p style="margin: 0;">System Generated Alert</p>
          <p style="margin: 4px 0 0 0;">${siteName} LMS</p>
        </div>
      </div>
    </div>
  `;
}

export async function safeSendEmail(
  env: Env,
  to: string,
  subject: string,
  title: string,
  bodyHtmlContent: string,
  bodyText: string,
  useRedAlert: boolean = false,
): Promise<boolean> {
  try {
    const settings = await getSiteSettings(env);

    const siteName = settings?.site_name || "Adityanveshan";
    const dashboardName =
      settings?.dashboard_name || "Adityanveshan Swadhyaya Vedika";
    const childCompany = settings?.child_company || "Yagya Ashram";

    const fromName = `${siteName} (${childCompany})`;
    const fromAddress = "om@yagyaashram.com";

    const htmlContent = useRedAlert
      ? generateRedAlertHTML(title, bodyHtmlContent, siteName)
      : generateEmailHTML(
        title,
        bodyHtmlContent,
        siteName,
        dashboardName,
        childCompany,
      );

    // Build proper MIME message using mimetext (required by Cloudflare Email Workers)
    const msg = createMimeMessage();
    msg.setSender({ name: fromName, addr: fromAddress });
    msg.setRecipient(to);
    msg.setSubject(subject);
    msg.addMessage({ contentType: "text/plain", data: bodyText });
    msg.addMessage({ contentType: "text/html", data: htmlContent });

    const rawEmail = msg.asRaw();

    // Cloudflare Email Workers expect an EmailMessage with raw MIME content
    const emailMessage = new EmailMessage(fromAddress, to, rawEmail);
    await env.SEND_EMAIL.send(emailMessage);
    return true;
  } catch (error) {
    console.error(
      `[Email Error] Failed to send email to ${to} (${subject}):`,
      error,
    );
    return false;
  }
}

export async function getPublicAppUrl(env: Env): Promise<string> {
  const appUrl = await getSecret(env, "APP_URL", false);
  return (appUrl || "https://ya-lms.pages.dev").replace(/\/$/, "");
}

export async function getAdminEmails(env: Env): Promise<string[]> {
  try {
    const { results } = await env.DB.prepare(
      "SELECT email FROM Users WHERE role = 'admin'",
    ).all();
    const emails = results.map((r: any) => r.email).filter(Boolean);
    if (emails.length > 0) return emails;
    // Fallback to site settings email if no admin users found
    const settings = await getSiteSettings(env);
    if (settings?.contact_email) return [settings.contact_email];
    return [];
  } catch (e) {
    console.error("Failed to fetch admin emails:", e);
    // Fallback to site settings email on DB error
    try {
      const settings = await getSiteSettings(env);
      if (settings?.contact_email) return [settings.contact_email];
    } catch {}
    return [];
  }
}

export async function notifyAdmins(
  env: Env,
  subject: string,
  title: string,
  html: string,
  text: string,
) {
  const adminEmails = await getAdminEmails(env);
  await Promise.allSettled(
    adminEmails.map((email) => safeSendEmail(env, email, subject, title, html, text))
  );
}

export async function logAdminActivity(
  env: Env,
  adminEmail: string,
  action: string,
  details: string,
  ip: string = "Unknown",
) {
  const subject = `🛡️ Admin Activity Alert: ${action}`;
  const title = "Admin Activity Logged";
  const html = `
    <p><strong>Admin:</strong> ${adminEmail}</p>
    <p><strong>Action:</strong> ${action}</p>
    <p><strong>Details:</strong> ${details}</p>
    <p><strong>IP Address:</strong> ${ip}</p>
    <p><strong>Time (IST):</strong> ${getISTTime()}</p>
  `;
  const text = `Admin Activity Alert\nAdmin: ${adminEmail}\nAction: ${action}\nDetails: ${details}\nIP: ${ip}\nTime: ${getISTTime()}`;
  await notifyAdmins(env, subject, title, html, text);
}
