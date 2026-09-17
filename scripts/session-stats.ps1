$target = "c:\Users\dossa\AppData\Roaming\Code\User\workspaceStorage\e045e6f0a4f66247d90df9ca91b291b4\GitHub.copilot-chat\transcripts\68823f75-c85f-4840-80a1-d3d3470b6f76.jsonl"

$lines = Get-Content $target -ErrorAction SilentlyContinue
$first = $lines | Select-Object -First 1 | ConvertFrom-Json
$last = $lines | Select-Object -Last 1 | ConvertFrom-Json

$startDate = [DateTime]::Parse($first.timestamp)
$endDate = [DateTime]::Parse($last.timestamp)
$duration = $endDate - $startDate

Write-Host "=== Stats globales ==="
Write-Host "  Premier message: $($startDate.ToString('yyyy-MM-dd HH:mm:ss'))"
Write-Host "  Dernier message: $($endDate.ToString('yyyy-MM-dd HH:mm:ss'))"
Write-Host "  Duree totale:    $($duration.Days)j $($duration.Hours)h $($duration.Minutes)m"

Write-Host ""
Write-Host "=== Repartition par jour ==="
$byDay = @{}
$turnCount = 0
$userTurns = 0
$assistantTurns = 0
foreach ($line in $lines) {
  $obj = $line | ConvertFrom-Json
  if ($obj.type -eq 'user.message' -or $obj.role -eq 'user') { $userTurns++ }
  if ($obj.type -eq 'assistant.message' -or $obj.role -eq 'assistant') { $assistantTurns++ }
  $turnCount++
  $d = [DateTime]::Parse($obj.timestamp)
  $key = $d.ToString("yyyy-MM-dd")
  if (-not $byDay.ContainsKey($key)) { $byDay[$key] = @{ count = 0; first = $d; last = $d } }
  $byDay[$key].count++
  if ($d -lt $byDay[$key].first) { $byDay[$key].first = $d }
  if ($d -gt $byDay[$key].last) { $byDay[$key].last = $d }
}
$byDay.GetEnumerator() | Sort-Object Name | ForEach-Object {
  $span = $_.Value.last - $_.Value.first
  Write-Host "  $($_.Key): $($_.Value.count) msgs, $($_.Value.first.ToString('HH:mm')) -> $($_.Value.last.ToString('HH:mm')) (actif $([math]::Round($span.TotalHours, 1))h)"
}

Write-Host ""
Write-Host "=== Total ==="
Write-Host "  $turnCount messages au total (user: $userTurns, assistant: $assistantTurns)"
