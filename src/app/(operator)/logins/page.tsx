import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/labels";

export const dynamic = "force-dynamic";

/**
 * Podgląd logowań uczestników (nie operatora - patrz src/lib/auth.ts) wraz z adresem IP.
 * Jedyny widok "rejestru" pozostały w interfejsie - pełny dziennik zdarzeń (sprawy,
 * organy, ustawienia, głosy, logowania) jest dostępny wyłącznie jako eksport TXT na
 * żądanie (patrz /api/logs/txt), bez przeglądarkowej tabeli.
 */
export default async function LoginsPage() {
  const logins = await prisma.eventLog.findMany({
    where: { action: "PARTICIPANT_LOGIN" },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { user: true },
  });

  return (
    <div className="container py-4 py-md-5 d-flex flex-column gap-4" style={{ maxWidth: 1100 }}>
      <header className="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <div className="eyebrow mb-2">Rozliczalność</div>
          <h1 className="h3 mb-0">Logowania</h1>
        </div>
        <a className="btn btn-sm btn-outline-secondary" href="/api/logs/txt">Pobierz pełny log (TXT)</a>
      </header>

      <div className="card shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr className="text-secondary-emphasis small">
                <th className="fw-normal ps-3">Data</th>
                <th className="fw-normal">Uczestnik</th>
                <th className="fw-normal pe-3">Adres IP</th>
              </tr>
            </thead>
            <tbody>
              {logins.length === 0 ? (
                <tr><td colSpan={3} className="ps-3 text-secondary-emphasis">Brak zarejestrowanych logowań.</td></tr>
              ) : logins.map((l) => (
                <tr key={l.id}>
                  <td className="num ps-3" style={{ fontSize: 12 }}>{formatDateTime(l.createdAt)}</td>
                  <td>{l.user ? `${l.user.lastName} ${l.user.firstName} (${l.user.email})` : "-"}</td>
                  <td className="num pe-3">{l.ip ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
