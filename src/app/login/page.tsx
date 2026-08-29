import { Suspense } from "react";
import { prisma } from "@/lib/db";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const settings = await prisma.settings.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} });
  return (
    <Suspense fallback={null}>
      <LoginForm organizationName={settings.organizationName} logoUrl={settings.logoUrl} />
    </Suspense>
  );
}
