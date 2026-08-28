import { CaseStatus, ItemStatus, DocumentKind, CloseMode, ResultsVisibility, VoteVisibility, VoteType, VoteChoice } from "@prisma/client";

export const CHOICE_LABEL: Record<VoteChoice, string> = {
  YES: "ZA",
  NO: "PRZECIW",
  ABSTAIN: "WSTRZYMUJĘ SIĘ",
};

export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  DRAFT: "Projekt",
  OPEN: "Otwarta",
  CLOSED: "Zamknięta",
  RESULTS_PUBLISHED: "Wyniki opublikowane",
  CANCELLED: "Anulowana",
};

export const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
  PENDING: "Oczekuje",
  OPEN: "Trwa głosowanie",
  CLOSED: "Zakończona",
};

export const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
  DRAFT: "Projekt",
  ATTACHMENT: "Załącznik",
  RESULT: "Dokument wynikowy",
};

export const CLOSE_MODE_LABEL: Record<CloseMode, string> = {
  MANUAL: "Ręczne (operator zamyka)",
  ALL_VOTED: "Po oddaniu głosów przez wszystkich uprawnionych",
  DEADLINE: "Z upływem terminu",
  DEADLINE_OR_ALL_VOTED: "Z upływem terminu lub po oddaniu wszystkich głosów",
};

export const RESULTS_VISIBILITY_LABEL: Record<ResultsVisibility, string> = {
  AUTO_ON_CLOSE: "Automatycznie po zamknięciu",
  MANUAL: "Ręcznie przez operatora",
};

export const VOTE_VISIBILITY_LABEL: Record<VoteVisibility, string> = {
  OPEN: "Jawne",
  SECRET: "Tajne",
};

export const VOTE_TYPE_LABEL: Record<VoteType, string> = {
  STANDARD: "Zwykłe (za / przeciw / wstrzymuję się)",
  PACKAGE: "Pakietowe",
  LIST: "Na kandydatów / listę",
};

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Warsaw",
  });
}

/** Jak formatDateTime, ale z sekundami - używane w nagłówku raportu głosowania (jak w iOBRADACH). */
export function formatDateTimeSeconds(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Warsaw",
  });
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("pl-PL", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Warsaw",
  });
}

/**
 * Konwersja stringa z <input type="datetime-local"> ("2025-11-20T18:00")
 * na ISO string interpretując wejście jako czas warszawski. Działa identycznie
 * po stronie SSR i klienta, niezależnie od strefy czasowej kontenera.
 */
export function localInputToWarsawISO(input: string): string {
  const m = input.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return new Date(input).toISOString();
  const [, y, mo, d, h, mi, s] = m;
  const asUtc = Date.UTC(+y, +mo - 1, +d, +h, +mi, s ? +s : 0);
  const inWarsaw = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(new Date(asUtc));
  const get = (t: string) => inWarsaw.find((p) => p.type === t)?.value ?? "0";
  const warsawAsMs = Date.UTC(+get("year"), +get("month") - 1, +get("day"),
    +get("hour"), +get("minute"), +get("second"));
  const offsetMs = warsawAsMs - asUtc;
  return new Date(asUtc - offsetMs).toISOString();
}
