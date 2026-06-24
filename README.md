# DKVK Excel Validator

Interne webapp voor medewerkers van **De Kunst van Kunst** om Excel-adreslijsten te valideren, corrigeren en exporteren.

## Functies (MVP)

- Magic link login (alleen `@dekunstvankunst.nl`)
- Template upload (voorbeeld-Excel als structuur)
- Excel upload met validatie en correctievoorstellen
- Reviewpagina met goedkeuren/afwijzen/handmatig wijzigen
- Export naar Excel met audit-tabblad

## Stack

- Next.js 16, TypeScript, Tailwind CSS
- Supabase (Auth, PostgreSQL, Storage)
- ExcelJS voor parse/export
- Vitest voor unit tests

## Supabase setup

1. Maak een nieuw project aan in de **EU-regio** (bijv. Frankfurt) op [supabase.com](https://supabase.com)
2. Ga naar **Authentication → URL Configuration** en voeg toe:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`
3. Schakel **Email (Magic Link)** in onder Authentication → Providers
4. Configureer SMTP voor betrouwbare e-mail (Settings → Auth → SMTP)
5. Voer migraties uit via SQL Editor of Supabase CLI:
   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```
   Of kopieer de SQL uit `supabase/migrations/` naar de SQL Editor.
6. Controleer dat storage buckets `templates`, `uploads`, `exports` bestaan (migratie 002)

## Lokaal draaien

```bash
cp .env.example .env.local
# Vul Supabase credentials in
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Tests

```bash
npm test
```

## Pagina's

| Route | Beschrijving |
|---|---|
| `/login` | Inloggen met magic link |
| `/dashboard` | Upload + overzicht |
| `/templates` | Template beheer |
| `/uploads/[id]` | Upload detail |
| `/uploads/[id]/review` | Controle en goedkeuring |
| `/uploads/[id]/export` | Excel download |

## Referentie-template

De standaard kolomvolgorde volgt het aanleverformaat van De Kunst van Kunst:

| Aanhef | Naam | Adres | Nummer | Postcode | Woonplaats | Email | Tel/mobiel |

Referentiebestand: `tests/fixtures/vloerenfabriek-template.xlsx` (kopregel op rij 3, kolom B).

De parser detecteert automatisch de kopregel, ook als er een titelrij boven staat (bijv. "Aanleveren adressen").

## Referentie-template (legacy aliassen)

Oudere kolomnamen worden automatisch herkend: `Huisnummer` → `Nummer`, `E-mail` → `Email`, `Telefoon/Mobiel` → `Tel/mobiel`.

## Belangrijk

De app **verzint nooit gegevens**. Bij twijfel wordt een rij gemarkeerd als "Controle nodig". De mock adresprovider (`lib/address/mock-provider.ts`) moet vervangen worden door een echte bron (PDOK/BAG/PostNL).

## AVG / Privacy

Bestanden bevatten mogelijk persoonsgegevens. Storage buckets zijn private met RLS. Uploads zijn gekoppeld aan ingelogde gebruikers.
