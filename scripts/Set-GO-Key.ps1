$ErrorActionPreference = 'Stop'
$bramRoot = Split-Path $PSScriptRoot -Parent
$bramFile = Join-Path $bramRoot '.dev.vars'
Write-Host 'Paste your Metrolinx GO key below. The key is hidden while you enter it.'
$bramSecret = Read-Host 'GO API key' -AsSecureString
$bramPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($bramSecret)
try {
    $bramKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bramPointer).Trim()
    if ($bramKey -notmatch '^[A-Za-z0-9._=-]{20,512}$') { throw 'That does not look like an API key. No changes were made.' }
    $bramLines = if (Test-Path -LiteralPath $bramFile) { @(Get-Content -LiteralPath $bramFile | Where-Object { $_ -notmatch '^\s*GO_API_KEY\s*=' }) } else { @() }
    $bramLines += 'GO_API_KEY="' + $bramKey + '"'
    [IO.File]::WriteAllLines($bramFile, $bramLines, (New-Object Text.UTF8Encoding($false)))
    Write-Host 'Key saved privately in .dev.vars. Restart Bramsee, then request GO live data directions.'
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bramPointer)
    $bramKey = $null
    $bramSecret.Dispose()
}
