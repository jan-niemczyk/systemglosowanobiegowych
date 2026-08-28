# iGŁOSOWANIA - instrukcja wdrożenia (od zera, dla każdego serwera)

**iGŁOSOWANIA** to system głosowań obiegowych: przygotowywanie, przeprowadzanie i
dokumentowanie spraw rozstrzyganych zdalnie (głosowania jawne i tajne, różne reguły
większości, dokumenty spraw, wydruki i protokoły). System nie obsługuje posiedzeń na żywo.

Ta instrukcja jest uniwersalna - nie zawiera danych konkretnego serwera. Poprowadzi Cię od
czystej maszyny z Linuksem do działającej aplikacji. Wszystkie polecenia można kopiować i wklejać.
W miejscach `TWOJA-...` / `TWOJ-...` wpisz własne wartości. Zakładamy paczkę `iglosowania.tar.gz` z kodem.

---

## Co jest potrzebne

- Serwer z systemem Linux (np. Ubuntu 22.04 lub nowszy) u dowolnego dostawcy (VPS).
- Dostęp do serwera przez SSH (użytkownik root lub z sudo).
- Domena kierująca na adres IP serwera (opcjonalna, ale zalecana - potrzebna do HTTPS).
- Około 15 minut.

---

## Krok 1. Zainstaluj Dockera

Docker uruchamia całą aplikację (baza danych, serwer aplikacji, serwer WWW) w kontenerach,
więc nie trzeba niczego konfigurować ręcznie. Na serwerze:

```bash
apt update && apt install -y docker.io docker-compose-plugin
systemctl enable --now docker
docker --version && docker compose version
```

---

## Krok 2. Wgraj i rozpakuj aplikację

Ze swojego komputera (podmień `TWOJ-SERWER` na IP lub domenę):

```bash
scp iglosowania.tar.gz root@TWOJ-SERWER:/root/
```

Na serwerze:

```bash
cd /root
tar xzf iglosowania.tar.gz
cd iglosowania
```

(Jeśli katalog nazywa się inaczej, `ls` pokaże nazwę - wejdź do niego.)

---

## Krok 3. Utwórz plik konfiguracyjny `.env`

To jedyny plik, który wypełniasz własnymi danymi:

```bash
cat > .env << 'EOF'
# Baza danych
POSTGRES_USER=iglosowania
POSTGRES_PASSWORD=ZMIEN_NA_MOCNE_HASLO_BAZY
POSTGRES_DB=iglosowania
DATABASE_URL=postgresql://iglosowania:ZMIEN_NA_MOCNE_HASLO_BAZY@db:5432/iglosowania

# Adres publiczny i bezpieczenstwo sesji
# Z domena:  https://TWOJA-DOMENA
# Tylko IP:  http://ADRES-IP:3000
NEXTAUTH_URL=https://TWOJA-DOMENA
NEXTAUTH_SECRET=ZMIEN_NA_DLUGI_LOSOWY_CIAG

# Konto operatora tworzone przy pierwszym uruchomieniu
SEED_OPERATOR_EMAIL=operator@twoja-domena
SEED_OPERATOR_PASSWORD=ZMIEN_NA_HASLO_MIN_8_ZNAKOW

# Utworz konto operatora przy pierwszym starcie (potem ustaw na false)
INIT_SEED=true
EOF
```

Hasło bazy w `POSTGRES_PASSWORD` i w `DATABASE_URL` musi być **identyczne**.

Wygeneruj mocny `NEXTAUTH_SECRET` i wklej go do `.env` (np. edytorem `nano .env`):

```bash
openssl rand -base64 32
```

Zmień też hasła bazy i operatora na własne.

---

## Krok 4. Zbuduj i uruchom

```bash
docker compose up -d --build
docker compose logs app --tail=100 -f
```

Poczekaj na `✓ Ready`, potem `Ctrl+C` (aplikacja działa dalej w tle).
Struktura bazy tworzy się automatycznie przy pierwszym starcie.

---

## Krok 5. Zaloguj się i wyłącz tworzenie konta

Wejdź na adres z `NEXTAUTH_URL` i zaloguj się danymi operatora z `.env`. Następnie:

```bash
sed -i 's/INIT_SEED=true/INIT_SEED=false/' .env
docker compose up -d
```

Gotowe.

---

## HTTPS i domena (zalecane)

1. Rekord DNS `A` domeny wskazuje na IP serwera.
2. Porty 80 i 443 otwarte.

Wbudowany serwer WWW (Caddy) sam pobierze i odnowi certyfikat HTTPS - nie trzeba nic
konfigurować poza poprawnym DNS. Bez domeny aplikacja działa po HTTP (do testów).

---

## Aktualizacja do nowszej wersji

```bash
# 1. Ze swojego komputera:
scp iglosowania.tar.gz root@TWOJ-SERWER:/root/

# 2. Na serwerze - kopia zapasowa PRZED aktualizacja:
cd /root
docker compose -f /root/iglosowania/docker-compose.yml exec -T db \
  pg_dump -U iglosowania iglosowania | gzip > /root/iglosowania-backup-$(date +%F-%H%M).sql.gz

# 3. Zatrzymaj i zabezpiecz konfiguracje (KOPIUJ, nie przenos):
docker compose -f /root/iglosowania/docker-compose.yml down
cp /root/iglosowania/.env /root/iglosowania.env.SAVE

# 4. Podmien pliki i przywroc konfiguracje:
rm -rf /root/iglosowania && tar xzf iglosowania.tar.gz
cp /root/iglosowania.env.SAVE /root/iglosowania/.env

# 5. Zbuduj i uruchom:
cd /root/iglosowania && docker compose up -d --build
docker compose logs app --tail=100 -f
```

Nowe pola w bazie dodają się automatycznie - dane pozostają nienaruszone.

---

## Kopia zapasowa i przywracanie

Kopia w dowolnej chwili:

```bash
cd /root/iglosowania
docker compose exec -T db pg_dump -U iglosowania iglosowania | gzip > /root/iglosowania-backup-$(date +%F-%H%M).sql.gz
```

Przywrócenie (podmien nazwe pliku):

```bash
cd /root/iglosowania
docker compose down
docker compose up -d db
gunzip -c /root/iglosowania-backup-RRRR-MM-DD-HHMM.sql.gz | docker compose exec -T db psql -U iglosowania iglosowania
docker compose up -d
```

Dane bazy są niezależne od plików aplikacji - podmiana kodu nie kasuje danych.

---

## Przydatne polecenia

```bash
cd /root/iglosowania && docker compose ps                       # stan uslug
cd /root/iglosowania && docker compose logs app --tail=200 -f   # logi aplikacji
cd /root/iglosowania && docker compose restart app              # restart bez przebudowy
cd /root/iglosowania && docker compose build --no-cache app && docker compose up -d  # pelna przebudowa
cd /root/iglosowania && docker compose down                     # zatrzymanie
```

---

## Najczęstsze problemy

- **Złe hasło przy logowaniu** - sprawdz `SEED_OPERATOR_EMAIL` / `SEED_OPERATOR_PASSWORD`
  w `.env` i czy pierwszy start mial `INIT_SEED=true`.
- **Brak HTTPS** - sprawdz rekord DNS `A` i porty 80/443. Certyfikat pojawia sie w ciagu
  minuty od poprawnego skierowania domeny.
- **Blad polaczenia z baza** - haslo w `POSTGRES_PASSWORD` i `DATABASE_URL` musi byc identyczne.
- **Build zatrzymal sie na bledzie** - skopiuj tresc bledu z `docker compose logs app` i zglos autorowi paczki.
