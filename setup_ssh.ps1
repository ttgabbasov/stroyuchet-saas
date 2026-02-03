# SSH Key Setup Script (Robust)
$ErrorActionPreference = "Stop"

$sshDir = "$env:USERPROFILE\.ssh"
$keyPath = "$sshDir\id_ed25519"
$pubKeyPath = "$keyPath.pub"

Write-Host "--- SSH Setup v2 ---" -ForegroundColor Cyan

# 0. Check SSH availability
if (-not (Get-Command ssh-keygen -ErrorAction SilentlyContinue)) {
    Write-Error "ssh-keygen command not found. Please install OpenSSH Client."
}

# 1. Cleanup Incomplete Keys
# If private exists but public missing (or vice versa), remove private to force regeneration
if ((Test-Path $keyPath) -and (-not (Test-Path $pubKeyPath))) {
    Write-Host "Found partial key files. Cleaning up..." -ForegroundColor Yellow
    Remove-Item $keyPath -Force
}

# 2. Check/Create Key
if (-not (Test-Path $keyPath)) {
    Write-Host "1. Generating new SSH key..." -ForegroundColor Yellow
    
    # Create .ssh directory if missing
    if (-not (Test-Path $sshDir)) {
        New-Item -ItemType Directory -Force -Path $sshDir | Out-Null
    }

    # Run keygen
    # We use cmd /c to ensure it runs correctly if it's a batch wrapper
    $process = Start-Process -FilePath "ssh-keygen" -ArgumentList "-t ed25519 -f `"$keyPath`" -N `"`"" -Wait -NoNewWindow -PassThru
    
    if ($process.ExitCode -ne 0) {
        Write-Error "ssh-keygen failed with exit code $($process.ExitCode)"
    }

    if (-not (Test-Path $pubKeyPath)) {
        Write-Error "Key generation finished but public key $pubKeyPath was not found!"
    }

    Write-Host "Key generated successfully!" -ForegroundColor Green
}
else {
    Write-Host "1. Key already exists." -ForegroundColor Green
}

# 3. Copy to Server
Write-Host "`n2. Sending key to server..." -ForegroundColor Yellow
Write-Host "IMPORTANT: You will be asked for the server password ONE LAST TIME." -ForegroundColor Gray
Write-Host "Server IP: 31.129.97.194" -ForegroundColor Gray

try {
    if (-not (Test-Path $pubKeyPath)) {
        throw "Public key file not found at: $pubKeyPath"
    }

    $pubKey = Get-Content $pubKeyPath -Raw
    if ([string]::IsNullOrWhiteSpace($pubKey)) {
        throw "Public key file is empty!"
    }
    
    # Clean up the key content (remove newlines)
    $pubKey = $pubKey.Trim()

    # Use ssh to append key to authorized_keys
    # We use a simple command to append the key
    $remoteCmd = "mkdir -p ~/.ssh && echo '$pubKey' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh"
    
    ssh root@31.129.97.194 $remoteCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nSUCCESS! Key added." -ForegroundColor Green
        Write-Host "Try logging in: ssh root@31.129.97.194" -ForegroundColor Cyan
    }
    else {
        Write-Error "SSH command failed. Check your password."
    }
}
catch {
    Write-Host "`nERROR during copy:" -ForegroundColor Red
    Write-Error $_
}
