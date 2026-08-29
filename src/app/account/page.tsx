import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  return (
    <div className="container py-5" style={{ maxWidth: 520 }}>
      <header className="border-bottom pb-4 mb-4">
        <div className="eyebrow mb-2">Konto</div>
        <h1 className="h3" style={{ lineHeight: 1.05 }}>Zmiana hasła</h1>
        <p className="small mt-2 text-secondary-emphasis">
          Zalogowano jako {session.user.email}
        </p>
      </header>
      <ChangePasswordForm />
      <div className="mt-4">
        <a href="/" className="btn btn-outline-secondary btn-sm">Powrót</a>
      </div>
    </div>
  );
}
