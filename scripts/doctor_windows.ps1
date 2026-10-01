# ESP32 LAB — diagnostic de l'environnement Windows (ESP-IDF 6.1, Arduino, chemins, horodatages).
#   .\scripts\doctor_windows.ps1                 diagnostic
#   .\scripts\doctor_windows.ps1 -FixTimestamps  remet à l'heure actuelle les fichiers datés du futur
param([switch]$FixTimestamps)
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$ok = $true
function Line($name, $good, $detail) {
    $c = if ($good) { 'Green' } else { 'Yellow' }
    Write-Host ("{0,-22} {1,-4} {2}" -f $name, $(if ($good) { 'OK' } else { '!!' }), $detail) -ForegroundColor $c
    if (-not $good) { $script:ok = $false }
}
Write-Host "ESP32 LAB 6.0 — diagnostic" -ForegroundColor Cyan
Line 'Chemin du projet' ($root.Length -le 60 -and $root -notmatch ' ') "$root (court et sans espace conseillé)"
foreach ($cmd in 'python', 'git', 'cmake', 'ninja', 'idf.py') {
    $f = Get-Command $cmd -ErrorAction SilentlyContinue
    Line $cmd ([bool]$f) $(if ($f) { $f.Source } else { 'introuvable (ouvrez ESP-IDF 6.1 PowerShell)' })
}
if (Get-Command idf.py -ErrorAction SilentlyContinue) {
    $v = (idf.py --version) 2>$null
    Line 'Version ESP-IDF' ($v -match 'v6\.1') $v
}
if ($env:IDF_PATH) { Line 'IDF_PATH' ($env:IDF_PATH -notmatch ' ') $env:IDF_PATH } else { Line 'IDF_PATH' $false 'non défini' }
$node = Get-Command node -ErrorAction SilentlyContinue
Line 'Node.js (catalogue)' ([bool]$node) $(if ($node) { (node --version) } else { 'facultatif : nécessaire pour régénérer le catalogue' })
$future = Get-ChildItem $root -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -gt (Get-Date).AddMinutes(5) }
Line 'Fichiers datés futur' (@($future).Count -eq 0) ("{0} fichier(s)" -f @($future).Count)
if ($FixTimestamps -and $future) { $future | ForEach-Object { $_.LastWriteTime = Get-Date }; Write-Host 'Horodatages corrigés.' -ForegroundColor Green }
$old = Join-Path $root 'firmware\master\sdkconfig'
if (Test-Path $old) {
    $t = Select-String -Path $old -Pattern 'CONFIG_IDF_TARGET="esp32s3"' -Quiet
    Line 'sdkconfig' $t $(if ($t) { 'cible esp32s3' } else { 'mauvaise cible : supprimez sdkconfig et build' })
}
if ($ok) { Write-Host "`nTout est prêt : .\scripts\build_master.ps1 -Port COMx" -ForegroundColor Green }
else { Write-Host "`nCorrigez les points marqués !! puis relancez ce diagnostic." -ForegroundColor Yellow }
