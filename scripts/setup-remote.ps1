# scripts/setup-remote.ps1 — Push le repo Zimb sur GitHub
#
# Utilisation:
#   1. Cree un repo vide sur https://github.com/new (ne pas init avec README)
#      - Nom suggere: zimb-app
#      - Visibilite: Private (recommandé pendant dev)
#   2. Cree un Personal Access Token (classic) sur https://github.com/settings/tokens
#      - Scope minimum: repo (full)
#      - OU utilise fine-grained token avec Contents: Read+Write
#   3. Execute ce script avec:
#      powershell -ExecutionPolicy Bypass -File scripts/setup-remote.ps1 -GitHubUser "TON-USER" -RepoName "zimb-app" -Token "ghp_xxx"

param(
  [Parameter(Mandatory=$true)] [string]$GitHubUser,
  [Parameter(Mandatory=$true)] [string]$RepoName,
  [string]$Token = $env:GITHUB_TOKEN,
  [switch]$Public
)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$repoUrl = "https://github.com/$GitHubUser/$RepoName.git"
$authUrl = $null
if ($Token) {
  $authUrl = "https://$Token@github.com/$GitHubUser/$RepoName.git"
} else {
  $authUrl = $repoUrl
  Write-Host "[WARN] Pas de token. Le push demandera tes credentials Windows (Credential Manager)" -ForegroundColor Yellow
}

Write-Host "=== Configuration du remote ===" -ForegroundColor Cyan
Write-Host "  User:   $GitHubUser"
Write-Host "  Repo:   $RepoName"
Write-Host "  URL:    $repoUrl"
Write-Host "  Public: $Public"

# Verifier si remote existe deja
$existing = git remote get-url origin 2>$null
if ($existing) {
  Write-Host "`n[INFO] Un remote 'origin' existe deja: $existing" -ForegroundColor Yellow
  $reponse = Read-Host "  Ecraser? (y/N)"
  if ($reponse -eq 'y' -or $reponse -eq 'Y') {
    git remote remove origin
  } else {
    Write-Host "[ABORT] Pas de modification." -ForegroundColor Red
    exit 1
  }
}

git remote add origin $authUrl
Write-Host "  [OK] Remote 'origin' ajoute" -ForegroundColor Green

Write-Host "`n=== Push sur origin/main ===" -ForegroundColor Cyan
git push -u origin main 2>&1

if ($LASTEXITCODE -eq 0) {
  Write-Host "`n[OK] Push reussi!" -ForegroundColor Green
  Write-Host "  Repo visible sur: https://github.com/$GitHubUser/$RepoName" -ForegroundColor Cyan

  # Nettoyer le token de l'URL stockee (le remplacer par la version sans token)
  if ($Token) {
    git remote set-url origin $repoUrl
    Write-Host "  [OK] URL remote nettoyee (token retire du tracking)" -ForegroundColor Green
  }
} else {
  Write-Host "`n[FAIL] Push echoue. Verifie:" -ForegroundColor Red
  Write-Host "  - Le repo existe sur GitHub" -ForegroundColor Red
  Write-Host "  - Le token a le scope 'repo'" -ForegroundColor Red
  Write-Host "  - Tu as les droits d'ecriture sur le repo" -ForegroundColor Red
  exit 1
}
