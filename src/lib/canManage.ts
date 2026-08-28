/**
 * Sprawy obiegowe prowadzi wyłącznie operator - nie ma osobnego pulpitu
 * przewodniczącego ani sterowania przebiegiem w czasie rzeczywistym (sekcja 6.2).
 */
type SessionLike = { user: { id: string; role: string } } | null | undefined;

export function isOperator(session: SessionLike): boolean {
  return !!session && session.user.role === "OPERATOR";
}
