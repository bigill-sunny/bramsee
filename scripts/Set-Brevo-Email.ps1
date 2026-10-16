$ErrorActionPreference = 'Stop'
$bramRoot = Split-Path $PSScriptRoot -Parent
$bramConfig = Join-Path $bramRoot 'dist/server/wrangler.json'
if (!(Test-Path -LiteralPath $bramConfig)) { throw 'Build and deploy Bramsee first with npm run deploy:cloudflare.' }
$bramSettings = Get-Content -LiteralPath $bramConfig -Raw | ConvertFrom-Json
if ($bramSettings.name -ne 'bramsee') { throw 'Expected the bramsee Worker. No settings were uploaded.' }
Write-Host 'This connects the deployed bramsee Worker to Brevo. It does not send a test email.'
Write-Host 'First verify your sender email address in Brevo and enable transactional sending.'
$bramSender = (Read-Host 'Verified sender email address').Trim()
if ($bramSender -notmatch '^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$') { throw 'Enter only the verified email address.' }
$bramOrigin = Read-Host 'App address [https://bramsee.bigill.workers.dev]'
if ([string]::IsNullOrWhiteSpace($bramOrigin)) { $bramOrigin = 'https://bramsee.bigill.workers.dev' }
$bramUri = $null
if (![Uri]::TryCreate($bramOrigin.Trim(), [UriKind]::Absolute, [ref]$bramUri) -or $bramUri.Scheme -ne 'https' -or $bramUri.AbsolutePath -ne '/' -or $bramUri.UserInfo -or $bramUri.Query -or $bramUri.Fragment) { throw 'Enter the HTTPS app origin only, with no path or query.' }
$bramSecret = Read-Host 'Brevo API key (hidden; not the SMTP password)' -AsSecureString
$bramPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($bramSecret)
$bramEncoding = $OutputEncoding
try {
    $bramKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bramPointer).Trim()
    if ($bramKey.Length -lt 20 -or $bramKey -match '\s') { throw 'That does not look like an API key. No settings were uploaded.' }
    $bramPayload = @{ EMAIL_PROVIDER='brevo'; BREVO_API_KEY=$bramKey; EMAIL_FROM=$bramSender; APP_ORIGIN=$bramUri.GetLeftPart([UriPartial]::Authority) } | ConvertTo-Json -Compress
    $OutputEncoding = New-Object Text.UTF8Encoding($false)
    Push-Location $bramRoot
    try {
        # Pass secrets through stdin, never command arguments or a saved file.
        $bramPayload | & node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js secret bulk --config dist/server/wrangler.json
        if ($LASTEXITCODE -ne 0) { throw 'Cloudflare did not confirm the settings. Check the error above, then retry.' }
    } finally { Pop-Location }
    Write-Host 'Email settings uploaded. Refresh Bramsee, then test Verify email with your own account.'
} finally {
    $OutputEncoding = $bramEncoding
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bramPointer)
    $bramKey = $null
    $bramPayload = $null
    $bramSecret.Dispose()
}
