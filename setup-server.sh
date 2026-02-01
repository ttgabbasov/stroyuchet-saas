#!/bin/bash

# StroyUchet VPS Setup Script
# Run this on your fresh Ubuntu/Debian server

echo "🚀 Запуск настройки сервера StroyUchet..."

# 1. Обновление системы
echo "📦 Обновление системных пакетов..."
sudo apt update && sudo apt upgrade -y

# 2. Установка Docker
if ! command -v docker &> /dev/null; then
    echo "🐳 Установка Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker установлен."
else
    echo "✅ Docker уже установлен."
fi

# 2.1. Configure Swap (prevent OOM kills on cheap VPS)
if [ ! -f /swapfile ]; then
    echo "💾 Настройка Swap (2GB) для стабильности..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "✅ Swap файл создан."
else
    echo "✅ Swap файл уже существует."
fi

# 3. Создание директории проекта
echo "📂 Создание папки проекта..."
mkdir -p ~/stroyuchet
cd ~/stroyuchet

echo "
🎉 Сервер готов к работе!
Следующие шаги:
1. Скопируйте файлы вашего проекта в эту папку (или используйте git clone).
   (Вы можете использовать FileZilla или SCP для копирования файлов локально в папку: ~/stroyuchet)
2. Создайте файл .env с вашими секретными ключами.
3. Запустите 'docker compose up -d --build'
"
