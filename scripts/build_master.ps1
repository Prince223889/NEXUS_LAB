# ESP32 LAB — compile (et flashe) le MASTER ESP32-S3 avec ESP-IDF 6.1.
#   .\scripts\build_master.ps1                 compile
#   .\scripts\build_master.ps1 -Port COM7      compile, flashe et ouvre le moniteur
#   .\scripts\build_master.ps1 -Clean          repart d'un build propre
param(
    [string]$Port,
    [switch]$Clean,
    [string]$Idf = $(if ($env:IDF_PATH) { $env:IDF_PATH } else { 'C:\esp\v6.1\esp-idf' })
)
$ErrorActionPreference = 'Stop'
if (-not (Get-Command idf.py -ErrorAction SilentlyContinue)) {
    if (-not (Test-Path "$Idf\export.ps1")) { throw "ESP-IDF 6.1 introuvable ($Idf). Indiquez -Idf <chemin>." }
    . "$Idf\export.ps1"
}
$master = Join-Path $PSScriptRoot '..\firmware\master'
Set-Location $master
if ($Clean) {
    Remove-Item -Recurse -Force build, sdkconfig -ErrorAction SilentlyContinue
}
idf.py build
if ($LASTEXITCODE -ne 0) { throw "La compilation a échoué." }
$built = Join-Path $master 'build\esp32_lab_master.bin'
$rootBin = Join-Path $PSScriptRoot '..\esp32_lab_master.bin'
$sdDir = Join-Path $PSScriptRoot '..\SD_CARD\FIRMWARE\MASTER'
if (-not (Test-Path $built)) { throw "Binaire MASTER absent après compilation : $built" }
Copy-Item -LiteralPath $built -Destination $rootBin -Force
New-Item -ItemType Directory -Path $sdDir -Force | Out-Null
Copy-Item -LiteralPath $built -Destination (Join-Path $sdDir 'esp32_lab_master.bin') -Force
Write-Host "Binaire MASTER copié vers esp32_lab_master.bin et SD_CARD/FIRMWARE/MASTER/."
if ($Port) {
    idf.py -p $Port flash monitor
}
