param(
    [string]$StudioOrigin = 'open-product-studio://app',
    [string]$EncoderPath,
    [string]$Voice = 'Microsoft Zira Desktop',
    [string]$WhisperModel,
    [switch]$Motion,
    [string]$WorkDirectory
)
$ErrorActionPreference = 'Stop'
$nodeProgram = (Get-Command node.exe -CommandType Application -ErrorAction Stop).Source
if (-not $EncoderPath) {
    $available = Get-Command ffmpeg.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($available) {
        $EncoderPath = $available.Source
    } else {
        Add-Type -AssemblyName System.Windows.Forms
        $picker = New-Object System.Windows.Forms.OpenFileDialog
        try {
            $picker.Title = 'Choose your installed FFmpeg executable'
            $picker.Filter = 'FFmpeg (ffmpeg.exe)|ffmpeg.exe'
            if ($picker.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { return }
            $EncoderPath = $picker.FileName
        } finally { $picker.Dispose() }
    }
}
$encoder = (Resolve-Path -LiteralPath $EncoderPath).ProviderPath
$arguments = @((Join-Path $PSScriptRoot 'bridge.mjs'), '--origin', $StudioOrigin, '--ffmpeg', $encoder, '--voice', $Voice)
if ($WhisperModel) { $arguments += @('--whisper-model', (Resolve-Path -LiteralPath $WhisperModel).ProviderPath) }
if ($Motion) { $arguments += '--motion' }
if ($WorkDirectory) { $arguments += @('--work', $WorkDirectory) }
& $nodeProgram @arguments
exit $LASTEXITCODE
