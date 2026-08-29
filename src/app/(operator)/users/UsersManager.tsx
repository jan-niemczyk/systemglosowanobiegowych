"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { downloadLoginCards } from "@/lib/loginCards";

type UserRow = { id: string; email: string; firstName: string; lastName: string; functionTitle: string | null; role: Role; active: boolean };

export function UsersManager({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "";

  function toggle(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function updateUser(id: string, data: Record<string, unknown>) {
    startTransition(async () => {
      await fetch(`/api/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      router.refresh();
    });
  }

  function bulkDelete() {
    if (selected.size === 0 || !confirm(`Usunąć/dezaktywować ${selected.size} kont?`)) return;
    startTransition(async () => {
      await fetch("/api/users/bulk-delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userIds: Array.from(selected) }) });
      setSelected(new Set());
      router.refresh();
    });
  }

  function bulkResetPasswords() {
    if (selected.size === 0) return;
    startTransition(async () => {
      const r = await fetch("/api/users/reset-passwords", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userIds: Array.from(selected) }) });
      if (r.ok) {
        const d = await r.json();
        await downloadLoginCards(d.cards, loginUrl, "odcinki-logowania");
        router.refresh();
      }
    });
  }

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-wrap gap-2">
        <button className="btn btn-primary btn-sm rounded-pill" onClick={() => setShowAdd((v) => !v)}>+ Dodaj osobę</button>
        <button className="btn btn-sm btn-outline-secondary rounded-pill" onClick={() => setShowImport((v) => !v)}>Import listy</button>
        <button className="btn btn-sm btn-outline-secondary rounded-pill" disabled={selected.size === 0 || pending} onClick={bulkResetPasswords}>Resetuj hasła zaznaczonych (odcinki)</button>
        <button className="btn btn-sm btn-outline-danger rounded-pill" disabled={selected.size === 0 || pending} onClick={bulkDelete}>Usuń zaznaczone</button>
      </div>

      {showAdd && <AddUserForm onDone={() => { setShowAdd(false); router.refresh(); }} />}
      {showImport && <ImportUsersForm loginUrl={loginUrl} onDone={() => { setShowImport(false); router.refresh(); }} />}
      {error && <div className="alert alert-danger py-2 mb-0">{error}</div>}

      <div className="card shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr className="text-secondary-emphasis small">
                <th className="fw-normal ps-3"><input type="checkbox" className="form-check-input" onChange={(e) => setSelected(e.target.checked ? new Set(users.map((u) => u.id)) : new Set())} /></th>
                <th className="fw-normal">Osoba</th>
                <th className="fw-normal">E-mail (login)</th>
                <th className="fw-normal">Funkcja</th>
                <th className="fw-normal">Rola</th>
                <th className="fw-normal pe-3">Aktywne</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="ps-3"><input type="checkbox" className="form-check-input" checked={selected.has(u.id)} onChange={() => toggle(u.id)} /></td>
                  <td>{u.lastName} {u.firstName}</td>
                  <td>{u.email}</td>
                  <td>{u.functionTitle ?? "-"}</td>
                  <td>
                    <select className="form-select form-select-sm" style={{ width: "auto" }} value={u.role} onChange={(e) => updateUser(u.id, { role: e.target.value })}>
                      <option value="OPERATOR">Operator</option>
                      <option value="PARTICIPANT">Uczestnik</option>
                    </select>
                  </td>
                  <td className="pe-3">
                    <input type="checkbox" className="form-check-input" checked={u.active} onChange={(e) => updateUser(u.id, { active: e.target.checked })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AddUserForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [functionTitle, setFunctionTitle] = useState("");
  const [role, setRole] = useState<Role>("PARTICIPANT" as Role);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await fetch("/api/users", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, lastName, functionTitle: functionTitle || null, role, password }),
      });
      if (r.ok) onDone(); else setError(await r.text());
    });
  }

  return (
    <form onSubmit={submit} className="card shadow-sm p-4 row row-cols-1 row-cols-sm-2 g-3">
      <div className="col"><label className="form-label eyebrow">Imię</label><input className="form-control" required value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
      <div className="col"><label className="form-label eyebrow">Nazwisko</label><input className="form-control" required value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
      <div className="col"><label className="form-label eyebrow">E-mail (login)</label><input type="email" className="form-control" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="col"><label className="form-label eyebrow">Funkcja (opcjonalnie)</label><input className="form-control" value={functionTitle} onChange={(e) => setFunctionTitle(e.target.value)} /></div>
      <div className="col">
        <label className="form-label eyebrow">Rola</label>
        <select className="form-select" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="PARTICIPANT">Uczestnik</option>
          <option value="OPERATOR">Operator</option>
        </select>
      </div>
      <div className="col"><label className="form-label eyebrow">Hasło początkowe</label><input className="form-control" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      {error && <div className="col-12"><div className="alert alert-danger py-2 mb-0">{error}</div></div>}
      <div className="col-12"><button type="submit" className="btn btn-primary btn-sm rounded-pill" disabled={pending}>{pending ? "Dodawanie…" : "Utwórz konto"}</button></div>
    </form>
  );
}

function ImportUsersForm({ loginUrl, onDone }: { loginUrl: string; onDone: () => void }) {
  const [text, setText] = useState("");
  const [results, setResults] = useState<{ email: string; name: string; password: string | null; status: string; error?: string }[] | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const rows = text.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
      const [lastName, firstName, email] = line.split(/[;,\t]/).map((s) => s?.trim() ?? "");
      return { lastName, firstName, email };
    });
    startTransition(async () => {
      const r = await fetch("/api/users/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) });
      if (r.ok) {
        const d = await r.json();
        setResults(d.results);
        const created = d.results.filter((x: { status: string }) => x.status === "created");
        if (created.length > 0) {
          await downloadLoginCards(created.map((c: { name: string; email: string; password: string }) => ({ name: c.name, email: c.email, password: c.password })), loginUrl, "odcinki-logowania-import");
        }
      }
    });
  }

  return (
    <div className="card shadow-sm p-4 d-flex flex-column gap-3">
      <p className="small text-secondary-emphasis mb-0">
        Jedna osoba na linię, format: <code>Nazwisko;Imię;e-mail</code>. Hasła zostaną wygenerowane losowo i pobrane jako PDF z odcinkami.
      </p>
      <form onSubmit={submit} className="d-flex flex-column gap-3">
        <textarea className="form-control" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={"Kowalski;Jan;jan.kowalski@przyklad.pl\nNowak;Anna;anna.nowak@przyklad.pl"} />
        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary btn-sm rounded-pill" disabled={pending || !text.trim()}>{pending ? "Importowanie…" : "Importuj"}</button>
          <button type="button" className="btn btn-sm btn-outline-secondary rounded-pill" onClick={onDone}>Zamknij</button>
        </div>
      </form>
      {results && (
        <ul className="list-unstyled d-flex flex-column gap-1 mb-0 small">
          {results.map((r, i) => (
            <li key={i}>{r.name} ({r.email}) - {r.status === "created" ? "utworzono" : r.status === "skipped" ? `pominięto: ${r.error}` : `błąd: ${r.error}`}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
