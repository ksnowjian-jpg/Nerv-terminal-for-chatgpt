$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$downloads = @(
  @{Url='https://gist.githubusercontent.com/jangxx/a6dbeaeb4d1ecf08358c8240e350f018/raw/nerv.svg'; File='themes/nerv/assets/nerv-emblem.svg'},
  @{Url='https://raw.githubusercontent.com/google/fonts/main/ofl/sharetechmono/ShareTechMono-Regular.ttf'; File='themes/nerv/assets/fonts/ShareTechMono-Regular.ttf'},
  @{Url='https://raw.githubusercontent.com/google/fonts/main/ofl/sharetechmono/OFL.txt'; File='themes/nerv/assets/fonts/ShareTechMono-OFL.txt'},
  @{Url='https://raw.githubusercontent.com/google/fonts/main/ofl/barlowcondensed/BarlowCondensed-SemiBold.ttf'; File='themes/nerv/assets/fonts/BarlowCondensed-SemiBold.ttf'},
  @{Url='https://raw.githubusercontent.com/google/fonts/main/ofl/barlowcondensed/OFL.txt'; File='themes/nerv/assets/fonts/BarlowCondensed-OFL.txt'},
  @{Url='https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/radar.svg'; File='themes/nerv/assets/icons/radar.svg'},
  @{Url='https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/power.svg'; File='themes/nerv/assets/icons/power.svg'},
  @{Url='https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/cpu.svg'; File='themes/nerv/assets/icons/cpu.svg'},
  @{Url='https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/scan-line.svg'; File='themes/nerv/assets/icons/scan-line.svg'},
  @{Url='https://raw.githubusercontent.com/lucide-icons/lucide/main/LICENSE'; File='themes/nerv/assets/icons/LICENSE.txt'}
)
foreach ($item in $downloads) {
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $item.File) | Out-Null
  Invoke-WebRequest -Uri $item.Url -OutFile $item.File -UseBasicParsing -TimeoutSec 25
  Write-Host ($item.File + ' (' + (Get-Item -LiteralPath $item.File).Length + ' bytes)')
}
# The image is used as a sanitized local SVG, never inserted as executable DOM.
$source = Join-Path (Get-Location) 'themes/nerv/assets/nerv-emblem.svg'
$settings = [Xml.XmlReaderSettings]::new()
$settings.DtdProcessing = [Xml.DtdProcessing]::Ignore
$settings.XmlResolver = $null
$reader = [Xml.XmlReader]::Create($source, $settings)
$document = [Xml.XmlDocument]::new()
$document.XmlResolver = $null
try {$document.Load($reader)} finally {$reader.Dispose()}
$paths = @($document.GetElementsByTagName('path') | ForEach-Object {'<path d="' + $_.GetAttribute('d') + '"/>'})
$svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 468.72 468.72" fill="#f56b43">' + ($paths -join '') + '</svg>'
[IO.File]::WriteAllText($source, $svg, [Text.UTF8Encoding]::new($false))
