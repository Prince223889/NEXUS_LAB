param(
  [Parameter(Mandatory=$true)][string]$ProjectDir,
  [string]$OutputDir = ""
)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Mobile = Join-Path $Root "mobile"
$Source = (Resolve-Path -LiteralPath $ProjectDir).Path
$MetaPath = Join-Path $Source "project.json"
if (-not (Test-Path -LiteralPath $MetaPath)) { throw "project.json absent dans le dossier choisi. Extrait d'abord le ZIP exporté depuis Studio." }
$Meta = Get-Content -LiteralPath $MetaPath -Raw -Encoding UTF8 | ConvertFrom-Json
$Id = [string]$Meta.id
if (-not $Id) { $Id = [string]$Meta.title }
$Slug = ($Id.ToLowerInvariant() -replace "[^a-z0-9_]", "_").Trim("_")
if (-not $Slug) { throw "Nom de projet invalide." }
$Assets = Join-Path $Mobile "app\src\main\assets"
$Config = Join-Path $Assets "project.json"
$CodeAsset = Join-Path $Assets "project_code.ino"
$HadConfig = Test-Path -LiteralPath $Config
$HadCodeAsset = Test-Path -LiteralPath $CodeAsset
$Backup = Join-Path ([System.IO.Path]::GetTempPath()) ("nexus-project-" + [guid]::NewGuid().ToString("N") + ".json")
$CodeBackup = Join-Path ([System.IO.Path]::GetTempPath()) ("nexus-project-code-" + [guid]::NewGuid().ToString("N") + ".ino")
if ($HadConfig) { Copy-Item -LiteralPath $Config -Destination $Backup }
if ($HadCodeAsset) { Copy-Item -LiteralPath $CodeAsset -Destination $CodeBackup }
$BuildGradle = Join-Path $Mobile "app\build.gradle"
$GradleBackup = Join-Path ([System.IO.Path]::GetTempPath()) ("nexus-gradle-" + [guid]::NewGuid().ToString("N") + ".gradle")
$Manifest = Join-Path $Mobile "app\src\main\AndroidManifest.xml"
$ManifestBackup = Join-Path ([System.IO.Path]::GetTempPath()) ("nexus-manifest-" + [guid]::NewGuid().ToString("N") + ".xml")
Copy-Item $BuildGradle $GradleBackup; Copy-Item $Manifest $ManifestBackup
try {
  Copy-Item -LiteralPath $MetaPath -Destination $Config -Force
  $Sketch = Get-ChildItem -LiteralPath $Source -Filter "*.ino" -File | Select-Object -First 1
  if (-not $Sketch) { throw "Croquis .ino absent dans le dossier du projet." }
  Copy-Item -LiteralPath $Sketch.FullName -Destination $CodeAsset -Force
  $g = Get-Content -LiteralPath $BuildGradle -Raw -Encoding UTF8
  $g = $g.Replace("applicationId 'local.nexus.lab'", "applicationId 'local.nexus.lab.p_$Slug'")
  Set-Content -LiteralPath $BuildGradle -Value $g -Encoding UTF8
  $m = Get-Content -LiteralPath $Manifest -Raw -Encoding UTF8
  $label = [System.Security.SecurityElement]::Escape([string]$Meta.title)
  if (-not $label) { $label = $Slug }
  $m = $m.Replace('android:label="NEXUS LAB"', ('android:label="' + $label + '"'))
  Set-Content -LiteralPath $Manifest -Value $m -Encoding UTF8
  Push-Location $Mobile
  try {
    $Sdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
    if (-not (Test-Path (Join-Path $Sdk "platforms\android-35\android.jar"))) { throw "Android SDK android-35 absent." }
    $Timer = [System.Diagnostics.Stopwatch]::StartNew()
    Write-Host ("Compilation Android démarrée à " + (Get-Date -Format "HH:mm:ss") + ". Gradle affiche les tâches au fur et à mesure.")
    & .\gradlew.bat --no-daemon --max-workers=1 --console=plain assembleDebug
    $Timer.Stop()
    Write-Host ("Temps de compilation APK : " + $Timer.Elapsed.ToString("hh\:mm\:ss"))
    if ($LASTEXITCODE -ne 0) { throw "Gradle a échoué avec code $LASTEXITCODE." }
  } finally { Pop-Location }
  if (-not $OutputDir) { $OutputDir = Join-Path $Root "dist\apps" }
  New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
  $Apk = Join-Path $Mobile "app\build\outputs\apk\debug\app-debug.apk"
  $Target = Join-Path $OutputDir ($Slug + "-nexus.apk")
  Copy-Item -LiteralPath $Apk -Destination $Target -Force
  Write-Host "APK projet créée: $Target"
} finally {
  Copy-Item -LiteralPath $GradleBackup -Destination $BuildGradle -Force
  Copy-Item -LiteralPath $ManifestBackup -Destination $Manifest -Force
  Remove-Item -LiteralPath $GradleBackup,$ManifestBackup -Force -ErrorAction SilentlyContinue
  if ($HadConfig) { Copy-Item -LiteralPath $Backup -Destination $Config -Force; Remove-Item -LiteralPath $Backup -Force }
  else { Remove-Item -LiteralPath $Config -Force -ErrorAction SilentlyContinue }
  if ($HadCodeAsset) { Copy-Item -LiteralPath $CodeBackup -Destination $CodeAsset -Force; Remove-Item -LiteralPath $CodeBackup -Force }
  else { Remove-Item -LiteralPath $CodeAsset -Force -ErrorAction SilentlyContinue }
}
