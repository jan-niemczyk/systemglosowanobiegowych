"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { downloadLoginCards } from "@/lib/loginCards";
import { useToast } from "@/components/Toast";
import { readApiError } from "@/lib/apiError";

type UserRow = { id: string; email: string; firstName: string; lastName: string; functionTitle: string | null; role: Role; active: boolean };

export function UsersManager({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "";

  function toggle(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function updateUser(id: string, data: Record<string, unknown>) {
    startTransition(async () => {
      const r = await fetch(`/api/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (r.ok) { toast.success("Dane osoby zostały zaktualizowane."); router.refresh(); }
      else toast.error(await readApiError(r));
    });
  }

  function bulkDelete() {
    if (selected.size === 0 || !confirm(`Usunąć/dezaktywować ${selected.size} kont?`)) return;
    startTransition(async () => {
      const r = await fetch("/api/users/bulk-delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userIds: Array.from(selected) }) });
      if (r.ok) { toast.success("Wybrane konta zostały usunięte/dezaktywowane."); setSelected(new Set()); router.refresh(); }
      else toast.error(await readApiError(r));
    });
  }

  function bulkResetPasswords() {
    if (selected.size === 0) return;
    startTransition(async () => {
      const r = await fetch("/api/users/reset-passwords", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userIds: Array.from(selected) }) });
      if (r.ok) {
        const d = await r.json();
        await downloadLoginCards(d.cards, loginUrl, "odcinki-logowania");
        toast.success("Hasła zostały zresetowane - pobrano odcinki logowania.");
        router.refresh();
      } else {
        toast.error(await readApiError(r));
      }
    });
  }

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-wrap gap-2">
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd((v) => !v)}>+ Dodaj osobę</button>
        <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowImport((v) => !v)}>Import listy</button>
        <button className="btn btn-sm btn-outline-secondary" disabled={selected.size === 0 || pending} onClick={bulkResetPasswords}>Resetuj hasła zaznaczonych (odcinki)</button>
        <button className="btn btn-sm btn-outline-danger" disabled={selected.size === 0 || pending} onClick={bulkDelete}>Usuń zaznaczone</button>
      </div>

      {showAdd && <AddUserForm onDone={() => { setShowAdd(false); router.refresh(); }} />}
      {showImport && <ImportUsersForm loginUrl={loginUrl} onDone={() => { setShowImport(false); router.refresh(); }} />}

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
                <th className="fw-normal">Aktywne</th>
                <th className="fw-normal pe-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserTableRow
                  key={u.id}
                  user={u}
                  selected={selected.has(u.id)}
                  onToggleSelected={() => toggle(u.id)}
                  editing={editingId === u.id}
                  onEdit={() => setEditingId(u.id)}
                  onDoneEditing={() => setEditingId(null)}
                  onUpdate={updateUser}
                  pending={pending}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UserTableRow({
  user, selected, onToggleSelected, editing, onEdit, onDoneEditing, onUpdate, pending,
}: {
  user: UserRow;
  selected: boolean;
  onToggleSelected: () => void;
  editing: boolean;
  onEdit: () => void;
  onDoneEditing: () => void;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  pending: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);
  const [functionTitle, setFunctionTitle] = useState(user.functionTitle ?? "");
  const [saving, startTransition] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await fetch(`/api/users/${user.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, functionTitle: functionTitle || null }),
      });
      if (r.ok) { toast.success("Dane osoby zostały zaktualizowane."); onDoneEditing(); router.refresh(); }
      else toast.error(await readApiError(r));
    });
  }

  function cancel() {
    setFirstName(user.firstName); setLastName(user.lastName); setEmail(user.email); setFunctionTitle(user.functionTitle ?? "");
    onDoneEditing();
  }

  if (editing) {
    return (
      <tr>
        <td className="ps-3"></td>
        <td colSpan={2}>
          <div className="d-flex gap-2">
            <input className="form-control form-control-sm" style={{ maxWidth: 120 }} required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Imię" />
            <input className="form-control form-control-sm" style={{ maxWidth: 140 }} required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nazwisko" />
            <input type="email" className="form-control form-control-sm" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" />
          </div>
        </td>
        <td>
          <input className="form-control form-control-sm" value={functionTitle} onChange={(e) => setFunctionTitle(e.target.value)} placeholder="Funkcja" />
        </td>
        <td colSpan={2} className="text-secondary-emphasis small">Rola i aktywność - w widoku listy</td>
        <td className="pe-3 text-end">
          <div className="d-flex gap-2 justify-content-end">
            <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={save}>{saving ? "Zapisywanie…" : "Zapisz"}</button>
            <button type="button" className="btn btn-sm btn-outline-secondary" disabled={saving} onClick={cancel}>Anuluj</button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="ps-3"><input type="checkbox" className="form-check-input" checked={selected} onChange={onToggleSelected} /></td>
      <td>{user.lastName} {user.firstName}</td>
      <td>{user.email}</td>
      <td>{user.functionTitle ?? "-"}</td>
      <td>
        <select className="form-select form-select-sm" style={{ width: "auto" }} value={user.role} onChange={(e) => onUpdate(user.id, { role: e.target.value })}>
          <option value="OPERATOR">Operator</option>
          <option value="PARTICIPANT">Uczestnik</option>
        </select>
      </td>
      <td>
        <input type="checkbox" className="form-check-input" checked={user.active} onChange={(e) => onUpdate(user.id, { active: e.target.checked })} />
      </td>
      <td className="pe-3 text-end">
        <button type="button" className="btn btn-sm btn-outline-secondary" disabled={pending} onClick={onEdit}>Edytuj</button>
      </td>
    </tr>
  );
}

function AddUserForm({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [functionTitle, setFunctionTitle] = useState("");
  const [role, setRole] = useState<Role>("PARTICIPANT" as Role);
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await fetch("/api/users", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, lastName, functionTitle: functionTitle || null, role, password }),
      });
      if (r.ok) { toast.success("Konto zostało utworzone."); onDone(); }
      else toast.error(await readApiError(r));
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
      <div className="col-12"><button type="submit" className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Dodawanie…" : "Utwórz konto"}</button></div>
    </form>
  );
}

function ImportUsersForm({ loginUrl, onDone }: { loginUrl: string; onDone: () => void }) {
  const toast = useToast();
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
      if (!r.ok) { toast.error(await readApiError(r)); return; }
      const d = await r.json();
      setResults(d.results);
      const created = d.results.filter((x: { status: string }) => x.status === "created");
      if (created.length > 0) {
        await downloadLoginCards(created.map((c: { name: string; email: string; password: string }) => ({ name: c.name, email: c.email, password: c.password })), loginUrl, "odcinki-logowania-import");
      }
      toast.success(`Zaimportowano ${created.length} z ${d.results.length} osób.`);
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
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending || !text.trim()}>{pending ? "Importowanie…" : "Importuj"}</button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onDone}>Zamknij</button>
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
