param([int[]]$Ports = @(9222,9223,9333,9335))
$ErrorActionPreference = 'Continue'
$packages = @()
$packageError = $null
try {
  $packages = @(Get-AppxPackage -ErrorAction Stop | Where-Object {$_.Name -match 'OpenAI|ChatGPT|Codex'} | ForEach-Object {
    $package = $_
    $manifest = Get-AppxPackageManifest -Package $package.PackageFullName -ErrorAction Stop
    [PSCustomObject]@{Name=$package.Name;DisplayName=[string]$manifest.Package.Properties.DisplayName;Version=$package.Version.ToString();InstallLocation=$package.InstallLocation;AppIds=@($manifest.Package.Applications.Application | ForEach-Object {$package.PackageFamilyName+'!'+$_.Id})}
  })
} catch { $packageError = 'Package enumeration unavailable in this permission context' }
$startApps = @(Get-StartApps -ErrorAction SilentlyContinue | Where-Object {$_.Name -match 'ChatGPT|Codex|OpenAI'})
$processes = @(Get-Process -ErrorAction SilentlyContinue | Where-Object {$_.ProcessName -eq 'ChatGPT'} | ForEach-Object {
  $product = $null
  $fileVersion = $null
  if ($_.Path) { try {$info = (Get-Item -LiteralPath $_.Path -ErrorAction Stop).VersionInfo; $product=$info.ProductName; $fileVersion=$info.FileVersion} catch {} }
  [PSCustomObject]@{Name=$_.ProcessName;Id=$_.Id;Path=$_.Path;Product=$product;FileVersion=$fileVersion}
})
$endpoints = @(foreach ($port in $Ports) {
  if ($port -lt 1024 -or $port -gt 65535) { throw 'Port out of range' }
  try { $r=Invoke-WebRequest -Uri "http://127.0.0.1:$port/json/version" -UseBasicParsing -TimeoutSec 2 -MaximumRedirection 0 -ErrorAction Stop; [PSCustomObject]@{Port=$port;Reachable=($r.StatusCode -eq 200)} }
  catch { [PSCustomObject]@{Port=$port;Reachable=$false} }
})
[PSCustomObject]@{CheckedAt=(Get-Date).ToString('o');OS=[Environment]::OSVersion.VersionString;Node=(& node --version);Packages=$packages;StartApps=$startApps;PackageError=$packageError;Processes=$processes;Endpoints=$endpoints;Conclusion='Detection only. Package identity and display name can differ. No install files were changed; no credentials or account settings were read.'} | ConvertTo-Json -Depth 5
