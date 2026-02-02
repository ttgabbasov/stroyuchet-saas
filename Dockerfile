# Backend Dockerfile

# Этап 1: Сборка (Build)
FROM node:18-alpine AS builder

# Устанавливаем необходимые зависимости для Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Копируем файлы зависимостей
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Устанавливаем зависимости (включая dev для сборки)
RUN npm install

# Копируем исходный код
COPY . .

# Генерируем Prisma клиент и собираем TypeScript
RUN npx prisma generate
RUN npm run build

# Этап 2: Запуск (Production)
FROM node:18-alpine AS runner

# Устанавливаем зависимости для работы Prisma в рантайме
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Устанавливаем только production зависимости
RUN npm install --omit=dev

# Копируем собранные файлы из этапа builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Генерируем Prisma клиент для продакшена
RUN npx prisma generate

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
