#!/usr/bin/env bash
# Koppel Supabase aan dit project na MCP/CLI login.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "→ Supabase projecten ophalen..."
PROJECTS=$(npx supabase projects list -o json 2>/dev/null || true)

if [ -z "$PROJECTS" ] || [ "$PROJECTS" = "[]" ]; then
  echo "Geen Supabase login gevonden. Voer eerst uit:"
  echo "  npx supabase login"
  echo "Of koppel Supabase MCP in Cursor: Settings → Tools & MCP → supabase → Connect"
  exit 1
fi

echo "$PROJECTS" | head -20

# Gebruik bestaand project of maak nieuw aan
PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
if [ -z "$PROJECT_REF" ]; then
  echo ""
  echo "Zet SUPABASE_PROJECT_REF=<project-id> en run opnieuw,"
  echo "of: npx supabase projects create dkvk-excel-validator --org-id <org-id> --region eu-central-1"
  exit 1
fi

echo "→ Linken aan project $PROJECT_REF..."
npx supabase link --project-ref "$PROJECT_REF"

echo "→ Migraties pushen..."
npx supabase db push

echo "→ API keys ophalen..."
API_URL=$(npx supabase projects api-keys --project-ref "$PROJECT_REF" -o json 2>/dev/null || true)

cat > .env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=https://${PROJECT_REF}.supabase.co
NEXT_PUBLIC_APP_URL=http://localhost:3000
ALLOWED_EMAIL_DOMAIN=dekunstvankunst.nl
EOF

echo ""
echo "Vul SUPABASE keys aan in .env.local via Supabase Dashboard → Settings → API"
echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "  SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "Klaar. Start de app met: npm run dev"
