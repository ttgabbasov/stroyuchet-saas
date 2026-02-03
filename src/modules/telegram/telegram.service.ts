import { Telegraf, Context, session, Markup } from 'telegraf';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { saveFile } from '../uploads/uploads.service.js';
import { getAnalyticsSummary } from '../transactions/transactions.service.js';
import { getNotifications } from '../notifications/notifications.service.js';
import { extractQRData } from '../../lib/ocr.service.js';
import { eventBus, EVENTS } from '../../lib/events.js';
// import { AiService } from '../ai/ai.service.js'; // Dynamic import used instead
import axios from 'axios';

interface MyContext extends Context {
    user?: any;
    session: {
        lastSystemMessageId?: number;
        historyMessageId?: number;
        editingTransactionId?: string;
        step?: 'AMOUNT' | 'PROJECT' | 'CATEGORY' | 'COMMENT' | 'PHOTO' | 'EDIT_AMOUNT';
        wizardMessageId?: number;
        transactionData?: {
            amountCents?: number;
            projectId?: string;
            categoryId?: string;
            comment?: string;
            type?: 'INCOME' | 'EXPENSE';
            receiptUrl?: string;
        };
        pendingVoiceTx?: {
            amount?: number;
            projectName?: string;
            categoryName?: string;
            comment?: string;
            type?: 'INCOME' | 'EXPENSE';
        };
    };
}

export class TelegramBotService {
    private bot: Telegraf<MyContext>;
    private static instance: TelegramBotService;
    private botInfo: any = null;

    // Simple in-memory rate limiter: userId -> { count, windowStart }
    private voiceRateLimits: Map<string, { count: number; windowStart: number }> = new Map();
    private readonly VOICE_LIMIT_MAX = 10;
    private readonly VOICE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

    private checkVoiceLimit(userId: string): boolean {
        const now = Date.now();
        const record = this.voiceRateLimits.get(userId);

        if (!record) {
            this.voiceRateLimits.set(userId, { count: 1, windowStart: now });
            return true;
        }

        if (now - record.windowStart > this.VOICE_LIMIT_WINDOW) {
            // Window expired, reset
            this.voiceRateLimits.set(userId, { count: 1, windowStart: now });
            return true;
        }

        if (record.count >= this.VOICE_LIMIT_MAX) {
            return false;
        }

        record.count++;
        return true;
    }

    private constructor() {
        const token = env.TELEGRAM_BOT_TOKEN;
        if (!token) {
            throw new Error('TELEGRAM_BOT_TOKEN is not defined');
        }
        this.bot = new Telegraf<MyContext>(token);
        this.bot.use(session());
        this.setupHandlers();
        this.setupEventListeners();
    }

    public static getInstance(): TelegramBotService | null {
        if (!env.TELEGRAM_BOT_TOKEN) return null;
        if (!TelegramBotService.instance) {
            TelegramBotService.instance = new TelegramBotService();
        }
        return TelegramBotService.instance;
    }

    private async safeEditOrReply(ctx: MyContext, text: string, extra: any = {}) {
        if (!ctx.session) (ctx as any).session = {};

        const messageId = ctx.session.wizardMessageId || ctx.session.lastSystemMessageId;
        const options = { parse_mode: 'HTML' as const, ...extra };

        try {
            if (messageId) {
                const msg = await ctx.telegram.editMessageText(ctx.chat!.id, messageId, undefined, text, options);
                ctx.session.lastSystemMessageId = (msg as any).message_id || messageId;
            } else {
                const msg = await ctx.reply(text, options);
                ctx.session.lastSystemMessageId = msg.message_id;
            }
        } catch (error) {
            // If editing fails (e.g. message too old or same content), try deleting and replying
            if (messageId) {
                try { await ctx.telegram.deleteMessage(ctx.chat!.id, messageId); } catch (e) { }
            }
            try {
                const msg = await ctx.reply(text, options);
                ctx.session.lastSystemMessageId = msg.message_id;
            } catch (replyError) {
                logger.error('Critical error in safeEditOrReply', { error: replyError });
            }
        }
    }

    private getMainMenu() {
        const buttons = [
            ['💸 Внести расход'],
            ['💰 Доход', '📊 Отчеты'],
            ['🏦 Баланс', '🕒 История']
        ];

        return Markup.keyboard(buttons).resize().placeholder('Выберите действие...');
    }

    private async cleanupActiveWizard(ctx: MyContext) {
        if (ctx.session?.wizardMessageId) {
            try {
                await ctx.telegram.deleteMessage(ctx.chat!.id, ctx.session.wizardMessageId);
                ctx.session.wizardMessageId = undefined;
            } catch (e) { }
        }
        if (ctx.session?.lastSystemMessageId) {
            try {
                await ctx.telegram.deleteMessage(ctx.chat!.id, ctx.session.lastSystemMessageId);
                ctx.session.lastSystemMessageId = undefined;
            } catch (e) { }
        }
    }

    public async sendNotification(telegramId: string, message: string) {
        try {
            await this.bot.telegram.sendMessage(telegramId, message, { parse_mode: 'HTML' });
        } catch (error) {
            logger.error('Failed to send Telegram notification', { telegramId, error });
        }
    }

    private setupEventListeners() {
        // Слушаем создание новых транзакций для алертов
        eventBus.on(EVENTS.TRANSACTION.CREATED, async (tx: any) => {
            try {
                // 1. Уведомление о КРУПНОМ расходе (> 10 000 руб) для OWNER
                if (tx.type === 'EXPENSE' && tx.amountCents >= 1000000) {
                    const owners = await prisma.user.findMany({
                        where: {
                            companyId: tx.project?.companyId || tx.moneySource?.companyId,
                            role: 'OWNER',
                            telegramId: { not: null }
                        }
                    });

                    const message =
                        `⚠️ <b>Крупный расход!</b>\n\n` +
                        `💰 Сумма: <b>${(tx.amountCents / 100).toLocaleString('ru-RU')} ₽</b>\n` +
                        `🏗 Объект: <b>${tx.project?.name || '---'}</b>\n` +
                        `👤 Внес: <b>${tx.createdBy?.name || '---'}</b>\n` +
                        `📝 Комм: <i>${tx.comment || '---'}</i>`;

                    for (const owner of owners) {
                        await this.sendNotification(owner.telegramId!, message);
                    }
                }
            } catch (error) {
                logger.error('Error in Telegram TRANSACTION.CREATED listener', { error });
            }
        });

        // 2. Уведомление о пополнении ПОДОТЧЁТА для получателя (Foreman)
        eventBus.on(EVENTS.ADVANCE.REFILLED, async (tx: any) => {
            try {
                if (tx.payoutUser?.id) {
                    const recipient = await prisma.user.findUnique({
                        where: { id: tx.payoutUser.id },
                        select: { telegramId: true }
                    });

                    if (recipient?.telegramId) {
                        const message =
                            `💳 <b>Пополнение подотчёта</b>\n\n` +
                            `Вам перечислено: <b>${(tx.amountCents / 100).toLocaleString('ru-RU')} ₽</b>\n` +
                            `💰 Касса: <b>${tx.toMoneySource?.name || '---'}</b>`;

                        await this.sendNotification(recipient.telegramId, message);
                    }
                }
            } catch (error) {
                logger.error('Error in Telegram ADVANCE.REFILLED listener', { error });
            }
        });
    }

    private setupHandlers() {
        // Global middleware to check for a linked user for protected actions
        this.bot.use(async (ctx, next) => {
            const text = (ctx.message as any)?.text || '';
            const payload = (ctx as any).startPayload;

            // 1. Always allow /start (with/without payload), /help, and help buttons
            const isPublicCommand = text.startsWith('/start') || text.startsWith('/help');
            const isPublicButton = text === '🆘 Помощь';

            if (isPublicCommand || isPublicButton || payload) {
                return next();
            }

            // 2. Check for linked user for everything else
            const user = await this.getUser(ctx);
            if (!user) {
                return this.replyNotLinked(ctx);
            }

            // Store user in context to avoid redundant DB calls
            ctx.user = user;
            return next();
        });

        // start command
        this.bot.start(async (ctx) => {
            const payload = (ctx as any).startPayload;
            if (payload) {
                await this.handleLinking(ctx, payload);
                return;
            }

            const user = await this.getUser(ctx);
            if (user) {
                await this.cleanupActiveWizard(ctx);
                const msg = await ctx.reply(
                    `👋 <b>С возвращением, ${user.name}!</b>\nИспользуйте кнопки меню для работы.`,
                    { parse_mode: 'HTML', ...this.getMainMenu() }
                );
                ctx.session.lastSystemMessageId = msg.message_id;
                return;
            }

            await ctx.reply(
                '👋 <b>Добро пожаловать в СтройУчёт!</b>\n\n' +
                'Я помогу вам быстро вносить расходы, загружать чеки и получать уведомления прямо в Telegram.\n\n' +
                'Чтобы начать работу, вам нужно <b>привязать свой аккаунт</b>:\n' +
                '1. Откройте сайт <a href="https://tgabbasov.store/settings/telegram">tgabbasov.store</a>\n' +
                '2. Перейдите в <b>Настройки → Telegram Бот</b>\n' +
                '3. Нажмите кнопку <b>«Привязать Telegram»</b>\n\n' +
                'После этого бот автоматически узнает вас и откроет доступ к функциям.',
                { parse_mode: 'HTML' }
            );
        });

        // Main Menu Button Handlers
        this.bot.hears(['➕ Добавить расход', '💸 Внести расход'], async (ctx) => {
            try { await ctx.deleteMessage(); } catch (e) { }
            await this.cleanupActiveWizard(ctx);
            await this.handleStartAdd(ctx, 'EXPENSE');
        });

        this.bot.hears('💰 Доход', async (ctx) => {
            try { await ctx.deleteMessage(); } catch (e) { }
            await this.cleanupActiveWizard(ctx);
            await this.handleStartAdd(ctx, 'INCOME');
        });

        this.bot.hears('📊 Отчеты', async (ctx) => {
            try { await ctx.deleteMessage(); } catch (e) { }
            await this.cleanupActiveWizard(ctx);
            await this.renderReportsMenu(ctx);
        });

        this.bot.hears('⚠️ Алерты', async (ctx) => {
            try { await ctx.deleteMessage(); } catch (e) { }
            await this.handleAlertsCommand(ctx);
        });

        this.bot.hears('🏦 Баланс', async (ctx) => {
            try { await ctx.deleteMessage(); } catch (e) { }
            await this.cleanupActiveWizard(ctx);
            await this.handleBalanceCommand(ctx);
        });

        this.bot.hears('🕒 История', async (ctx) => {
            try { await ctx.deleteMessage(); } catch (e) { }
            await this.cleanupActiveWizard(ctx);
            await this.handleHistoryCommand(ctx);
        });

        this.bot.hears('🆘 Помощь', async (ctx) => {
            try { await ctx.deleteMessage(); } catch (e) { }
            await this.handleHelpCommand(ctx);
        });

        // Alerts command
        this.bot.command('alerts', async (ctx) => {
            try { await ctx.deleteMessage(); } catch (e) { }
            await this.handleAlertsCommand(ctx);
        });

        // Help command
        this.bot.command('help', async (ctx) => {
            try { await ctx.deleteMessage(); } catch (e) { }
            await this.handleHelpCommand(ctx);
        });

        // Add command
        this.bot.command('add', async (ctx) => {
            try { await ctx.deleteMessage(); } catch (e) { }
            await this.cleanupActiveWizard(ctx);
            await this.handleStartAdd(ctx, 'EXPENSE');
        });

        // Menu command to force show buttons
        this.bot.command('menu', async (ctx) => {
            try { await ctx.deleteMessage(); } catch (e) { }
            await this.cleanupActiveWizard(ctx);
            const msg = await ctx.reply('📱 Главное меню:', this.getMainMenu());
            ctx.session.lastSystemMessageId = msg.message_id;
        });

        this.bot.command('balance', async (ctx) => {
            try { await ctx.deleteMessage(); } catch (e) { }
            await this.cleanupActiveWizard(ctx);
            await this.handleBalanceCommand(ctx);
        });

        this.bot.command('history', async (ctx) => {
            try { await ctx.deleteMessage(); } catch (e) { }
            await this.cleanupActiveWizard(ctx);
            await this.handleHistoryCommand(ctx);
        });




        // Cancel command
        this.bot.command('cancel', async (ctx) => {
            try { await ctx.deleteMessage(); } catch (e) { }
            await this.cleanupActiveWizard(ctx);
            ctx.session.step = undefined;
            ctx.session.transactionData = {};
            ctx.session.editingTransactionId = undefined;
            await this.safeEditOrReply(ctx, '❌ Операция отменена.', this.getMainMenu());
        });

        // Photo handler
        this.bot.on('photo', async (ctx) => {
            const step = ctx.session?.step;
            if (step !== 'PHOTO') return;

            try {
                const user = await this.getUser(ctx);
                if (!user) {
                    await ctx.reply('❌ Ошибка: Ссылка устарела.');
                    return;
                }
                const photo = ctx.message.photo.pop();
                if (!photo) return;

                await this.safeEditOrReply(ctx, '⏳ <i>Загружаю фото...</i>');
                const fileLink = await this.bot.telegram.getFileLink(photo.file_id);
                const response = await axios.get(fileLink.toString(), { responseType: 'arraybuffer' });
                const buffer = Buffer.from(response.data);

                const uploadedFile = await saveFile(
                    buffer,
                    `tg_photo_${photo.file_id}.jpg`,
                    'image/jpeg',
                    user.companyId
                );

                // Очищаем старое сообщение визарда, чтобы новое появилось ПОД фото
                if (ctx.session.wizardMessageId) {
                    try { await ctx.telegram.deleteMessage(ctx.chat!.id, ctx.session.wizardMessageId); } catch (e) { }
                    ctx.session.wizardMessageId = undefined;
                }

                ctx.session.transactionData!.receiptUrl = uploadedFile.url;

                // --- НОВОЕ: Попытка сканирования QR-кода ---
                try {
                    const qrData = await extractQRData(buffer);
                    if (qrData && qrData.amountCents) {
                        ctx.session.transactionData!.amountCents = qrData.amountCents;
                        // Переходим к шагу подтверждения суммы
                        await this.renderAmountStep(ctx, true);
                        return;
                    }
                } catch (qrErr) {
                    logger.warn('Scan QR failed (non-critical)', { error: qrErr });
                }
                // ------------------------------------------

                await this.renderAmountStep(ctx);
            } catch (error) {
                logger.error('Error handling photo', { error });
                await this.safeEditOrReply(ctx, '❌ Ошибка загрузки. Попробуйте /skip.');
            }
        });

        // Voice handler
        this.bot.on('voice', async (ctx) => {
            const user = await this.getUser(ctx);
            if (!user) return this.replyNotLinked(ctx);

            // --- RATE LIMIT CHECK ---
            if (!this.checkVoiceLimit(user.id)) {
                await this.safeEditOrReply(ctx, '⚠️ <b>Лимит исчерпан.</b>\nВы отправили слишком много голосовых сообщений. Попробуйте через час.');
                return;
            }
            // ------------------------

            if (!env.GOOGLE_API_KEY) {
                await this.safeEditOrReply(ctx, '🎤 <b>Голосовой ввод недоступен.</b>\n\nНе настроен ключ API (GOOGLE_API_KEY). Обратитесь к администратору.');
                return;
            }

            try {
                await this.safeEditOrReply(ctx, '🤖 <i>ИИ слушает и анализирует...</i>');

                const voice = ctx.message.voice;
                const fileLink = await this.bot.telegram.getFileLink(voice.file_id);
                const response = await axios.get(fileLink.toString(), { responseType: 'arraybuffer' });
                const buffer = Buffer.from(response.data);

                // Need projects and categories for context
                const projects = await prisma.project.findMany({
                    where: { companyId: user.companyId, status: 'ACTIVE' },
                    select: { name: true }
                });
                const categories = await prisma.category.findMany({
                    where: {
                        OR: [{ companyId: user.companyId }, { isSystem: true }],
                        allowedTypes: { has: 'EXPENSE' }
                    }, // Optimize query
                    select: { name: true }
                });

                const { AiService } = await import('../ai/ai.service.js');
                const result = await AiService.processVoiceTransaction(
                    buffer,
                    'audio/ogg',
                    {
                        projects: projects.map(p => p.name),
                        categories: categories.map(c => c.name)
                    }
                );

                ctx.session.pendingVoiceTx = result;
                await this.renderVoiceConfirmation(ctx);
            } catch (error: any) {
                logger.error('Voice processing error', { error: error.message, stack: error.stack });

                let userMessage = '❌ Не удалось распознать голос. Попробуйте еще раз.';

                // Show more specific error if related to configuration
                if (error.message?.includes('GOOGLE_API_KEY')) {
                    userMessage = '❌ Ошибка настройки ИИ (нет API ключа). Обратитесь к админу.';
                } else if (error.message?.includes('400')) {
                    userMessage = '❌ Ошибка формата аудио или запроса к ИИ (возможно, регион не поддерживается).';
                }

                await this.safeEditOrReply(ctx, userMessage);
            }
        });

        // Text handler
        this.bot.on('text', async (ctx) => {
            const step = ctx.session?.step;
            if (!step) return;

            // Delete user input message to keep chat clean
            try { await ctx.deleteMessage(); } catch (e) { }

            const text = (ctx.message as any).text;

            if (step === 'EDIT_AMOUNT') {
                const amount = parseFloat(text.replace(',', '.'));
                if (isNaN(amount) || amount <= 0) {
                    await ctx.reply('❌ Пожалуйста, введите корректное положительное число для суммы.');
                    return;
                }

                try {
                    const txId = ctx.session.editingTransactionId;
                    const user = await this.getUser(ctx);
                    if (txId && user) {
                        const { updateTransaction } = await import('../transactions/transactions.service.js');
                        await updateTransaction(txId, user.id, user.role, user.companyId, { amountCents: Math.round(amount * 100) });
                        await ctx.reply(`✅ Сумма успешно изменена на <b>${amount.toLocaleString('ru-RU')} ₽</b>`, { parse_mode: 'HTML' });

                        // Clear editing state and show updated details
                        ctx.session.step = undefined;
                        ctx.session.editingTransactionId = undefined;
                        await this.handleViewTransactionDetails(ctx, txId);
                    }
                } catch (error) {
                    logger.error('Error editing amount', { error });
                    await this.safeEditOrReply(ctx, '❌ Ошибка при изменении суммы.');
                }
                return;
            }

            if (step === 'AMOUNT') {
                const amount = parseFloat(text.replace(',', '.'));
                if (isNaN(amount) || amount <= 0) {
                    await this.safeEditOrReply(ctx, '❌ <b>Неверная сумма</b>\n\nВведите число (например: 1500):');
                    return;
                }
                ctx.session.transactionData!.amountCents = Math.round(amount * 100);
                await this.renderProjectStep(ctx);
            } else if (step === 'COMMENT') {
                ctx.session.transactionData!.comment = text;
                await this.finishTransaction(ctx);
            }
        });

        // Callbacks
        this.bot.on('callback_query', async (ctx) => {
            const data = (ctx.callbackQuery as any).data;
            if (!ctx.session) (ctx as any).session = {};
            const step = ctx.session.step;

            if (data === 'cancel_wiz') {
                ctx.session.step = undefined;
                ctx.session.transactionData = undefined;
                ctx.session.editingTransactionId = undefined;
                ctx.session.wizardMessageId = undefined;
                await ctx.editMessageText('❌ Операция отменена.');
                await ctx.reply('📱 Возврат в меню:', this.getMainMenu());
                await ctx.answerCbQuery();
                return;
            }

            if (data === 'back_wiz') {
                if (step === 'AMOUNT') await this.renderPhotoStep(ctx);
                else if (step === 'PROJECT') await this.renderAmountStep(ctx);
                else if (step === 'CATEGORY') await this.renderProjectStep(ctx);
                else if (step === 'COMMENT') await this.renderCategoryStep(ctx);
                await ctx.answerCbQuery();
                return;
            }



            if (data === 'voice_confirm') {
                await this.handleVoiceConfirm(ctx);
                await ctx.answerCbQuery();
                return;
            }

            if (data === 'voice_cancel') {
                ctx.session.pendingVoiceTx = undefined;
                await ctx.editMessageText('❌ Операция отменена.');
                await ctx.reply('📱 Возврат в меню:', this.getMainMenu());
                await ctx.answerCbQuery();
                return;
            }

            if (data.startsWith('rep_p_')) {
                const projectId = data.replace('rep_p_', '');
                await this.handleProjectReport(ctx, projectId);
                await ctx.answerCbQuery();
                return;
            }

            if (data === 'skip_step') {
                if (step === 'PHOTO') {
                    await this.renderAmountStep(ctx);
                } else if (step === 'COMMENT') {
                    await this.finishTransaction(ctx);
                }
                await ctx.answerCbQuery();
                return;
            }

            if (data.startsWith('p_') && step === 'PROJECT') {
                ctx.session.transactionData!.projectId = data.replace('p_', '');
                await this.renderCategoryStep(ctx);
            } else if (data.startsWith('c_') && step === 'CATEGORY') {
                ctx.session.transactionData!.categoryId = data.replace('c_', '');
                await this.renderCommentStep(ctx);
            }

            if (data === 'use_qr_amount') {
                await this.renderProjectStep(ctx);
                await ctx.answerCbQuery();
                return;
            }

            if (data.startsWith('hist_view_')) {
                const txId = data.replace('hist_view_', '');
                await this.handleViewTransactionDetails(ctx, txId);
                await ctx.answerCbQuery();
                return;
            }

            if (data.startsWith('hist_del_')) {
                const txId = data.replace('hist_del_', '');
                await this.handleDeleteTransaction(ctx, txId);
                await ctx.answerCbQuery();
                return;
            }

            if (data.startsWith('hist_edit_')) {
                const txId = data.replace('hist_edit_', '');
                ctx.session.editingTransactionId = txId;
                ctx.session.step = 'EDIT_AMOUNT';
                await ctx.reply('✍️ <b>Введите новую сумму операции (числом):</b>', { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Отмена', 'cancel_wiz')]]) });
                await ctx.answerCbQuery();
                return;
            }

            if (data === 'hist_back') {
                await this.handleHistoryCommand(ctx);
                await ctx.answerCbQuery();
                return;
            }

            if (data.startsWith('rep_period_')) {
                const period = data.replace('rep_period_', '');
                await this.handlePeriodReport(ctx, period);
                await ctx.answerCbQuery();
                return;
            }

            if (data === 'rep_month') {
                await this.handleCurrentMonthReport(ctx);
                await ctx.answerCbQuery();
                return;
            }

            if (data === 'rep_projects') {
                await this.handleProjectReportsList(ctx);
                await ctx.answerCbQuery();
                return;
            }

            if (data === 'rep_menu') {
                await this.renderReportsMenu(ctx);
                await ctx.answerCbQuery();
                return;
            }

            await ctx.answerCbQuery();
        });

        // Handle errors
        this.bot.catch((err: any, ctx: Context) => {
            logger.error(`Telegram Bot Error for ${ctx.updateType}`, {
                error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
                update: ctx.update
            });
            this.safeEditOrReply(ctx as any, '❌ Произошла ошибка. Попробуйте написать /cancel и начать заново.');
        });
    }

    // Refresh comment for linter re-evaluation

    private async handleStartAdd(ctx: MyContext, type: 'INCOME' | 'EXPENSE' = 'EXPENSE') {
        const user = await this.getUser(ctx);
        if (!user) {
            await this.replyNotLinked(ctx);
            return;
        }

        if (!ctx.session) (ctx as any).session = {};
        ctx.session.transactionData = { type };
        ctx.session.wizardMessageId = undefined;
        await this.renderPhotoStep(ctx);
    }

    private async renderAmountStep(ctx: MyContext, fromQR: boolean = false) {
        ctx.session.step = 'AMOUNT';

        let text = '<b>[2/5] Сумма</b>\n\nВведите сумму расхода (числом):';
        let buttons = [
            [Markup.button.callback('⬅️ Назад', 'back_wiz')],
            [Markup.button.callback('❌ Отмена', 'cancel_wiz')]
        ];

        if (fromQR && ctx.session.transactionData?.amountCents) {
            const amount = ctx.session.transactionData.amountCents / 100;
            text = `✅ <b>QR-код распознан!</b>\n\n💰 Сумма в чеке: <b>${amount.toLocaleString('ru-RU')} ₽</b>\n\nВы можете использовать её или ввести другую сумму вручную:`;
            buttons.unshift([Markup.button.callback(`✅ Использовать ${amount.toLocaleString('ru-RU')} ₽`, 'use_qr_amount')]);
        }

        await this.safeEditOrReply(ctx, text, Markup.inlineKeyboard(buttons));
    }

    private async renderProjectStep(ctx: MyContext) {
        const user = await this.getUser(ctx);
        if (!user) return;

        const projects = await prisma.project.findMany({
            where: { companyId: user.companyId, status: 'ACTIVE' },
            take: 10
        });

        if (projects.length === 0) {
            ctx.session.step = undefined;
            ctx.session.transactionData = undefined;
            ctx.session.wizardMessageId = undefined;
            await this.safeEditOrReply(ctx, '❌ У вас нет активных проектов.');
            return;
        }

        // Action buttons at the TOP for better visibility
        const buttons = [
            [Markup.button.callback('⬅️ Назад', 'back_wiz')],
            [Markup.button.callback('❌ Отмена', 'cancel_wiz')]
        ];

        for (const p of projects) {
            buttons.push([Markup.button.callback(p.name, `p_${p.id}`)]);
        }

        ctx.session.step = 'PROJECT';
        await this.safeEditOrReply(ctx, '<b>[3/5] Объект</b>\n\nВыберите из списка:', Markup.inlineKeyboard(buttons));
    }

    private async renderCategoryStep(ctx: MyContext) {
        const type = ctx.session.transactionData?.type || 'EXPENSE';
        const categories = await prisma.category.findMany({
            where: { allowedTypes: { has: type } },
            orderBy: { sortOrder: 'asc' },
            take: 12
        });

        const buttons = [
            [Markup.button.callback('⬅️ Назад', 'back_wiz')],
            [Markup.button.callback('❌ Отмена', 'cancel_wiz')]
        ];

        for (const c of categories) {
            buttons.push([Markup.button.callback(`${c.icon} ${c.name}`, `c_${c.id}`)]);
        }

        ctx.session.step = 'CATEGORY';
        await this.safeEditOrReply(ctx, '<b>[4/5] Категория</b>\n\nВыберите тип:', Markup.inlineKeyboard(buttons));
    }

    private async renderPhotoStep(ctx: MyContext) {
        ctx.session.step = 'PHOTO';
        await this.safeEditOrReply(ctx,
            '<b>[1/5] Подтверждение (Чек)</b>\n\n📸 Отправьте фото чека или нажмите «Пропустить» для ручного ввода:',
            Markup.inlineKeyboard([
                [Markup.button.callback('➡️ Пропустить / Ввести сумму', 'skip_step')],
                [Markup.button.callback('❌ Отмена', 'cancel_wiz')]
            ])
        );
    }

    private async renderCommentStep(ctx: MyContext) {
        ctx.session.step = 'COMMENT';
        const hasPhoto = !!ctx.session.transactionData?.receiptUrl;
        await this.safeEditOrReply(ctx,
            `<b>[5/5] Комментарий</b>\n\n${hasPhoto ? '✅ Фото загружено. ' : ''}Добавьте примечание:`,
            Markup.inlineKeyboard([
                [Markup.button.callback('➡️ Пропустить', 'skip_step')],
                [Markup.button.callback('⬅️ Назад', 'back_wiz')],
                [Markup.button.callback('❌ Отмена', 'cancel_wiz')]
            ])
        );
    }

    private async finishTransaction(ctx: MyContext) {
        try {
            const user = await this.getUser(ctx);
            const data = ctx.session.transactionData;
            if (!user || !data) return;

            const source = await prisma.moneySource.findFirst({
                where: { ownerId: user.id, isActive: true }
            });

            if (!source) {
                await this.safeEditOrReply(ctx, '❌ <b>Ошибка:</b> Касса не найдена.');
                ctx.session = {};
                return;
            }

            const project = await prisma.project.findUnique({ where: { id: data.projectId } });
            const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
            const now = new Date();

            await prisma.transaction.create({
                data: {
                    type: data.type || 'EXPENSE',
                    amountCents: data.amountCents!,
                    categoryId: data.categoryId!,
                    projectId: data.projectId!,
                    moneySourceId: source.id,
                    comment: data.comment || 'Из Telegram',
                    date: now,
                    createdById: user.id,
                    receiptUrl: data.receiptUrl,
                    receiptStatus: data.receiptUrl ? 'RECEIPT' : 'NO_RECEIPT'
                }
            });

            const isIncome = data.type === 'INCOME';
            const icon = isIncome ? '📈' : '💸';
            const typeLabel = isIncome ? 'Доход' : 'Расход';
            const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

            const summary =
                `✅ <b>${typeLabel} записан!</b>\n\n` +
                `${isIncome ? '💰' : icon} Сумма: <b>${(data.amountCents! / 100).toLocaleString('ru-RU')} ₽</b>\n` +
                `🏗 Объект: <b>${project?.name || '---'}</b>\n` +
                `🏷 Категория: <b>${category?.icon || ''} ${category?.name || '---'}</b>\n` +
                `🕒 Время: <b>${timeStr}</b>\n` +
                `📝 Комм: <i>${data.comment || '---'}</i>\n` +
                `🖼 Чек: ${data.receiptUrl ? '✅ Загружен' : '❌ Нет'}`;

            await ctx.reply(summary, { parse_mode: 'HTML', ...this.getMainMenu() });

            if (ctx.session.wizardMessageId) {
                try { await ctx.telegram.deleteMessage(ctx.chat!.id, ctx.session.wizardMessageId); } catch (e) { }
            }

            ctx.session.step = undefined;
            ctx.session.transactionData = undefined;
            ctx.session.wizardMessageId = undefined;
        } catch (error) {
            logger.error('Error finishing tx', { error });
            await ctx.reply('❌ Ошибка сохранения данных.');
        }
    }

    private async renderReportsMenu(ctx: MyContext) {
        const buttons = [
            [Markup.button.callback('📅 Этот месяц', 'rep_period_this_month')],
            [Markup.button.callback('📅 Прошлый месяц', 'rep_period_last_month')],
            [Markup.button.callback('📅 Этот квартал', 'rep_period_this_quarter')],
            [Markup.button.callback('📅 Этот год', 'rep_period_this_year')],
            [Markup.button.callback('🏗 По проектам', 'rep_projects')],

            [Markup.button.callback('❌ Закрыть', 'cancel_wiz')]
        ];

        try {
            if (ctx.callbackQuery) {
                await ctx.editMessageText('📊 <b>Выберите тип отчета:</b>', {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard(buttons)
                });
            } else {
                const msg = await ctx.reply('📊 <b>Выберите тип отчета:</b>', {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard(buttons)
                });
                ctx.session.lastSystemMessageId = msg.message_id;
            }
        } catch (error) {
            const msg = await ctx.reply('📊 <b>Выберите тип отчета:</b>', {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard(buttons)
            });
            ctx.session.lastSystemMessageId = msg.message_id;
        }
    }

    private async handlePeriodReport(ctx: MyContext, period: string) {
        const user = await this.getUser(ctx);
        if (!user) return;

        try {
            const {
                getPeriodStats,
                getCurrentMonthDates,
                getLastMonthDates,
                getCurrentQuarterDates,
                getCurrentYearDates
            } = await import('../analytics/index.js');

            let dates: { startDate: Date; endDate: Date };
            let periodLabel: string;

            switch (period) {
                case 'this_month':
                    dates = getCurrentMonthDates();
                    periodLabel = 'Этот месяц';
                    break;
                case 'last_month':
                    dates = getLastMonthDates();
                    periodLabel = 'Прошлый месяц';
                    break;
                case 'this_quarter':
                    dates = getCurrentQuarterDates();
                    periodLabel = 'Этот квартал';
                    break;
                case 'this_year':
                    dates = getCurrentYearDates();
                    periodLabel = 'Этот год';
                    break;
                default:
                    dates = getCurrentMonthDates();
                    periodLabel = 'Этот месяц';
            }

            const stats = await getPeriodStats(user.companyId, dates.startDate, dates.endDate);

            let text = `📊 <b>Отчет: ${periodLabel}</b>\n` +
                `<i>${dates.startDate.toLocaleDateString('ru-RU')} — ${dates.endDate.toLocaleDateString('ru-RU')}</i>\n\n` +
                `📈 Доходы: <b>${(stats.incomeCents / 100).toLocaleString('ru-RU')} ₽</b> (${stats.incomeCount})\n` +
                `💸 Расходы: <b>${(stats.expensesCents / 100).toLocaleString('ru-RU')} ₽</b> (${stats.expenseCount})\n` +
                `💰 Прибыль: <b>${(stats.profitCents / 100).toLocaleString('ru-RU')} ₽</b>\n\n`;

            if (stats.byCategory.length > 0) {
                text += `<b>Топ категорий трат:</b>\n`;
                stats.byCategory.slice(0, 5).forEach(c => {
                    text += `• ${c.categoryName}: <b>${(c.amountCents / 100).toLocaleString('ru-RU')} ₽</b>\n`;
                });
                text += '\n';
            }

            if (stats.byProject && stats.byProject.length > 0) {
                text += `<b>По объектам:</b>\n`;
                stats.byProject.slice(0, 5).forEach(p => {
                    text += `• ${p.projectName}: <b>${(p.profitCents / 100).toLocaleString('ru-RU')} ₽</b>\n`;
                });
            }

            await this.cleanupActiveWizard(ctx);
            const msg = await ctx.reply(text, {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('⬅️ Назад', 'rep_menu')],
                    [Markup.button.callback('❌ Закрыть', 'cancel_wiz')]
                ])
            });
            ctx.session.lastSystemMessageId = msg.message_id;
        } catch (error) {
            logger.error('Period report error', { error });
            await ctx.reply('❌ Ошибка при формировании отчета.');
        }
    }

    private async handleCurrentMonthReport(ctx: MyContext) {
        const user = await this.getUser(ctx);
        if (!user) return;

        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const summary = await getAnalyticsSummary(user.companyId, { dateFrom: firstDay });

        const monthName = now.toLocaleString('ru-RU', { month: 'long' });
        const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

        let text = `📊 <b>Отчет за ${capitalizedMonth}</b>\n\n` +
            `📈 Доход: <b>${(summary.totalIncomeCents / 100).toLocaleString('ru-RU')} ₽</b>\n` +
            `💸 Расход: <b>${(summary.totalExpenseCents / 100).toLocaleString('ru-RU')} ₽</b>\n` +
            `💰 Прибыль: <b>${(summary.profitCents / 100).toLocaleString('ru-RU')} ₽</b> (${Math.round(summary.profitMargin)}%)\n\n`;

        if (summary.byCategory.length > 0) {
            text += `<b>Топ категорий:</b>\n`;
            summary.byCategory.slice(0, 5).forEach(c => {
                text += `• ${c.categoryName}: <b>${(c.totalCents / 100).toLocaleString('ru-RU')} ₽</b>\n`;
            });
        }

        await this.cleanupActiveWizard(ctx);
        const msg = await ctx.reply(text, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Назад', 'rep_menu'), Markup.button.callback('❌ Закрыть', 'cancel_wiz')]])
        });
        ctx.session.lastSystemMessageId = msg.message_id;
    }

    private async handleProjectReportsList(ctx: MyContext) {
        const user = await this.getUser(ctx);
        if (!user) return;

        const projects = await prisma.project.findMany({
            where: { companyId: user.companyId, status: 'ACTIVE' },
            take: 10
        });

        const buttons = [];
        for (let i = 0; i < projects.length; i += 1) {
            buttons.push([Markup.button.callback(projects[i].name, `rep_p_${projects[i].id}`)]);
        }
        buttons.push([Markup.button.callback('⬅️ Назад', 'rep_menu'), Markup.button.callback('❌ Закрыть', 'cancel_wiz')]);

        await this.cleanupActiveWizard(ctx);
        const msg = await ctx.reply('🏗 <b>Выберите объект для отчета:</b>', {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard(buttons)
        });
        ctx.session.lastSystemMessageId = msg.message_id;
    }

    private async handleProjectReport(ctx: MyContext, projectId: string) {
        const user = await this.getUser(ctx);
        if (!user) return;

        const project = await prisma.project.findUnique({ where: { id: projectId } });
        const summary = await getAnalyticsSummary(user.companyId, { projectId });

        let text = `🏗 <b>Объект: ${project?.name}</b>\n` +
            `<i>Статистика за всё время</i>\n\n` +
            `📈 Всего доход: <b>${(summary.totalIncomeCents / 100).toLocaleString('ru-RU')} ₽</b>\n` +
            `💸 Всего расход: <b>${(summary.totalExpenseCents / 100).toLocaleString('ru-RU')} ₽</b>\n` +
            `💰 Баланс: <b>${(summary.profitCents / 100).toLocaleString('ru-RU')} ₽</b>\n\n`;

        if (summary.byCategory.length > 0) {
            text += `<b>Расходы по категориям:</b>\n`;
            summary.byCategory.slice(0, 7).forEach(c => {
                text += `• ${c.categoryName}: <b>${(c.totalCents / 100).toLocaleString('ru-RU')} ₽</b>\n`;
            });
        }

        await this.cleanupActiveWizard(ctx);
        const msg = await ctx.reply(text, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Назад', 'rep_projects'), Markup.button.callback('❌ Закрыть', 'cancel_wiz')]])
        });
        ctx.session.lastSystemMessageId = msg.message_id;
    }

    private async handleHelpCommand(ctx: MyContext) {
        await this.cleanupActiveWizard(ctx);
        const text =
            '🏗 <b>СтройУчёт: Полное руководство</b>\n\n' +
            '<b>💸 Внесение расходов</b>\n' +
            '• Нажмите «Внести расход» и пришлите <b>фото чека</b>.\n' +
            '• Бот автоматически найдет сумму и QR-код. \n' +
            '• <i>Пример:</i> Купили цемент на 5000₽ → Фотка → Выбрали проект "Дом на Лесной" → Категория "Материалы" → Готово!\n\n' +
            '<b>📈 Учет доходов</b>\n' +
            '• Используйте для возврата денег (сдача остатков или аванс от клиента).\n' +
            '• <i>Пример:</i> Клиент перевел 100к → /add → Выбрать "Доход" → 100000 → Проект → Готово!\n\n' +
            '<b>📊 Отчеты (/stats)</b>\n' +
            '• 📅 <b>Периоды:</b> Теперь можно смотреть статистику за месяц, квартал или год.\n' +
            '• 🏗 <b>По проектам:</b> Видно прибыль/убыток по каждой стройке отдельно.\n' +

            '<b>👤 Роли и доступ</b>\n' +
            '• <b>OWNER / PARTNER:</b> Видят всё (балансы, отчеты, алерты).\n' +
            '• <b>FOREMAN (Прораб):</b> Видит только свои объекты и вносит расходы.\n\n' +
            '<b>⌨️ Быстрые команды:</b>\n' +
            '/menu — Главное меню\n' +
            '/add — Новый расход/доход\n' +
            '/stats — Отчеты и статистика\n' +

            '/history — Последние 10 операций\n' +
            '/cancel — Отменить ввод';

        const msg = await ctx.reply(text, { parse_mode: 'HTML', ...this.getMainMenu() });
        ctx.session.lastSystemMessageId = msg.message_id;
    }

    private async handleAlertsCommand(ctx: MyContext) {
        await this.cleanupActiveWizard(ctx);

        const user = await this.getUser(ctx);
        if (!user) return;

        if (user.role === 'FOREMAN' || user.role === 'VIEWER') {
            await ctx.reply('🔒 У вас недостаточно прав для просмотра алертов.');
            return;
        }

        const notifications = await getNotifications(user.id, user.companyId, user.role);

        if (notifications.length === 0) {
            await this.safeEditOrReply(ctx, '✅ <b>Критических проблем не обнаружено.</b>\nВсе объекты и финансы в порядке.');
            return;
        }

        let text = `⚠️ <b>Найдены важные уведомления (${notifications.length}):</b>\n\n`;
        notifications.slice(0, 10).forEach(n => {
            const icon = n.severity === 'danger' ? '🔴' : '🟡';
            text += `${icon} <b>${n.title}</b>\n${n.message}\n\n`;
        });

        if (notifications.length > 10) {
            text += `<i>...и ещё ${notifications.length - 10} уведомлений на сайте.</i>`;
        }

        const msg = await ctx.reply(text, { parse_mode: 'HTML' });
        ctx.session.lastSystemMessageId = msg.message_id;
    }

    private async handleBalanceCommand(ctx: MyContext) {
        const user = await this.getUser(ctx);
        if (!user) return this.replyNotLinked(ctx);

        try {
            if (user.role === 'OWNER' || user.role === 'ACCOUNTANT') {
                const moneySources = await prisma.moneySource.findMany({
                    where: { companyId: user.companyId, isActive: true },
                    include: { owner: { select: { name: true } } }
                });

                let text = '💰 <b>Баланс касс компании:</b>\n\n';
                for (const ms of moneySources) {
                    const balance = await this.calculateMsBalanceValue(ms.id);
                    text += `📌 ${ms.name} (<i>${ms.owner.name}</i>): <b>${balance.toLocaleString('ru-RU')} ₽</b>\n`;
                }
                await this.safeEditOrReply(ctx, text);
            } else {
                const ms = await prisma.moneySource.findFirst({
                    where: { ownerId: user.id, isActive: true }
                });
                if (!ms) {
                    await this.safeEditOrReply(ctx, '❌ У вас нет активной кассы.');
                    return;
                }
                const balance = await this.calculateMsBalanceValue(ms.id);
                await this.safeEditOrReply(ctx,
                    `💰 <b>Ваш баланс:</b>\n\n` +
                    `Касса: <b>${ms.name}</b>\n` +
                    `Сумма: <b>${balance.toLocaleString('ru-RU')} ₽</b>`
                );
            }
        } catch (error) {
            logger.error('Balance command error', { error });
            await ctx.reply('❌ Ошибка при получении баланса.');
        }
    }

    private async calculateMsBalanceValue(msId: string): Promise<number> {
        const incoming = await prisma.transaction.aggregate({
            where: { deletedAt: null, OR: [{ moneySourceId: msId, type: 'INCOME' }, { toMoneySourceId: msId, type: 'INTERNAL' }] },
            _sum: { amountCents: true }
        });
        const outgoing = await prisma.transaction.aggregate({
            where: { moneySourceId: msId, deletedAt: null, type: { in: ['EXPENSE', 'PAYOUT', 'INTERNAL'] } },
            _sum: { amountCents: true }
        });
        return ((incoming._sum.amountCents || 0) - (outgoing._sum.amountCents || 0)) / 100;
    }





    private async handleHistoryCommand(ctx: MyContext) {


        const user = await this.getUser(ctx);
        if (!user) return this.replyNotLinked(ctx);

        try {
            const txs = await prisma.transaction.findMany({
                where: { createdById: user.id, deletedAt: null },
                include: { category: true, project: true },
                orderBy: { date: 'desc' },
                take: 10
            });

            if (txs.length === 0) {
                await ctx.reply('🕒 История операций пуста.');
                return;
            }

            let text = '🕒 <b>Последние 10 операций:</b>\n\n';
            const buttons: any[] = [];

            txs.forEach((tx, idx) => {
                const dateStr = new Date(tx.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
                const amount = (tx.amountCents / 100).toLocaleString('ru-RU');
                const emoji = tx.type === 'INCOME' ? '🟩' : '🟥';

                text += `${idx + 1}. ${dateStr} | ${emoji} <b>${amount} ₽</b> | ${tx.category.name}\n`;
                buttons.push([Markup.button.callback(`${idx + 1}. Детали`, `hist_view_${tx.id}`)]);
            });

            await this.safeEditOrReply(ctx, text, Markup.inlineKeyboard(buttons));
            ctx.session.historyMessageId = ctx.session.lastSystemMessageId;
        } catch (error) {
            logger.error('History command error', { error });
            await this.safeEditOrReply(ctx, '❌ Ошибка при загрузке истории.');
        }
    }

    private async handleViewTransactionDetails(ctx: MyContext, txId: string) {
        const user = await this.getUser(ctx);
        if (!user) return;

        try {
            const tx = await prisma.transaction.findUnique({
                where: { id: txId, createdById: user.id },
                include: { category: true, project: true, moneySource: true, createdBy: true }
            });

            if (!tx) {
                await ctx.answerCbQuery('❌ Операция не найдена или у вас нет прав.');
                return;
            }

            const dateStr = new Date(tx.date).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
            const amount = (tx.amountCents / 100).toLocaleString('ru-RU');
            const typeLabel = tx.type === 'INCOME' ? 'Доход' : 'Расход';
            const icon = tx.type === 'INCOME' ? '📈' : '💸';

            let text =
                `<b>${icon} Детали операции (${typeLabel})</b>\n\n` +
                `📅 Дата: <b>${dateStr}</b>\n` +
                `💰 Сумма: <b>${amount} ₽</b>\n` +
                `🏷 Категория: <b>${tx.category?.icon || ''} ${tx.category?.name || '---'}</b>\n` +
                `🏗 Объект: <b>${tx.project?.name || '---'}</b>\n` +
                `🏦 Касса: <b>${tx.moneySource?.name || '---'}</b>\n` +
                `👤 Внес: <b>${tx.createdBy?.name || '---'}</b>\n` +
                `📝 Комментарий: <i>${tx.comment || '---'}</i>\n` +
                `🖼 Чек: ${tx.receiptUrl ? `<a href="${tx.receiptUrl}">Посмотреть</a>` : 'Нет'}`;

            await ctx.editMessageText(text, {
                parse_mode: 'HTML',
                link_preview_options: { is_disabled: !tx.receiptUrl },
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('✏️ Изменить сумму', `hist_edit_${tx.id}`)],
                    [Markup.button.callback('🗑 Удалить операцию', `hist_del_${tx.id}`)],
                    [Markup.button.callback('⬅️ Назад к истории', 'hist_back')],
                    [Markup.button.callback('❌ Закрыть', 'cancel_wiz')]
                ])
            });
        } catch (error) {
            logger.error('Error viewing transaction details', { error });
            await ctx.answerCbQuery('❌ Ошибка при загрузке деталей.');
        }
    }

    private async handleDeleteTransaction(ctx: MyContext, txId: string) {
        const user = await this.getUser(ctx);
        if (!user) return;

        try {
            const { softDeleteTransaction } = await import('../transactions/transactions.service.js');
            await softDeleteTransaction(txId, user.id, user.role, user.companyId);
            await ctx.reply('✅ Операция успешно удалена.');
            await this.handleHistoryCommand(ctx);
        } catch (error) {
            logger.error('Error deleting transaction', { error });
            await ctx.reply('❌ Ошибка при удалении операции. Возможно, у вас нет прав.');
        }
    }

    private async renderVoiceConfirmation(ctx: MyContext) {
        const tx = ctx.session.pendingVoiceTx;
        if (!tx) return;

        const amount = tx.amount ? `${tx.amount.toLocaleString('ru-RU')} ₽` : 'не указана';
        const project = tx.projectName || 'не указан';
        const category = tx.categoryName || 'не указана';
        const comment = tx.comment || '---';

        const text =
            `🎙 <b>Голосовая заметка распознана!</b>\n\n` +
            `💰 Сумма: <b>${amount}</b>\n` +
            `🏗 Объект: <b>${project}</b>\n` +
            `🏷 Категория: <b>${category}</b>\n` +
            `📝 Комментарий: <i>${comment}</i>\n\n` +
            `<b>Всё верно?</b>`;

        await this.safeEditOrReply(ctx, text, Markup.inlineKeyboard([
            [Markup.button.callback('✅ Всё верно, сохранить', 'voice_confirm')],
            [Markup.button.callback('❌ Отмена', 'voice_cancel')]
        ]));
    }

    private async handleVoiceConfirm(ctx: MyContext) {
        const user = await this.getUser(ctx);
        if (!user || !ctx.session.pendingVoiceTx) return;

        try {
            const vtx = ctx.session.pendingVoiceTx;

            // Resolve IDs
            const project = await prisma.project.findFirst({
                where: { companyId: user.companyId, name: vtx.projectName || '' }
            });
            const category = await prisma.category.findFirst({
                where: { OR: [{ companyId: user.companyId }, { isSystem: true }], name: vtx.categoryName || '' }
            });

            // Find default money source for the user
            const ms = await prisma.moneySource.findFirst({
                where: { ownerId: user.id, isActive: true }
            });

            if (!ms || !vtx.amount || !project || !category) {
                await this.safeEditOrReply(ctx, '❌ Не хватает данных для сохранения. Дополните их через меню расхода.');
                return;
            }

            const { createTransaction } = await import('../transactions/transactions.service.js');
            await createTransaction(
                {
                    type: vtx.type || 'EXPENSE',
                    amountCents: Math.round(vtx.amount * 100),
                    moneySourceId: ms.id,
                    projectId: project.id,
                    categoryId: category.id,
                    comment: vtx.comment || 'Авиа-запись',
                    receiptStatus: 'NO_RECEIPT',
                    date: new Date().toISOString(),
                },
                user.id,
                user.companyId,
                user.role
            );

            ctx.session.pendingVoiceTx = undefined;
            await this.safeEditOrReply(ctx, '✅ Операция успешно сохранена!');

            // Clean up old wizard if any
            await this.cleanupActiveWizard(ctx);
        } catch (error) {
            logger.error('Voice confirm error', { error });
            await this.safeEditOrReply(ctx, '❌ Ошибка при сохранении данных.');
        }
    }

    private async handleLinking(ctx: MyContext, token: string) {
        try {
            const user = await prisma.user.findUnique({
                where: { telegramLinkToken: token } as any
            });

            if (!user) {
                await ctx.reply('❌ Ошибка: Ссылка устарела.');
                return;
            }

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    telegramId: ctx.from?.id.toString(),
                    telegramLinkToken: null
                } as any
            });

            await ctx.reply(
                `✅ <b>Аккаунт привязан!</b>\nПривет, ${user.name}. Теперь вы можете вносить расходы.`,
                { parse_mode: 'HTML', ...this.getMainMenu() }
            );
        } catch (error) {
            logger.error('Link error', { error });
            await ctx.reply('❌ Ошибка привязки.');
        }
    }

    private async getUser(ctx: MyContext) {
        if (ctx.user) return ctx.user;
        if (!ctx.from) return null;
        return prisma.user.findUnique({
            where: { telegramId: ctx.from.id.toString() } as any
        });
    }

    private async replyNotLinked(ctx: Context) {
        await ctx.reply('🔒 Сначала привяжите аккаунт в настройках сайта.');
    }

    public async start() {
        try {
            this.botInfo = await this.bot.telegram.getMe();

            // Set commands to make the slash button functional and replace GIF icon
            await this.bot.telegram.setMyCommands([
                { command: 'add', description: '💸 Внести расход' },
                { command: 'balance', description: '🏦 Мой баланс' },
                { command: 'history', description: '🕒 История операций' },
                { command: 'alerts', description: '⚠️ Проблемы (Алерты)' },
                { command: 'help', description: '🆘 Помощь' },
                { command: 'cancel', description: '❌ Отменить' }
            ]);

            // Force the menu button to show commands (slash icon)
            try {
                await this.bot.telegram.setChatMenuButton({
                    menuButton: { type: 'commands' }
                });
            } catch (e) {
                logger.warn('Failed to set chat menu button', { error: e });
            }

            await this.bot.launch();
            logger.info('Telegram Bot started', { username: this.botInfo.username });
        } catch (error) {
            logger.error('Failed to launch Telegram Bot', { error });
        }
    }

    public getBotUsername(): string {
        return this.botInfo?.username || 'bot';
    }

    public stop(reason: string) {
        this.bot.stop(reason);
    }
}
