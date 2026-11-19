# Exercises real Shell associations and install/uninstall only on a disposable hosted runner.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted' -or $env:RUNNER_OS -ne 'Windows') {
    throw 'Use the Windows installer workflow on a GitHub-hosted Windows runner.'
}
if ($env:CANDIDATE_SHA -cnotmatch '^[0-9a-f]{40}$' -or $env:CANDIDATE_SHA -cne (git rev-parse HEAD)) {
    throw 'Candidate and source checkout disagree.'
}
$repo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$version = (Get-Content -LiteralPath (Join-Path $repo 'apps/desktop/package.json') -Raw | ConvertFrom-Json).version
$evidence = Join-Path $repo 'release/evidence'
$installer = Get-Item -LiteralPath (Join-Path $repo "release/qualification/Open-Product-Studio-$version-x64.exe")
$installDir = Join-Path $env:STUDIO_QUALIFICATION_TEMP 'install'
$testUser = Join-Path $env:STUDIO_QUALIFICATION_TEMP 'user'
$protocol = 'HKCU:\Software\Classes\open-product-studio'
$userPath = [Environment]::GetEnvironmentVariable('Path','User')
if ((Test-Path -LiteralPath $installDir) -or (Test-Path -LiteralPath $testUser) -or (Test-Path -LiteralPath $protocol)) {
    throw 'Expected unused Studio installation, profile and protocol association.'
}
New-Item -Type Directory -Path $evidence,$testUser | Out-Null
$receipt = [ordered]@{
    candidate = $env:CANDIDATE_SHA
    workflowSha = $env:GITHUB_WORKFLOW_SHA
    runnerImage = $env:ImageVersion
    workflowRun = "$env:GITHUB_RUN_ID/$env:GITHUB_RUN_ATTEMPT"
    lockfileSha256 = (Get-FileHash -LiteralPath (Join-Path $repo 'pnpm-lock.yaml')).Hash.ToLowerInvariant()
    smokeScriptSha256 = (Get-FileHash -LiteralPath (Join-Path $repo 'scripts/smoke-studio-windows-app.cjs')).Hash.ToLowerInvariant()
    artifact = $installer.Name
    sha256 = (Get-FileHash -LiteralPath $installer.FullName).Hash.ToLowerInvariant()
    bytes = $installer.Length
    signature = (Get-AuthenticodeSignature -LiteralPath $installer.FullName).Status.ToString()
}
$failures = [System.Collections.Generic.List[System.Exception]]::new()
try {
    if ($receipt.signature -ne 'NotSigned') { throw 'Expected an unsigned development installer.' }
    $install = Start-Process -FilePath $installer.FullName -ArgumentList @('/S','/currentuser',"/D=$installDir") -Wait -PassThru -WindowStyle Hidden
    $receipt.installExit = $install.ExitCode
    if ($install.ExitCode -ne 0) { throw "Installer exited $($install.ExitCode)." }
    $app = Get-Item -LiteralPath (Join-Path $installDir 'Open Product Studio (Beta).exe')
    $receipt.installedExecutableSha256 = (Get-FileHash -LiteralPath $app.FullName).Hash.ToLowerInvariant()
    $registered = (Get-Item -LiteralPath "$protocol\shell\open\command").GetValue('')
    if (-not $registered.StartsWith(('"'+$app.FullName+'"'),[StringComparison]::OrdinalIgnoreCase) -or -not $registered.Contains('"%1"')) {
        throw 'Installed URL handler does not target this Studio executable and its URL argument.'
    }
    $receipt.installedProtocol = 'open-product-studio'
    if (Test-Path -LiteralPath (Join-Path $installDir 'resources/app-update.yml')) { throw 'Unexpected update feed in development package.' }
    node scripts/smoke-studio-windows-app.cjs $repo $app.FullName $evidence $testUser $env:CANDIDATE_SHA
    $receipt.startupExit = $LASTEXITCODE
    if ($LASTEXITCODE -ne 0) { throw 'Installed application startup or restart did not pass.' }
} catch {
    $failures.Add($_.Exception)
}
try {
    $uninstallers = @(Get-ChildItem -LiteralPath $installDir -File -Filter 'Uninstall*.exe' -ErrorAction SilentlyContinue)
    if ($uninstallers.Count -eq 1) {
        $uninstall = Start-Process -FilePath $uninstallers[0].FullName -ArgumentList @('/S','/currentuser') -Wait -PassThru -WindowStyle Hidden
        $receipt.uninstallExit = $uninstall.ExitCode
        $deadline = [DateTime]::UtcNow.AddMinutes(2)
        while ((Test-Path -LiteralPath $installDir) -and ([DateTime]::UtcNow -lt $deadline)) { Start-Sleep -Seconds 1 }
    }
} catch {
    $failures.Add($_.Exception)
}
try {
    $receipt.installationRemoved = -not (Test-Path -LiteralPath $installDir)
    $receipt.protocolRemoved = -not (Test-Path -LiteralPath $protocol)
    $receipt.userPathUnchanged = $userPath -ceq [Environment]::GetEnvironmentVariable('Path','User')
    $receipt | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $evidence 'installer.json') -Encoding utf8
} catch {
    $failures.Add($_.Exception)
}
if ($failures.Count -gt 0) {
    throw [AggregateException]::new('Windows qualification failed.', $failures.ToArray())
}
if ($receipt.uninstallExit -ne 0 -or -not $receipt.installationRemoved -or -not $receipt.protocolRemoved -or -not $receipt.userPathUnchanged) {
    throw 'Installation cleanup, protocol cleanup or original user PATH verification failed.'
}
if ((Get-FileHash -LiteralPath $installer.FullName).Hash.ToLowerInvariant() -cne $receipt.sha256) {
    throw 'Installer changed after qualification.'
}
"installer=$($installer.FullName)" | Out-File -FilePath $env:GITHUB_OUTPUT -Encoding utf8 -Append
Write-Host "Qualified $($installer.Name) SHA-256 $($receipt.sha256) at $env:CANDIDATE_SHA."
