import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") redirect("/login");
  const settings = await prisma.settings.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} });

  return (
    <div className="min-vh-100 d-flex flex-column">
      <TopBar
        userName={`${session.user.firstName} ${session.user.lastName}`}
        organizationName={settings.organizationName}
        logoUrl={settings.logoUrl}
      />
      <main className="flex-grow-1">{children}</main>
    </div>
  );
}

function TopBar({ userName, organizationName, logoUrl }: { userName: string; organizationName: string; logoUrl: string | null }) {
  return (
    <header className="no-print sticky-top bg-white border-bottom shadow-sm">
      <div className="d-flex align-items-center justify-content-between px-4 gap-3" style={{ height: 64 }}>
        <div className="d-flex align-items-center gap-4 min-w-0">
          <Link href="/dashboard" className="d-flex align-items-baseline gap-2 text-decoration-none text-body flex-shrink-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={organizationName} style={{ height: 32, width: "auto" }} />
            ) : (
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>
                iGŁOSOWANIA
              </span>
            )}
            <span className="eyebrow d-none d-sm-inline">Panel operatora</span>
          </Link>
          <nav className="d-flex align-items-center gap-1 overflow-auto">
            <NavLink href="/dashboard">Pulpit</NavLink>
            <NavLink href="/cases">Sprawy</NavLink>
            <NavLink href="/bodies">Organy</NavLink>
            <NavLink href="/users">Osoby</NavLink>
            <NavLink href="/audit">Rejestr czynności</NavLink>
            <NavLink href="/settings">Ustawienia</NavLink>
          </nav>
        </div>
        <div className="d-flex align-items-center gap-3 flex-shrink-0">
          <div className="text-end d-none d-sm-block">
            <div className="small text-secondary-emphasis" style={{ fontSize: 11 }}>Zalogowano jako</div>
            <div className="small fw-medium">{userName}</div>
          </div>
          <Link href="/account" className="btn btn-outline-secondary btn-sm">Konto</Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="btn btn-outline-secondary btn-sm" type="submit">Wyloguj</button>
          </form>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="nav-link-hover px-3 py-2 text-decoration-none text-body small fw-medium">
      {children}
    </Link>
  );
}
