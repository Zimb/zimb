# scripts/audit-secrets.ps1 — Audit pre-commit des secrets
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "=== Verif fichiers trackes contenant des secrets ==="
$trackedFiles = git ls-files
$tokenPattern = 'pat[A-Za-z0-9]{14,}\.'
$apiKeyPattern = 'AIRTABLE_API_KEY\s*=\s*"[^"]+"'
$baseIdPattern = 'AIRTABLE_BASE_ID\s*=\s*"app[^"]+"'
$secretsFound = $false

foreach ($f in $trackedFiles) {
  if (-not (Test-Path $f)) { continue }
  $content = Get-Content $f -Raw -ErrorAction SilentlyContinue
  if ($content -match $tokenPattern) { Write-Host "  [WARN] Airtable TOKEN detecte dans $f"; $secretsFound = $true }
  if ($content -match $apiKeyPattern) {
    if ($content -notmatch 'AIRTABLE_API_KEY\s*=\s*""' -and $content -notmatch 'AIRTABLE_API_KEY\s*=\s*"YOUR_') {
      Write-Host "  [WARN] AIRTABLE_API_KEY rempli dans $f"; $secretsFound = $true
    }
  }
  if ($content -match $baseIdPattern) {
    if ($content -notmatch 'AIRTABLE_BASE_ID\s*=\s*""' -and $content -notmatch 'AIRTABLE_BASE_ID\s*=\s*"YOUR_') {
      Write-Host "  [WARN] AIRTABLE_BASE_ID rempli dans $f"; $secretsFound = $true
    }
  }
}

Write-Host ""
Write-Host "=== .dev.vars doit etre ignore ==="
git check-ignore -v packages/worker/.dev.vars 2>&1 | ForEach-Object { Write-Host "  $_" }

Write-Host ""
Write-Host "=== Derniers commits ==="
git log --oneline -5

Write-Host ""
if ($secretsFound) {
  Write-Host "[FAIL] Secrets detectes. NE PAS COMMITER avant nettoyage." -ForegroundColor Red
  exit 1
} else {
  Write-Host "[OK] Aucun secret detecte dans les fichiers trackes." -ForegroundColor Green
}
