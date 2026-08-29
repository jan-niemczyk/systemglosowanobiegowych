/** Wyciąga czytelny komunikat błędu z odpowiedzi API - obsługuje zarówno zwykły
 * tekst (`new NextResponse("...", {status})`) jak i JSON (`{error}` lub `{errors: []}`). */
export async function readApiError(r: Response): Promise<string> {
  const text = await r.text();
  try {
    const d = JSON.parse(text);
    if (Array.isArray(d?.errors) && d.errors.length > 0) return d.errors.join("\n");
    if (typeof d?.error === "string") return d.error;
  } catch {
    // nie-JSON - to jest już gotowy tekst błędu
  }
  return text || "Wystąpił błąd.";
}
