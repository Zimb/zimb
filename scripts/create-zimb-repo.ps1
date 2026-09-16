# scripts/create-zimb-repo.ps1 — Crée le repo GitHub "zimb" et pousse le code local
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

# Recuperer le token depuis le credential manager git
$credOutput = "protocol=https`nhost=github.com" | git credential fill 2>&1
$username = ($credOutput | Where-Object { $_ -match "^username=" }) -replace "^username=", ""
$token = ($credOutput | Where-Object { $_ -match "^password=" }) -replace "^password=", ""

if (-not $token) {
  Write-Host "[FAIL] Pas de token GitHub trouve dans le credential manager." -ForegroundColor Red
  exit 1
}
Write-Host "[OK] Token GitHub recupere pour user: $username"

$headers = @{
  Authorization  = "Bearer $token"
  "User-Agent"   = "zimb-bootstrap"
  Accept         = "application/vnd.github+json"
}

# 1. Verifier l'identite
Write-Host "`n=== Verification identite ==="
$me = Invoke-WebRequest -Uri "https://api.github.com/user" -Headers $headers -UseBasicParsing -TimeoutSec 15 | ConvertFrom-Json
Write-Host "  User: $($me.login) (id=$($me.id))"

# 2. Creer le repo si besoin
$repoName = "zimb"
Write-Host "`n=== Verifier si le repo '$repoName' existe ==="
$existing = $null
try {
  $existing = Invoke-WebRequest -Uri "https://api.github.com/repos/$username/$repoName" -Headers $headers -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop | ConvertFrom-Json
  Write-Host "  [INFO] Repo existe deja: $($existing.html_url)" -ForegroundColor Yellow
} catch {
  Write-Host "  [INFO] Repo n'existe pas, creation..."
  $body = @{
    name         = $repoName
    description  = "Zimb.app - plateforme de bounty debugging (Vibe Coders <-> Seniors)"
    isPrivate    = $true
    has_issues   = $true
    has_projects = $true
    auto_init    = $false
  } | ConvertTo-Json -Depth 10

  $resp = Invoke-WebRequest -Uri "https://api.github.com/user/repos" -Method POST -Headers $headers -ContentType "application/json" -Body $body -UseBasicParsing -TimeoutSec 30 -ErrorAction Stop
  $existing = $resp.Content | ConvertFrom-Json
  Write-Host "  [OK] Repo cree: $($existing.html_url)" -ForegroundColor Green
  Write-Host "    Visibility: $($existing.visibility)"
  Write-Host "    Clone URL:  $($existing.clone_url)"
}

# 3. Configurer le remote
$cloneUrl = $existing.clone_url
Write-Host "`n=== Configuration du remote 'origin' ==="
$existingRemote = $null
try { $existingRemote = git remote get-url origin 2>$null } catch {}
if ($existingRemote) {
  Write-Host "  [INFO] Remote 'origin' existe: $existingRemote"
  git remote remove origin
}
git remote add origin $cloneUrl
Write-Host "  [OK] Remote 'origin' = $cloneUrl" -ForegroundColor Green

# 4. Push
Write-Host "`n=== Push main ==="
$authUrl = $cloneUrl -replace "https://", "https://$token@"
$env:GIT_ASKPASS = "true"
$env:GIT_TERMINAL_PROMPT = "0"
git push $authUrl main 2>&1 | Select-Object -First 10

if ($LASTEXITCODE -eq 0) {
  Write-Host "`n[OK] Push reussi!" -ForegroundColor Green
  Write-Host "  Repo: $($existing.html_url)" -ForegroundColor Cyan
} else {
  Write-Host "`n[FAIL] Push echoue" -ForegroundColor Red
  exit 1
}
