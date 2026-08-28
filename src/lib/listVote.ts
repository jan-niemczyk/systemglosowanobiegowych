/**
 * Logika głosowania na listę kandydatów (VoteType.LIST).
 *
 * Założenie zgodne z praktyką Sejmu RP (potwierdzone wydrukami):
 *
 *   - Wyborca otrzymuje listę N kandydatów / opcji.
 *   - Może zaznaczyć od `minSelections` do `maxSelections` opcji.
 *   - Zaznaczenie opcji = głos ZA tym kandydatem.
 *   - BRAK zaznaczenia opcji u głosującego = głos PRZECIW temu kandydatowi.
 *   - Nieoddanie ballota w ogóle = nie głosował (NIE GŁOSOWAŁ),
 *     osobny status - nie liczy się ani jako "za", ani jako "przeciw".
 *
 * Wyłącznie zliczenie głosów - bez żadnego automatycznego rozstrzygania
 * (aplikacja nie stosuje progów większości).
 */

export interface ListVoteOption {
  id: string;
  order: number;
  label: string;
}

export interface ListBallot {
  /** id ballota (niezbędne, ale niewykorzystywane w obliczeniach) */
  id: string;
  /** id użytkownika - null dla głosów tajnych po anonimizacji */
  userId: string | null;
  /** wybrane opcje */
  selectedOptionIds: string[];
}

export interface ListOptionResult {
  optionId: string;
  label: string;
  yesCount: number;     // liczba głosów ZA
  noCount: number;      // liczba głosów PRZECIW (głosujący, którzy nie zaznaczyli)
}

export interface ListVoteResult {
  voterCount: number;          // liczba osób, które oddały ballot
  options: ListOptionResult[]; // posortowane alfabetycznie po etykiecie
}

export function computeListVoteResult(args: {
  options: ListVoteOption[];
  ballots: ListBallot[];
}): ListVoteResult {
  const { options, ballots } = args;
  const voterCount = ballots.length;

  // liczymy "za" dla każdej opcji jako liczbę zaznaczeń
  const yesByOption = new Map<string, number>();
  for (const opt of options) yesByOption.set(opt.id, 0);
  for (const b of ballots) {
    for (const optId of b.selectedOptionIds) {
      yesByOption.set(optId, (yesByOption.get(optId) ?? 0) + 1);
    }
  }

  const results: ListOptionResult[] = options
    .map((o) => {
      const yes = yesByOption.get(o.id) ?? 0;
      const no = voterCount - yes;
      return { optionId: o.id, label: o.label, yesCount: yes, noCount: no };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "pl"));

  return { voterCount, options: results };
}
