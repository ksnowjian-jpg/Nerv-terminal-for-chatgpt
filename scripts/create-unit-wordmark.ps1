param([string]$Output = 'themes/nerv/assets/art/unit01-wordmark-v1.svg')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationCore,WindowsBase
$culture = [Globalization.CultureInfo]::InvariantCulture
$typeface = [Windows.Media.Typeface]::new([Windows.Media.FontFamily]::new('SimHei'),[Windows.FontStyles]::Normal,[Windows.FontWeights]::Bold,[Windows.FontStretches]::Normal)
function Get-LetterGeometry([string]$Letter,[double]$X,[double]$Y,[double]$Width,[double]$Height) {
  $formatted = [Windows.Media.FormattedText]::new($Letter,$culture,[Windows.FlowDirection]::LeftToRight,$typeface,160,[Windows.Media.Brushes]::Black)
  $geometry = $formatted.BuildGeometry([Windows.Point]::new(0,0))
  $bounds = $geometry.Bounds
  $matrix = [Windows.Media.Matrix]::new(1,0,0,1,0,0)
  $matrix.Translate(-$bounds.X,-$bounds.Y)
  $matrix.Scale($Width/$bounds.Width,$Height/$bounds.Height)
  $matrix.Translate($X,$Y)
  $geometry.Transform = [Windows.Media.MatrixTransform]::new($matrix)
  return $geometry.GetOutlinedPathGeometry()
}
$glyphs = [Windows.Media.GeometryGroup]::new()
$glyphs.Children.Add((Get-LetterGeometry ([string][char]0x521D) 14 10 144 151))
$glyphs.Children.Add((Get-LetterGeometry ([string][char]0x53F7) 177 10 118 64))
$glyphs.Children.Add((Get-LetterGeometry ([string][char]0x6A5F) 171 83 131 80))
$cuts = [Windows.Media.GeometryGroup]::new()
$cuts.Children.Add([Windows.Media.RectangleGeometry]::new([Windows.Rect]::new(0,72,166,3)))
$cuts.Children.Add([Windows.Media.RectangleGeometry]::new([Windows.Rect]::new(0,126,330,2.5)))
$outline = [Windows.Media.Geometry]::Combine($glyphs,$cuts,[Windows.Media.GeometryCombineMode]::Exclude,$null).GetOutlinedPathGeometry()
$path = $outline.ToString($culture) -replace '^F[01]\s*',''
$svg = @"
<svg xmlns="http://www.w3.org/2000/svg" width="340" height="190" viewBox="0 0 340 190">
  <g transform="matrix(1 0 -.13 1 23 0)">
    <path d="$path" transform="translate(3 4)" fill="#78618f" opacity=".55" fill-rule="evenodd"/>
    <path d="$path" fill="#f2edf7" stroke="#c8b3df" stroke-width=".45" fill-rule="evenodd"/>
  </g>
  <path d="M13 21L24 10H30L17 23V56H13Z" fill="#b9ef72"/>
  <path d="M312 91H318V151L307 163H298L312 148Z" fill="#b9ef72"/>
  <path d="M177 174L170 186H187L194 174ZM204 174L197 186H214L221 174ZM231 174L224 186H241L248 174ZM258 174L251 186H268L275 174Z" fill="#c4ace9"/>
  <path d="M285 174L278 186H294L301 174Z" fill="#b9ef72"/>
  <path d="M309 11L320 23H309L298 11Z" fill="#e8ac62"/>
  <path d="M26 177H119" stroke="#7f6a97" stroke-width="1"/>
</svg>
"@
$resolved = [IO.Path]::GetFullPath((Join-Path (Get-Location) $Output))
$root = [IO.Path]::GetFullPath((Get-Location).Path) + [IO.Path]::DirectorySeparatorChar
if(-not $resolved.StartsWith($root,[StringComparison]::OrdinalIgnoreCase)) {throw 'Output must stay in the workspace.'}
if(Test-Path -LiteralPath $resolved) {throw 'Use a new versioned filename; existing artwork will not be overwritten.'}
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($resolved)) | Out-Null
[IO.File]::WriteAllText($resolved,$svg,[Text.UTF8Encoding]::new($false))
[PSCustomObject]@{File=$resolved;Bytes=(Get-Item -LiteralPath $resolved).Length;Glyphs='U+521D / U+53F7 / U+6A5F';Format='SVG paths; no text elements'} | ConvertTo-Json
