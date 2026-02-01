# Backend Dockerfile

# Этап 1: Сборка (Build)
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем файлы зависимостей
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Устанавливаем зависимости (включая dev для сборки)
RUN npm ci

# Копируем исходный код
COPY . .

# Генерируем Prisma клиент и собираем TypeScript
RUN npx prisma generate
RUN npm run build

# Этап 2: Запуск (Production)
FROM node:18-alpine AS runner

WORKDIR /app

# Устанавливаем только production зависимости
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Копируем собранные файлы из этапа builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
# Копируем скрипты
COPY --from=builder /app/scripts ./scripts

# Создаем папку для загрузок
RUN mkdir -p uploads

# Переменные окружения (будут переданы через docker-compose)
ENV NODE_ENV=production

# Открываем порт (по умолчанию 4000)
EXPOSE 4000

# Команда запуска (миграции + сервер)
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
