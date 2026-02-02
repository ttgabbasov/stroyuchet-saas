# Скрипт настройки SSH ключей
$ErrorActionPreference = "Stop"

$keyPath = "$env:USERPROFILE\.ssh\id_ed25519"
$pubKeyPath = "$keyPath.pub"

Write-Host "--- Настройка SSH доступа ---" -ForegroundColor Cyan

# 1. Проверка и создание ключа
if (-not (Test-Path $keyPath)) {
    Write-Host "1. Генерирую новый SSH ключ..." -ForegroundColor Yellow
    # Создаем директорию .ssh если нет
    if (-not (Test-Path "$env:USERPROFILE\.ssh")) {
        New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.ssh" | Out-Null
    }
    ssh-keygen -t ed25519 -f $keyPath -N ""
    Write-Host "Ключ создан!" -ForegroundColor Green
}
else {
    Write-Host "1. Ключ уже существует, используем его." -ForegroundColor Green
}

# 2. Копирование на сервер
Write-Host "`n2. Отправляю ключ на сервер..." -ForegroundColor Yellow
Write-Host "ВАЖНО: Сейчас вас попросят ввести пароль от сервера в последний раз." -ForegroundColor Gray

try {
    $pubKey = Get-Content $pubKeyPath
    # Используем ssh для добавления ключа
    ssh root@31.129.97.194 "mkdir -p ~/.ssh && echo '$pubKey' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh"
    
    Write-Host "`nУСПЕХ! Ключ добавлен." -ForegroundColor Green
    Write-Host "Теперь попробуйте войти: ssh root@31.129.97.194" -ForegroundColor Cyan
}
catch {
    Write-Host "`nОШИБКА: Не удалось скопировать ключ. Проверьте пароль и доступность сервера." -ForegroundColor Red
    Write-Error $_
}
