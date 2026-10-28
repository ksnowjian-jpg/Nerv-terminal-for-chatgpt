function Find-ThemeEngineClient {
  $candidates = @()
  foreach ($package in @(Get-AppxPackage -ErrorAction Stop | Where-Object {$_.Name -match '^OpenAI\.(Codex|ChatGPT)$'})) {
    $manifest = Get-AppxPackageManifest -Package $package.PackageFullName -ErrorAction Stop
    foreach ($application in @($manifest.Package.Applications.Application)) {
      if ([IO.Path]::GetFileName($application.Executable) -ine 'ChatGPT.exe') { continue }
      $exe = [IO.Path]::GetFullPath((Join-Path $package.InstallLocation $application.Executable))
      $packageRoot = [IO.Path]::GetFullPath($package.InstallLocation).TrimEnd('\') + '\'
      if (-not $exe.StartsWith($packageRoot, [StringComparison]::OrdinalIgnoreCase)) { continue }
      if (-not (Test-Path -LiteralPath $exe -PathType Leaf)) { continue }
      $candidates += [PSCustomObject]@{
        DisplayName = [string]$manifest.Package.Properties.DisplayName
        PackageName = $package.Name
        PackageVersion = $package.Version.ToString()
        PackageFullName = $package.PackageFullName
        Executable = $exe
        AppId = $package.PackageFamilyName + '!' + $application.Id
      }
    }
  }
  if ($candidates.Count -gt 1) { throw 'Multiple installed ChatGPT packages found; use doctor to identify the intended package.' }
  if ($candidates.Count -eq 1) { return $candidates[0] }
  throw 'No supported ChatGPT Store package found. Run doctor to inspect other installations.'
}
