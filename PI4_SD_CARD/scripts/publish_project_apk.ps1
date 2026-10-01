param(
  [string]$ApkPath = "",
  [string]$ProjectId = "",
  [string]$PiUrl = "",
  [string]$PiToken = "",
  [string]$QrPath = ""
)
$ErrorActionPreference = "Stop"
if (-not $ApkPath) { $ApkPath = Read-Host "Chemin de l’APK projet créée par build_project_apk.bat" }
if (-not $ProjectId) { $ProjectId = Read-Host "Identifiant du projet (project.json, sans espaces)" }
if (-not $PiUrl) { $PiUrl = Read-Host "Adresse du Pi sur ESP32-LAB (ex. http://192.168.4.2:8088)" }
if (-not $PiToken) { $sec = Read-Host "Jeton privé du Pi" -AsSecureString; $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec); try { $PiToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) } }
$ApkPath = (Resolve-Path -LiteralPath $ApkPath).Path
if ([IO.Path]::GetExtension($ApkPath) -ne ".apk") { throw "Choisis un fichier .apk." }
if ($ProjectId -notmatch '^[A-Za-z0-9_-]{1,80}$') { throw "Identifiant projet invalide." }
$PiUrl = $PiUrl.TrimEnd('/')
if ($PiUrl -notmatch '^http://(192\.168\.4\.\d+|[A-Za-z0-9.-]+):8088$') { throw "Adresse attendue : http://IP_DU_PI:8088 sur le réseau ESP32-LAB." }
if ($PiToken.Length -lt 32) { throw "Jeton Pi absent ou trop court." }
$headers = @{ Authorization = "Bearer $PiToken"; "X-Nexus-Project" = $ProjectId }
Write-Host "Envoi de l’APK au Pi et vérification de son archive…"
$result = Invoke-RestMethod -Uri "$PiUrl/api/v1/android/import" -Method Post -InFile $ApkPath -ContentType "application/vnd.android.package-archive" -Headers $headers -TimeoutSec 120
if (-not $result.id) { throw "Le Pi n’a pas renvoyé l’identifiant du paquet." }
if (-not $QrPath) { $QrPath = Join-Path (Split-Path -Parent $ApkPath) ($ProjectId + "-nexus-qr.png") }
$qrUri = "$PiUrl/api/v1/jobs/$($result.id)/qr"
Invoke-WebRequest -UseBasicParsing -Uri $qrUri -Headers @{ Authorization = "Bearer $PiToken" } -OutFile $QrPath -TimeoutSec 30 | Out-Null
Write-Host "APK projet publiée sur le Pi : $PiUrl/download/apps/$ProjectId/$($result.id).apk"
Write-Host "QR de téléchargement : $QrPath"
Write-Host "Taille : $($result.size) octets | SHA-256 : $($result.sha256)"
Write-Host "Scanne le QR depuis un téléphone connecté au Wi-Fi ESP32-LAB."
