param([Parameter(Mandatory = $true)][string]$RequestFile)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$job = Get-Content -LiteralPath $RequestFile -Raw -Encoding UTF8 | ConvertFrom-Json
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $available = @($synth.GetInstalledVoices() | Where-Object Enabled | ForEach-Object { $_.VoiceInfo.Name })
  if ($available -cnotcontains $job.voice) {
    throw "Requested offline voice is unavailable. Installed voices: $($available -join ', ')"
  }
  $synth.SelectVoice($job.voice)
  if ($synth.Voice.Name -cne $job.voice) { throw 'The speech engine did not select the requested voice.' }
  # System.Speech timestamps its output events on a 16 kHz mono PCM clock.
  # Request that same clock explicitly so bookmarks line up with the actual WAV.
  $format = [System.Speech.AudioFormat.SpeechAudioFormatInfo]::new(16000,
    [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
  $null = Register-ObjectEvent -InputObject $synth -EventName BookmarkReached -SourceIdentifier StudioSpeechBookmark
  foreach ($scene in $job.scenes) {
    $prompt = New-Object System.Speech.Synthesis.PromptBuilder ($synth.Voice.Culture)
    for ($i = 0; $i -lt $scene.phrases.Count; $i++) {
      $prompt.AppendBookmark([string]$i)
      $prompt.AppendText(([string]$scene.phrases[$i] + ' '))
    }
    $synth.SetOutputToWaveFile($scene.wav, $format)
    $synth.Speak($prompt)
    $synth.SetOutputToNull()
    $events = @(Get-Event -SourceIdentifier StudioSpeechBookmark -ErrorAction SilentlyContinue)
    $starts = @($events | ForEach-Object {
      [pscustomobject]@{ index = [int]$_.SourceEventArgs.Bookmark; seconds = $_.SourceEventArgs.AudioPosition.TotalSeconds }
      Remove-Event -EventIdentifier $_.EventIdentifier
    })
    ConvertTo-Json -InputObject $starts -Compress | Set-Content -Encoding UTF8 -LiteralPath $scene.timings
  }
} finally {
  Unregister-Event -SourceIdentifier StudioSpeechBookmark -ErrorAction SilentlyContinue
  $synth.Dispose()
}
