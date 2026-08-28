# Wdrożenie iGŁOSOWANIA - przebudowa na System Głosowań Obiegowych

To wdrożenie zastępuje poprzednią aplikację (iOBRADY - obsługa posiedzeń na żywo) nowym
systemem opartym o sprawy obiegowe. **Zmienia się model danych w całości** - zgodnie z
koncepcją przebudowy system rozpoczyna pracę z **pustą bazą danych**; nie ma migracji
posiedzeń, głosowań ani dokumentów z poprzedniej wersji.

## Co się zmienia

- Usunięto: prezentację, nakładkę transmisyjną (OBS), panel przewodniczącego, listę mówców
  i wnioski formalne, obecność na sali, porządek obrad jako mechanizm prowadzenia obrad na
  żywo, zdarzenia czasu rzeczywistego (SSE), pojęcie klubu/koła.
- Nowy rdzeń: `Body`/`BodyMembership` (organ i skład), `Case` (sprawa obiegowa, zastępuje
  `Meeting`), `CaseParticipant` (migawka składu), `VotingItem` (pozycja głosowania, zastępuje
  `Vote`+`AgendaItem`), `CaseDocument` (dokumenty poza katalogiem publicznym).
- Nowa usługa `scheduler` w `docker-compose.yml` - automatyczne zamykanie spraw z upłynionym
  terminem (ten sam obraz co `app`, inny punkt wejścia).
- Role ograniczone do Operatora i Uczestnika (bez roli Przewodniczącego).

## Procedura (na pustej instalacji lub jako pełna wymiana)

Ponieważ nie ma migracji danych, potraktuj to jako świeże wdrożenie - pełna procedura opisana
jest w **INSTRUKCJA-DEPLOY.md**. W skrócie:

```bash
docker compose down          # jeśli działa poprzednia wersja
docker compose up -d --build
docker compose logs app --tail=100 -f
```

Jeśli chcesz zachować starą bazę do wglądu, wykonaj wcześniej kopię zapasową:

```bash
docker compose exec -T db pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} | gzip > backup-przed-przebudowa.sql.gz
```

Nowa baza tworzy się automatycznie (`prisma db push`); pierwsze konto operatora powstaje
przy `INIT_SEED=true` (patrz `.env.example`).
