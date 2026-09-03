# iGŁOSOWANIA - System Głosowań Obiegowych

**iGŁOSOWANIA** to platforma do przygotowywania, przeprowadzania i dokumentowania głosowań
obiegowych organów kolegialnych (rad, komisji, zarządów). Prowadzi operatora i uczestnika
przez cykl życia sprawy - od publikacji projektu dokumentu, przez oddawanie głosów, do
zamknięcia, publikacji wyników i wygenerowania dokumentów wynikowych. System nie odwzorowuje
sali obrad ani przebiegu dyskusji na żywo - jest to świadome uproszczenie względem
poprzedniego modelu opartego na posiedzeniu.

## Główne funkcje

- **Sprawy obiegowe**: nazwa, opis, terminy (otwarcie/termin końcowy/zamknięcie), konfiguracja
  (tryb zakończenia, publikacja wyników, dopuszczalność zmiany głosu), skład uprawnionych osób
  (migawka niezależna od późniejszych zmian składu organu), dokumenty i co najmniej jedna
  pozycja głosowania.
- **Pozycje głosowania** w ramach sprawy - pojedyncza uchwała albo pakiet wielu rozstrzygnięć:
  - zwykłe (za / przeciw / wstrzymuję się),
  - pakietowe (wiele pozycji, osobny głos na każdą),
  - na kandydatów / listę (wybór dopuszczonych opcji, z limitem min/max zaznaczeń).
  Głosowania jawne (z imiennym wykazem) i tajne (bez powiązania osoby z wyborem - pierwszy
  oddany głos jest ostateczny). Różne reguły większości (zwykła / bezwzględna / 2/3 / 3/5,
  liczone od głosujących albo od pełnego składu).
- **Organy i składy**: rejestr organów/zespołów z gotowym składem członkowskim, używanym do
  szybkiego zbudowania składu nowej sprawy (z możliwością korekty wyłącznie dla tej sprawy,
  ręcznego zbudowania składu od podstaw, lub wykorzystania kilku niezależnych organów).
- **Cykl życia sprawy**: projekt → otwarcie (po walidacji gotowości: skład, pozycje, dokument
  projektu) → oddawanie głosów → zamknięcie (ręczne, po oddaniu głosów przez wszystkich, albo
  z upływem terminu) → publikacja wyników (automatyczna lub ręczna) → dokumenty wynikowe.
- **Dokumenty**: projekty i załączniki publikowane przed otwarciem, dokumenty wynikowe po
  zamknięciu. Pliki przechowywane poza katalogiem publicznym, udostępniane wyłącznie po
  sprawdzeniu uprawnień (operator lub uczestnik danej sprawy). Limity wielkości i dopuszczalnych
  typów plików konfigurowalne w ustawieniach.
- **Wydruki**: zbiorcza karta sprawy, raport głosowania pozycji (PDF/CSV), imienny wykaz głosów
  (wyłącznie dla głosowań jawnych), potwierdzenie udziału uczestnika, protokół (DOCX, Arial).
  Wydruki czarno-białe, o poważnym, urzędowym charakterze.
- **Role**: Operator (tworzy i prowadzi sprawy, dobiera skład, publikuje dokumenty i wyniki,
  generuje wydruki, zarządza organami i kontami) oraz Uczestnik (przegląda sprawy, do których
  jest uprawniony, pobiera dokumenty, oddaje lub zmienia głos, pobiera potwierdzenie). Nie ma
  osobnego pulpitu przewodniczącego ani sterowania przebiegiem w czasie rzeczywistym.
- **Rejestr czynności**: utworzenie, konfiguracja, otwarcie, zamknięcie i publikacja wyników
  każdej sprawy są rozliczalne.
- **Powiadomienia e-mail**: po skonfigurowaniu dowolnej skrzynki SMTP w panelu Ustawienia,
  uczestnicy dostają automatyczny e-mail przy rozpoczęciu głosowania i przy publikacji wyników
  (ręcznej i automatycznej).

## Stos technologiczny

- Next.js 15 (App Router), React 19, TypeScript
- PostgreSQL 16 + Prisma
- NextAuth (logowanie hasłem, role: operator / uczestnik)
- Tailwind CSS
- pdfmake (PDF), docx (DOCX)

## Architektura wdrożenia

Aplikacja działa w kontenerach (Docker Compose):

- `db` - PostgreSQL,
- `app` - aplikacja webowa (interfejs operatora i uczestnika, logika spraw, głosowań, raportów
  i kontroli dostępu),
- `scheduler` - harmonogram: cyklicznie sprawdza sprawy z upłynionym terminem (tryb zakończenia
  „z upływem terminu") i bezpiecznie je zamyka; ten sam obraz co `app`, inny punkt wejścia,
- `caddy` - reverse proxy z automatycznym certyfikatem HTTPS.

Pełna instrukcja wdrożenia od zera (dla dowolnego serwera, bez danych konkretnej instalacji)
znajduje się w pliku **INSTRUKCJA-DEPLOY.md**.

Wymagane zmienne środowiskowe (plik `.env`, patrz `.env.example`):

- `DATABASE_URL` - połączenie do PostgreSQL
- `NEXTAUTH_URL` - publiczny adres aplikacji
- `NEXTAUTH_SECRET` - sekret sesji
- `SEED_OPERATOR_EMAIL`, `SEED_OPERATOR_PASSWORD` - dane konta operatora tworzonego przy seedzie
- `INIT_SEED` - `true` przy pierwszym uruchomieniu na pustej bazie (potem `false`)
- `SCHEDULER_INTERVAL_SECONDS` - co ile sekund harmonogram sprawdza terminy (domyślnie 60)

Start:

```
docker compose up -d --build
docker compose logs app -f
```

Przy starcie aplikacja wykonuje `prisma db push` (synchronizacja schematu) i - gdy
`INIT_SEED=true` - seed tworzący ustawienia globalne oraz jedno konto operatora. System
rozpoczyna pracę z pustą bazą danych - nie przewiduje się migracji spraw ani dokumentów z
poprzedniej wersji (opartej na posiedzeniu).

## Model danych (skrót)

- `Body` / `BodyMembership` - organ lub zespół oraz jego gotowy skład członkowski.
- `Case` - sprawa obiegowa (status, konfiguracja, terminy).
- `CaseParticipant` - migawka osoby uprawnionej w konkretnej sprawie.
- `VotingItem` / `VoteOption` / `Ballot` / `BallotSelection` / `SecretBallotMarker` - pozycje
  głosowania, opcje, oddane głosy (jawne) i anonimowe znaczniki oddania głosu (tajne).
- `CaseDocument` - dokumenty sprawy (projekt / załącznik / dokument wynikowy).
- `AuditLog` - rejestr czynności.

## Bezpieczeństwo

- Logowanie hasłem (hash bcrypt), role sprawdzane po stronie API.
- Dla głosowania tajnego nie istnieje żadna relacja w bazie pozwalająca powiązać osobę z
  oddanym wyborem - przechowywane są wyłącznie zbiorcze liczniki i anonimowy fakt oddania głosu.
- Dokumenty przechowywane poza katalogiem publicznym serwera, pobierane wyłącznie po
  sprawdzeniu uprawnień.
- Nagłówki bezpieczeństwa na proxy (HSTS, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy).

## Licencja

Oprogramowanie własne. Wszelkie prawa zastrzeżone.
