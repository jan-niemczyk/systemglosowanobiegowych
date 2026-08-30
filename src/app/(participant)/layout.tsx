import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ParticipantLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== "PARTICIPANT") redirect("/login");
  const settings = await prisma.settings.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} });

  return (
    <div className="min-vh-100 d-flex flex-column">
      <header className="no-print sticky-top bg-white border-bottom shadow-sm">
        <div className="d-flex align-items-center justify-content-between px-3 gap-2" style={{ height: 64 }}>
          <Link href="/my-cases" className="d-flex align-items-baseline gap-2 min-w-0 text-decoration-none text-body">
            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt={settings.organizationName} style={{ height: 40, width: "auto" }} />
            ) : (
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 600 }}>iGŁOSOWANIA</span>
            )}
            <span className="eyebrow d-none d-sm-inline">Moje sprawy</span>
          </Link>
          <div className="d-flex align-items-center gap-2 min-w-0">
            <div className="small fw-medium text-truncate d-none d-sm-block">
              {session.user.firstName} {session.user.lastName}
            </div>
            <Link href="/account" className="btn btn-outline-secondary btn-sm">Konto</Link>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
              <button className="btn btn-outline-secondary btn-sm text-nowrap" type="submit">Wyloguj</button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-grow-1">{children}</main>
    </div>
  );
}
