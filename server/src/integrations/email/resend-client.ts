import { env } from "../../config/env.ts";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export function isEmailConfigured(): boolean {
  return Boolean(env.emailProviderApiKey && env.emailFrom);
}

export async function sendEmail(input: SendEmailInput): Promise<{ id: string } | null> {
  if (!isEmailConfigured()) return null;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.emailProviderApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.emailFrom,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Email provider error (${response.status}): ${detail.slice(0, 200)}`);
  }

  const payload = (await response.json()) as { id?: string };
  return { id: payload.id ?? "sent" };
}

export function resetPasswordEmailHtml(resetUrl: string) {
  return `
    <p>Halo,</p>
    <p>Kami menerima permintaan reset kata sandi Dolan. Lanjutkan lewat tautan berikut:</p>
    <p><a href="${resetUrl}">Reset kata sandi</a></p>
    <p>Tautan berlaku 30 menit. Jika kamu tidak meminta reset, abaikan email ini.</p>
  `.trim();
}
