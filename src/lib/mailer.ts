import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean;
};

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function buildTransport(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.password },
  });
}

/** Wysyła wiadomość skonfigurowanym w Ustawieniach kontem SMTP. Nigdy nie rzuca - zwraca false przy błędzie lub braku konfiguracji. */
export async function sendMail(message: MailMessage): Promise<boolean> {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
    if (!settings?.emailEnabled || !settings.smtpHost || !settings.smtpUser || !settings.smtpPassword) return false;

    const transport = buildTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      user: settings.smtpUser,
      password: settings.smtpPassword,
      secure: settings.smtpSecure,
    });
    await transport.sendMail({
      from: settings.smtpUser,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return true;
  } catch (err) {
    console.error("Błąd wysyłki e-mail:", err);
    return false;
  }
}

/** Wysyła testową wiadomość z jawnie podaną konfiguracją (np. przed zapisaniem Ustawień) - rzuca błąd przy niepowodzeniu, by można było go pokazać operatorowi. */
export async function sendTestEmail(config: SmtpConfig, toEmail: string) {
  const transport = buildTransport(config);
  await transport.sendMail({
    from: config.user,
    to: toEmail,
    subject: "Test konfiguracji e-mail - System Głosowań Obiegowych",
    text: "To jest testowa wiadomość potwierdzająca poprawną konfigurację skrzynki SMTP w panelu Ustawienia.",
    html: "<p>To jest testowa wiadomość potwierdzająca poprawną konfigurację skrzynki SMTP w panelu Ustawienia.</p>",
  });
}
