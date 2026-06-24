# Supabase setup instructies

## 1. Project aanmaken

1. Ga naar https://supabase.com/dashboard
2. Klik **New Project**
3. Kies organisatie, naam `dkvk-excel-validator`, wachtwoord, regio **EU (Frankfurt)**
4. Wacht tot het project klaar is

## 2. Auth configureren

1. **Authentication → Providers → Email**: Magic Link ingeschakeld
2. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`
3. Optioneel: **Settings → Auth → SMTP** voor productie-e-mail

## 3. Database migraties

Kopieer en voer uit in **SQL Editor** (in volgorde):

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_storage_buckets.sql`

Of via CLI:

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## 4. Environment variables

Kopieer uit **Project Settings → API**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
ALLOWED_EMAIL_DOMAIN=dekunstvankunst.nl
```

## 5. Productie (Vercel)

- Voeg dezelfde env vars toe in Vercel
- Update redirect URL in Supabase naar `https://your-domain.vercel.app/auth/callback`
- Deploy: `vercel --prod`
