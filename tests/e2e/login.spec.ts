import { test, expect } from "@playwright/test";

/**
 * Smoke test logowania. Wymaga uruchomionej aplikacji z bazą po `prisma db push`
 * i seedzie (SEED_OPERATOR_EMAIL / SEED_OPERATOR_PASSWORD w środowisku testowym).
 */
test("operator loguje się i trafia na pulpit", async ({ page }) => {
  const email = process.env.E2E_OPERATOR_EMAIL ?? process.env.SEED_OPERATOR_EMAIL ?? "operator@sgo.local";
  const password = process.env.E2E_OPERATOR_PASSWORD ?? process.env.SEED_OPERATOR_PASSWORD;
  test.skip(!password, "Brak E2E_OPERATOR_PASSWORD / SEED_OPERATOR_PASSWORD w środowisku - pomijam.");

  await page.goto("/login");
  await page.getByLabel("Adres e-mail").fill(email);
  await page.getByLabel("Hasło").fill(password!);
  await page.getByRole("button", { name: "Zaloguj się" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("Pulpit operatora")).toBeVisible();
});
