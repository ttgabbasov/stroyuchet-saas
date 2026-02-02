// ============================================
// Server Entry Point
// ============================================

import app from './app.js';
import { prisma } from './lib/prisma.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';

async function main() {
  try {
    const PORT = env.PORT;

    // Проверяем подключение к БД
    await prisma.$connect();
    logger.info('Database connected');

    // Инициализируем уведомления
    const { initPushHandlers } = await import('./modules/notifications/push-handlers.js');
    initPushHandlers();

    // Запускаем сервер
    app.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });

    // Запускаем Telegram Бот (если есть токен)
    const { TelegramBotService } = await import('./modules/telegram/index.js');
    const botService = TelegramBotService.getInstance();
    if (botService) {
      await botService.start();
    }
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down...`);

  // Stop Telegram Bot
  const { TelegramBotService } = await import('./modules/telegram/index.js');
  const botService = TelegramBotService.getInstance();
  if (botService) {
    botService.stop(signal);
  }

  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main();
