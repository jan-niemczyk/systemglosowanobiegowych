"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Settings, VoteVisibility, CloseMode, ResultsVisibility } from "@prisma/client";
import { VOTE_VISIBILITY_LABEL, CLOSE_MODE_LABEL, RESULTS_VISIBILITY_LABEL } from "@/lib/labels";

export function SettingsForm({ settings }: { settings: Settings }) {
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
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
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
        }),
      });
      if (r.ok) { setMsg({ ok: true, text: "Zapisano ustawienia." }); router.refresh(); }
      else setMsg({ ok: false, text: await r.text() });
    });
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
    <form onSubmit={submit} className="card p-6 space-y-4">
      <div>
        <label className="label">Nazwa organizacji</label>
        <input className="input" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
      </div>

      <div>
        <label className="label">Logo</label>
        {logoUrl && <img src={logoUrl} alt="Logo" style={{ height: 40, marginBottom: 8 }} />}
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="input" />
          <button type="button" className="btn btn-sm" onClick={uploadLogo} disabled={pending}>Wgraj</button>
        </div>
      </div>

      <div className="border-t pt-4 space-y-4" style={{ borderColor: "var(--color-rule-soft)" }}>
        <div className="eyebrow">Wartości domyślne nowej sprawy</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Jawność głosowania</label>
            <select className="input" value={defaultVoteVisibility} onChange={(e) => setDefaultVoteVisibility(e.target.value as VoteVisibility)}>
              {Object.entries(VOTE_VISIBILITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tryb zakończenia</label>
            <select className="input" value={defaultCloseMode} onChange={(e) => setDefaultCloseMode(e.target.value as CloseMode)}>
              {Object.entries(CLOSE_MODE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Publikacja wyników</label>
            <select className="input" value={defaultResultsVisibility} onChange={(e) => setDefaultResultsVisibility(e.target.value as ResultsVisibility)}>
              {Object.entries(RESULTS_VISIBILITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={defaultAllowVoteChange} onChange={(e) => setDefaultAllowVoteChange(e.target.checked)} />
          Dopuszczalna zmiana głosu
        </label>
      </div>

      <div className="border-t pt-4 space-y-4" style={{ borderColor: "var(--color-rule-soft)" }}>
        <div className="eyebrow">Dokumenty</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Limit wielkości pliku (MB)</label>
            <input type="number" min={1} className="input" value={maxDocumentSizeMB} onChange={(e) => setMaxDocumentSizeMB(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Dopuszczalne typy plików</label>
            <input className="input" value={allowedDocumentTypes} onChange={(e) => setAllowedDocumentTypes(e.target.value)} placeholder="pdf, doc, docx, jpg" />
          </div>
        </div>
      </div>

      {msg && <div className="text-sm" style={{ color: msg.ok ? "var(--color-yes)" : "var(--color-no)" }}>{msg.text}</div>}
      <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Zapisywanie…" : "Zapisz ustawienia"}</button>
    </form>
  );
}
