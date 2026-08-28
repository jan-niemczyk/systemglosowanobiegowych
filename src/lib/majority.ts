import { MajorityKind, MajorityBase } from "@prisma/client";

export interface MajorityInput {
  yes: number;
  no: number;
  abstain: number;
  /** liczba uprawnionych w sprawie (pełny skład - migawka) */
  eligibleCount: number;
}

export interface MajorityResult {
  passed: boolean;
  basis: number;          // mianownik
  threshold: number;      // ile minimum głosów ZA wymaganych
  yesCount: number;
  formulaLabel: string;
}

/**
 * Oblicza wynik głosowania na podstawie typu (Kind) i mianownika (Base).
 *
 * - SIMPLE: zwykła. ZA > PRZECIW, wstrzymania ignorujemy. Base bez wpływu.
 * - ABSOLUTE: bezwzględna. ZA > (PRZECIW + WSTRZYMAŁO). Próg = floor(base/2) + 1.
 * - QUALIFIED_TWO_THIRDS: ZA >= ceil(2/3 * base).
 * - QUALIFIED_THREE_FIFTHS: ZA >= ceil(3/5 * base).
 *
 * Base określa mianownik dla bezwzględnej i kwalifikowanych:
 * - OF_VOTERS:    głosujący (oddanych głosów = yes + no + abstain)
 * - OF_FULL_BODY: wszystkich uprawnionych w sprawie (migawka składu)
 */
export function evaluateMajority(
  kind: MajorityKind,
  base: MajorityBase,
  input: MajorityInput,
): MajorityResult {
  const { yes, no, abstain, eligibleCount } = input;
  const cast = yes + no + abstain;

  if (kind === MajorityKind.SIMPLE) {
    return {
      passed: yes > no,
      basis: yes + no,
      threshold: no + 1,
      yesCount: yes,
      formulaLabel: "Większość zwykła (ZA > PRZECIW)",
    };
  }

  const baseValue = base === MajorityBase.OF_VOTERS ? cast : eligibleCount;
  const baseLabel = base === MajorityBase.OF_VOTERS ? "głosujących" : "pełnego składu";

  if (kind === MajorityKind.ABSOLUTE) {
    const threshold = Math.floor(baseValue / 2) + 1;
    return {
      passed: yes >= threshold && baseValue > 0,
      basis: baseValue,
      threshold,
      yesCount: yes,
      formulaLabel: `Większość bezwzględna (> 1/2 ${baseLabel})`,
    };
  }
  if (kind === MajorityKind.QUALIFIED_TWO_THIRDS) {
    const threshold = Math.ceil((2 / 3) * baseValue);
    return {
      passed: yes >= threshold && baseValue > 0,
      basis: baseValue,
      threshold,
      yesCount: yes,
      formulaLabel: `Większość 2/3 ${baseLabel}`,
    };
  }
  if (kind === MajorityKind.QUALIFIED_THREE_FIFTHS) {
    const threshold = Math.ceil((3 / 5) * baseValue);
    return {
      passed: yes >= threshold && baseValue > 0,
      basis: baseValue,
      threshold,
      yesCount: yes,
      formulaLabel: `Większość 3/5 ${baseLabel}`,
    };
  }

  return {
    passed: yes > no,
    basis: yes + no,
    threshold: no + 1,
    yesCount: yes,
    formulaLabel: "Reguła nieznana - fallback zwykła",
  };
}

export const KIND_LABELS: Record<MajorityKind, string> = {
  SIMPLE: "Zwykła (ZA > PRZECIW, wstrzymania nie liczą się)",
  ABSOLUTE: "Bezwzględna (więcej niż połowa)",
  QUALIFIED_TWO_THIRDS: "Kwalifikowana 2/3",
  QUALIFIED_THREE_FIFTHS: "Kwalifikowana 3/5",
};

export const BASE_LABELS: Record<MajorityBase, string> = {
  OF_VOTERS: "Od głosujących",
  OF_FULL_BODY: "Od pełnego składu",
};

/** Łączne formatowanie do wyświetlania użytkownikowi */
export function formatMajority(kind: MajorityKind, base: MajorityBase): string {
  if (kind === MajorityKind.SIMPLE) return "Zwykła";
  const k = kind === MajorityKind.ABSOLUTE ? "Bezwzględna"
    : kind === MajorityKind.QUALIFIED_TWO_THIRDS ? "2/3"
    : "3/5";
  const b = base === MajorityBase.OF_VOTERS ? "od głosujących" : "od pełnego składu";
  return `${k} ${b}`;
}
