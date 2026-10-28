param([switch]$CheckOnly, [switch]$WaitForExit, [int]$Port = 9335, [string]$Theme = 'nerv')
$ErrorActionPreference = 'Stop'
try {
  if ($Port -lt 1024 -or $Port -gt 65535) { throw 'Port must be between 1024 and 65535.' }
  $projectRoot = Split-Path -Parent $PSScriptRoot
  Set-Location -LiteralPath $projectRoot
  . (Join-Path $PSScriptRoot 'find-client.ps1')
  $client = Find-ThemeEngineClient
  Write-Host ''
  Write-Host ('Detected app: ' + $client.DisplayName) -ForegroundColor Green
  Write-Host ('Package:      ' + $client.PackageName + ' ' + $client.PackageVersion)
  Write-Host ('Executable:   ' + $client.Executable)
  Write-Host ('Start ID:     ' + $client.AppId)
  Write-Host ''
  $running = @(Get-Process -Name ChatGPT -ErrorAction SilentlyContinue | Where-Object {$_.Path -eq $client.Executable})
  if ($CheckOnly) {
    Write-Host ('Running processes for this app: ' + $running.Count)
    Write-Host 'Check only. Nothing was launched, closed or modified.'
    exit 0
  }
  $nodeCommand = Get-Command node.exe -ErrorAction Stop
  if (-not (Test-Path -LiteralPath 'node_modules/esbuild/package.json')) { throw 'Dependencies are missing. Run npm install in the project folder first.' }
  # A reachable port may already belong to a deliberately started test session.
  $ready = $false
  try {$response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/json/version" -UseBasicParsing -TimeoutSec 1 -MaximumRedirection 0; $ready = ($response.StatusCode -eq 200)} catch {}
  if (-not $ready) {
    if ($running.Count) {
      if (-not $WaitForExit) { throw 'ChatGPT is already running. Exit it normally (including its tray icon), then run again. Or use -WaitForExit.' }
      Write-Host 'Waiting for ChatGPT to exit normally. No processes will be killed.' -ForegroundColor Yellow
      Write-Host 'Save your work, then choose Exit/Quit from the app tray/menu. Closing only the window may leave it running.'
      Write-Host 'If this chat is in that app, finish reading the test instructions before exiting. Ctrl+C cancels.'
      $deadline = (Get-Date).AddMinutes(5)
      do {
        Start-Sleep -Milliseconds 500
        $running = @(Get-Process -Name ChatGPT -ErrorAction SilentlyContinue | Where-Object {$_.Path -eq $client.Executable})
        if ((Get-Date) -gt $deadline) { throw 'Timed out waiting for app exit. No processes were killed.' }
      } while ($running.Count)
    }
    # Check that the requested port is free before launching. Never change install files.
    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $Port)
    try {$listener.Start()} finally {$listener.Stop()}
    Write-Host ('Launching ChatGPT for this test, CDP bound to 127.0.0.1:' + $Port)
    # Activate by registered App ID: direct execution in WindowsApps can be denied.
    # This launches the interactive app explicitly chosen for this test.
    . (Join-Path $PSScriptRoot 'activate-client.ps1')
    $launchedId = Start-StoreThemeClient -AppId $client.AppId -Port $Port
    Write-Host ('Activated app process: ' + $launchedId)
    $deadline = (Get-Date).AddSeconds(35)
    do {
      Start-Sleep -Milliseconds 500
      try {$response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/json/version" -UseBasicParsing -TimeoutSec 1 -MaximumRedirection 0; $ready = ($response.StatusCode -eq 200)} catch {}
    } while (-not $ready -and (Get-Date) -lt $deadline)
    if (-not $ready) { throw 'The app did not expose CDP. No theme was applied. Exit and reopen ChatGPT normally to end this test.' }
  }
  Write-Host 'Inspecting local renderer structure and applying only if exactly one window is compatible...'
  & $nodeCommand.Source scripts/run.mjs client apply-auto --port $Port --theme $Theme
  if ($LASTEXITCODE -ne 0) { throw 'Theme startup failed. See the reason above and .local-tools/client-last-result.json for the failed check.' }
  Write-Host ''
  Write-Host 'Theme applied to the actual app. Check the right-side panel and normal app controls.' -ForegroundColor Green
  Write-Host 'Click Refresh in the added panel to open the official account menu, read visible quota, then close it.'
  Write-Host 'Restore with the panel Restore button or the Restore theme launcher in this project.'
  Write-Host 'To also close the debug port, exit ChatGPT completely and reopen it from the Start menu.'
} catch {
  Write-Host ('ERROR: ' + $_.Exception.Message) -ForegroundColor Red
  exit 1
}
