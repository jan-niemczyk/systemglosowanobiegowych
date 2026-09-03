import { prisma } from "@/lib/db";
import { logEvent } from "@/lib/eventLog";
import { sendMail } from "@/lib/mailer";
import { formatDateTime } from "@/lib/labels";

function appBaseUrl() {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

function caseLabel(kase: { number: string | null; title: string }) {
  return kase.number ? `${kase.number} - ${kase.title}` : kase.title;
}

function caseLink(caseId: string) {
  return `${appBaseUrl()}/my-cases/${caseId}`;
}

function footer(organizationName: string) {
  return `Wiadomość wygenerowana automatycznie przez System Głosowań Obiegowych (${organizationName}).`;
}

async function getSettings() {
  return prisma.settings.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} });
}

async function loadRecipients(caseId: string) {
  const [kase, settings] = await Promise.all([
    prisma.case.findUnique({
      where: { id: caseId },
      include: { participants: { include: { user: true } } },
    }),
    getSettings(),
  ]);
  if (!kase) return null;
  const recipients = kase.participants.filter((p) => p.user.active).map((p) => ({ email: p.user.email, firstName: p.firstName }));
  return { kase, settings, recipients };
}

async function sendBatch(
  recipients: { email: string; firstName: string }[],
  build: (r: { email: string; firstName: string }) => { subject: string; text: string; html: string }
) {
  const results = await Promise.allSettled(
    recipients.map((r) => {
      const msg = build(r);
      return sendMail({ to: r.email, ...msg });
    })
  );
  const sent = results.filter((r) => r.status === "fulfilled" && r.value === true).length;
  return { sent, total: recipients.length };
}

/** Powiadomienie uczestników o rozpoczęciu głosowania w sprawie. Błędy wysyłki nigdy nie przerywają wywołującej akcji. */
export async function notifyCaseOpened(caseId: string) {
  try {
    const data = await loadRecipients(caseId);
    if (!data || data.recipients.length === 0) return;
    const { kase, settings, recipients } = data;
    const label = caseLabel(kase);
    const link = caseLink(caseId);
    const deadlineLine = kase.deadlineAt ? `Termin oddania głosów: ${formatDateTime(kase.deadlineAt)}.` : "";

    const { sent, total } = await sendBatch(recipients, (r) => ({
      subject: `Nowe głosowanie: ${label}`,
      text: [
        `Dzień dobry ${r.firstName},`,
        "",
        `Rozpoczęto głosowanie w sprawie: ${label}.`,
        kase.description ?? "",
        deadlineLine,
        "",
        `Aby oddać głos, zaloguj się: ${link}`,
        "",
        footer(settings.organizationName),
      ]
        .filter(Boolean)
        .join("\n"),
      html: [
        `<p>Dzień dobry ${r.firstName},</p>`,
        `<p>Rozpoczęto głosowanie w sprawie: <strong>${label}</strong>.</p>`,
        kase.description ? `<p>${kase.description}</p>` : "",
        deadlineLine ? `<p>${deadlineLine}</p>` : "",
        `<p><a href="${link}">Przejdź do głosowania</a></p>`,
        `<p style="color:#666;font-size:12px;">${footer(settings.organizationName)}</p>`,
      ]
        .filter(Boolean)
        .join("\n"),
    }));

    await logEvent({
      action: "EMAIL_SENT",
      description: `Powiadomienia o rozpoczęciu głosowania: wysłano ${sent}/${total}`,
      caseId,
    });
  } catch (err) {
    console.error("Błąd wysyłki powiadomień o otwarciu sprawy:", err);
  }
}

/** Powiadomienie uczestników o publikacji wyników głosowania. Błędy wysyłki nigdy nie przerywają wywołującej akcji. */
export async function notifyResultsPublished(caseId: string) {
  try {
    const data = await loadRecipients(caseId);
    if (!data || data.recipients.length === 0) return;
    const { kase, settings, recipients } = data;
    const label = caseLabel(kase);
    const link = caseLink(caseId);

    const { sent, total } = await sendBatch(recipients, (r) => ({
      subject: `Opublikowano wyniki głosowania: ${label}`,
      text: [
        `Dzień dobry ${r.firstName},`,
        "",
        `Opublikowano wyniki głosowania w sprawie: ${label}.`,
        "",
        `Wyniki dostępne są po zalogowaniu: ${link}`,
        "",
        footer(settings.organizationName),
      ].join("\n"),
      html: [
        `<p>Dzień dobry ${r.firstName},</p>`,
        `<p>Opublikowano wyniki głosowania w sprawie: <strong>${label}</strong>.</p>`,
        `<p><a href="${link}">Zobacz wyniki</a></p>`,
        `<p style="color:#666;font-size:12px;">${footer(settings.organizationName)}</p>`,
      ].join("\n"),
    }));

    await logEvent({
      action: "EMAIL_SENT",
      description: `Powiadomienia o publikacji wyników: wysłano ${sent}/${total}`,
      caseId,
    });
  } catch (err) {
    console.error("Błąd wysyłki powiadomień o publikacji wyników:", err);
  }
}

/**
 * Wysyła nowo utworzonym kontom dane do logowania (e-mail + hasło ustawione przez
 * operatora przy zakładaniu konta). Używana zarówno przy tworzeniu pojedynczego konta,
 * jak i przy imporcie zbiorczym. Błędy wysyłki nigdy nie przerywają wywołującej akcji.
 */
export async function notifyAccountsCreated(recipients: { email: string; firstName: string; password: string }[]) {
  try {
    if (recipients.length === 0) return;
    const settings = await getSettings();
    const link = `${appBaseUrl()}/login`;

    const results = await Promise.allSettled(
      recipients.map((r) =>
        sendMail({
          to: r.email,
          subject: `Dostęp do systemu - ${settings.organizationName}`,
          text: [
            `Dzień dobry ${r.firstName},`,
            "",
            `Utworzono dla Ciebie konto w Systemie Głosowań Obiegowych organizacji ${settings.organizationName}.`,
            "",
            `E-mail (login): ${r.email}`,
            `Hasło: ${r.password}`,
            "",
            `Zaloguj się: ${link}`,
            "Zalecamy zmianę hasła po pierwszym logowaniu (zakładka „Konto”).",
            "",
            footer(settings.organizationName),
          ].join("\n"),
          html: [
            `<p>Dzień dobry ${r.firstName},</p>`,
            `<p>Utworzono dla Ciebie konto w Systemie Głosowań Obiegowych organizacji <strong>${settings.organizationName}</strong>.</p>`,
            `<p>E-mail (login): <strong>${r.email}</strong><br>Hasło: <strong>${r.password}</strong></p>`,
            `<p><a href="${link}">Zaloguj się</a></p>`,
            `<p>Zalecamy zmianę hasła po pierwszym logowaniu (zakładka „Konto”).</p>`,
            `<p style="color:#666;font-size:12px;">${footer(settings.organizationName)}</p>`,
          ].join("\n"),
        })
      )
    );
    const sent = results.filter((r) => r.status === "fulfilled" && r.value === true).length;

    await logEvent({
      action: "EMAIL_SENT",
      description: `Powiadomienia o utworzeniu konta: wysłano ${sent}/${recipients.length}`,
    });
  } catch (err) {
    console.error("Błąd wysyłki powiadomień o utworzeniu konta:", err);
  }
}
