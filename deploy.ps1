# Deployment Script
$commitMsg = Read-Host -Prompt 'Enter commit message (default: "deploy: hotfix")'
if ([string]::IsNullOrWhiteSpace($commitMsg)) { $commitMsg = "deploy: hotfix" }

Write-Host "--- 1. Git Add ---" -ForegroundColor Cyan
git add .

Write-Host "--- 2. Git Commit ---" -ForegroundColor Cyan
git commit -m $commitMsg

Write-Host "--- 3. Git Push ---" -ForegroundColor Cyan
git push

Write-Host "--- 4. Server Update ---" -ForegroundColor Cyan
Write-Host "NOTE: Please enter your server password if requested." -ForegroundColor Yellow
ssh root@31.129.97.194 "cd ~/stroyuchet && git pull && docker compose up -d --build"

Write-Host "--- DONE! 🚀 ---" -ForegroundColor Green
