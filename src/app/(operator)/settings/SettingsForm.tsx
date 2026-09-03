"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Settings, VoteVisibility, CloseMode, ResultsVisibility } from "@prisma/client";
import { VOTE_VISIBILITY_LABEL, CLOSE_MODE_LABEL, RESULTS_VISIBILITY_LABEL } from "@/lib/labels";

export function SettingsForm({ settings, hasSmtpPassword }: { settings: Omit<Settings, "smtpPassword">; hasSmtpPassword: boolean }) {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState(settings.organizationName);
  const [defaultVoteVisibility, setDefaultVoteVisibility] = useState<VoteVisibility>(settings.defaultVoteVisibility);
  const [defaultCloseMode, setDefaultCloseMode] = useState<CloseMode>(settings.defaultCloseMode);
  const [defaultResultsVisibility, setDefaultResultsVisibility] = useState<ResultsVisibility>(settings.defaultResultsVisibility);
  const [defaultAllowVoteChange, setDefaultAllowVoteChange] = useState(settings.defaultAllowVoteChange);
  const [maxDocumentSizeMB, setMaxDocumentSizeMB] = useState(settings.maxDocumentSizeMB);
  const [allowedDocumentTypes, setAllowedDocumentTypes] = useState(settings.allowedDocumentTypes.join(", "));
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl);
  const fileRef = useRef<HTMLInputElement>(null);
  const [emailEnabled, setEmailEnabled] = useState(settings.emailEnabled);
  const [smtpHost, setSmtpHost] = useState(settings.smtpHost ?? "");
  const [smtpPort, setSmtpPort] = useState(settings.smtpPort);
  const [smtpUser, setSmtpUser] = useState(settings.smtpUser ?? "");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(settings.smtpSecure);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testPending, setTestPending] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const r = await fetch("/api/settings", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName, defaultVoteVisibility,
          defaultCloseMode, defaultResultsVisibility, defaultAllowVoteChange,
          maxDocumentSizeMB: Number(maxDocumentSizeMB),
          allowedDocumentTypes: allowedDocumentTypes.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
          emailEnabled,
          smtpHost: smtpHost || null,
          smtpPort: Number(smtpPort),
          smtpUser: smtpUser || null,
          smtpSecure,
          ...(smtpPassword ? { smtpPassword } : {}),
        }),
      });
      if (r.ok) { setMsg({ ok: true, text: "Zapisano ustawienia." }); setSmtpPassword(""); router.refresh(); }
      else setMsg({ ok: false, text: await r.text() });
    });
  }

  function sendTestEmail() {
    setMsg(null);
    setTestPending(true);
    (async () => {
      const r = await fetch("/api/settings/email/test", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: smtpHost, port: Number(smtpPort), user: smtpUser, secure: smtpSecure, ...(smtpPassword ? { password: smtpPassword } : {}) }),
      });
      if (r.ok) setMsg({ ok: true, text: "Wysłano testową wiadomość - sprawdź skrzynkę operatora." });
      else setMsg({ ok: false, text: await r.text() });
      setTestPending(false);
    })();
  }

  function uploadLogo() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.set("file", file);
    startTransition(async () => {
      const r = await fetch("/api/settings/logo", { method: "POST", body: form });
      if (r.ok) { const d = await r.json(); setLogoUrl(d.url); } else setMsg({ ok: false, text: await r.text() });
    });
  }

  return (
    <form onSubmit={submit} className="card shadow-sm p-4 d-flex flex-column gap-4">
      <div>
        <label className="form-label eyebrow">Nazwa organizacji</label>
        <input className="form-control" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
      </div>

      <div>
        <label className="form-label eyebrow">Logo</label>
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo" className="d-block mb-2" style={{ height: 40 }} />
        )}
        <div className="d-flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="form-control" />
          <button type="button" className="btn btn-sm btn-outline-secondary text-nowrap" onClick={uploadLogo} disabled={pending}>Wgraj</button>
        </div>
        <div className="form-text">Widoczne w nagłówku panelu operatora, panelu uczestnika i na ekranie logowania.</div>
      </div>

      <div className="border-top pt-4 d-flex flex-column gap-3">
        <div className="eyebrow">Wartości domyślne nowej sprawy</div>
        <div className="row g-3">
          <div className="col-12 col-sm-6">
            <label className="form-label eyebrow">Jawność głosowania</label>
            <select className="form-select" value={defaultVoteVisibility} onChange={(e) => setDefaultVoteVisibility(e.target.value as VoteVisibility)}>
              {Object.entries(VOTE_VISIBILITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="col-12 col-sm-6">
            <label className="form-label eyebrow">Tryb zakończenia</label>
            <select className="form-select" value={defaultCloseMode} onChange={(e) => setDefaultCloseMode(e.target.value as CloseMode)}>
              {Object.entries(CLOSE_MODE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="col-12 col-sm-6">
            <label className="form-label eyebrow">Publikacja wyników</label>
            <select className="form-select" value={defaultResultsVisibility} onChange={(e) => setDefaultResultsVisibility(e.target.value as ResultsVisibility)}>
              {Object.entries(RESULTS_VISIBILITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="form-check">
          <input type="checkbox" className="form-check-input" id="defaultAllowVoteChange" checked={defaultAllowVoteChange} onChange={(e) => setDefaultAllowVoteChange(e.target.checked)} />
          <label className="form-check-label small" htmlFor="defaultAllowVoteChange">Dopuszczalna zmiana głosu</label>
        </div>
      </div>

      <div className="border-top pt-4 d-flex flex-column gap-3">
        <div className="eyebrow">Dokumenty</div>
        <div className="row g-3">
          <div className="col-12 col-sm-6">
            <label className="form-label eyebrow">Limit wielkości pliku (MB)</label>
            <input type="number" min={1} className="form-control" value={maxDocumentSizeMB} onChange={(e) => setMaxDocumentSizeMB(Number(e.target.value))} />
          </div>
          <div className="col-12 col-sm-6">
            <label className="form-label eyebrow">Dopuszczalne typy plików</label>
            <input className="form-control" value={allowedDocumentTypes} onChange={(e) => setAllowedDocumentTypes(e.target.value)} placeholder="pdf, doc, docx, jpg" />
          </div>
        </div>
      </div>

      <div className="border-top pt-4 d-flex flex-column gap-3">
        <div className="eyebrow">Powiadomienia e-mail</div>
        <div className="form-check">
          <input type="checkbox" className="form-check-input" id="emailEnabled" checked={emailEnabled} onChange={(e) => setEmailEnabled(e.target.checked)} />
          <label className="form-check-label small" htmlFor="emailEnabled">Wysyłaj automatyczne powiadomienia (rozpoczęcie głosowania, publikacja wyników)</label>
        </div>
        <div className="row g-3">
          <div className="col-12 col-sm-8">
            <label className="form-label eyebrow">Serwer SMTP</label>
            <input className="form-control" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.example.com" />
          </div>
          <div className="col-12 col-sm-4">
            <label className="form-label eyebrow">Port</label>
            <input type="number" min={1} className="form-control" value={smtpPort} onChange={(e) => setSmtpPort(Number(e.target.value))} />
          </div>
          <div className="col-12 col-sm-6">
            <label className="form-label eyebrow">Użytkownik (adres nadawcy)</label>
            <input className="form-control" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="powiadomienia@example.com" />
          </div>
          <div className="col-12 col-sm-6">
            <label className="form-label eyebrow">Hasło</label>
            <input type="password" className="form-control" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} placeholder={hasSmtpPassword ? "•••••• (zapisane - wpisz, aby zmienić)" : ""} />
          </div>
        </div>
        <div className="form-check">
          <input type="checkbox" className="form-check-input" id="smtpSecure" checked={smtpSecure} onChange={(e) => setSmtpSecure(e.target.checked)} />
          <label className="form-check-label small" htmlFor="smtpSecure">Połączenie szyfrowane (SSL/TLS, zwykle port 465)</label>
        </div>
        <div>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={sendTestEmail} disabled={testPending || !smtpHost || !smtpUser}>
            {testPending ? "Wysyłanie…" : "Wyślij testowy e-mail"}
          </button>
          <div className="form-text">Wiadomość testowa trafi na adres operatora aktualnie zalogowanego.</div>
        </div>
      </div>

      {msg && <div className={`alert ${msg.ok ? "alert-success" : "alert-danger"} py-2 mb-0`}>{msg.text}</div>}
      <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Zapisywanie…" : "Zapisz ustawienia"}</button>
    </form>
  );
}
