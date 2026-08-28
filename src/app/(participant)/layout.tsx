import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ParticipantLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== "PARTICIPANT") redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="no-print sticky top-0 z-30 flex items-center justify-between px-4 h-14 gap-2"
        style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-rule)" }}
      >
        <Link href="/my-cases" className="flex items-baseline gap-2 min-w-0" style={{ textDecoration: "none", color: "inherit" }}>
          <span style={{ fontSize: 20, fontWeight: 600 }}>iGŁOSOWANIA</span>
          <span className="eyebrow hidden sm:inline">Moje sprawy</span>
        </Link>
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-sm font-medium truncate hidden sm:block">
            {session.user.firstName} {session.user.lastName}
          </div>
          <Link href="/account" className="btn btn-sm">Konto</Link>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <button className="btn btn-sm" type="submit" style={{ whiteSpace: "nowrap" }}>Wyloguj</button>
          </form>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
