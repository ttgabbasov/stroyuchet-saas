import { Jimp } from 'jimp';
import jsQR from 'jsqr';
import { logger } from './logger.js';

export interface ExtractedReceiptData {
    amountCents?: number;
    date?: Date;
    raw?: string;
}

/**
 * Сервис для распознавания QR-кодов на чеках (формат РФ)
 */
export async function extractQRData(imageBuffer: Buffer): Promise<ExtractedReceiptData | null> {
    try {
        const originalImage = await Jimp.read(imageBuffer);

        // Чем больше вариантов мы попробуем, тем выше шанс.
        // JS-сканеры иногда «слепнут» на слишком больших фото, поэтому пробуем разный масштаб.
        const attempts = [
            // 1. Стандарт (немного контраста)
            { name: 'Contrast Low', fn: (img: any) => img.greyscale().contrast(0.2) },

            // 2. Нормализация (растягиваем гистограмму, если фото тусклое)
            { name: 'Normalized', fn: (img: any) => img.greyscale().normalize().contrast(0.3) },

            // 3. Бинаризация (черно-белый мир, убирает шумы фона)
            { name: 'Binarized', fn: (img: any) => img.greyscale().contrast(0.5).posterize(2) },

            // 4. Downscale (Сжатие до 1024px). 
            // Это КРИТИЧНО: jsQR часто лучше находит маркеры на меньшем разрешении,
            // если оригинал слишком огромен.
            {
                name: 'Downscale 1024px', fn: (img: any) => {
                    if (img.bitmap.width > 1024) {
                        img.resize({ width: 1024 });
                    }
                    img.greyscale().contrast(0.2);
                }
            },

            // 5. Sharpen + Contrast (для мелких QR)
            { name: 'Sharpened High', fn: (img: any) => img.greyscale().contrast(0.4).convolute([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]]) }
        ];

        let code = null;

        for (const attempt of attempts) {
            try {
                const processed = originalImage.clone();
                attempt.fn(processed);

                const { data, width, height } = processed.bitmap;
                code = jsQR(new Uint8ClampedArray(data), width, height, {
                    inversionAttempts: "attemptBoth",
                });

                if (code) {
                    logger.info(`QR Code detected on pass: ${attempt.name}`);
                    break;
                }
            } catch (err) {
                logger.warn(`Preprocessing pass ${attempt.name} failed`, { err });
            }
        }

        if (!code) {
            logger.info('QR Code not found after all (5) preprocessing passes');
            return null;
        }

        const raw = code.data;
        logger.info('QR Code detected!', { raw });

        // 4. Парсим стандартную строку РФ чека:
        // t=20240131T1530&s=1500.50&fn=...&i=...&fp=...&n=...
        const parsed: ExtractedReceiptData = { raw };

        const params = new URLSearchParams(raw);

        // Сумма (s=1500.50)
        const s = params.get('s');
        if (s) {
            const amount = parseFloat(s);
            if (!isNaN(amount)) {
                parsed.amountCents = Math.round(amount * 100);
                logger.info('QR: Amount extracted', { amountCents: parsed.amountCents });
            }
        }

        // Дата (t=20240131T1530)
        const t = params.get('t');
        if (t) {
            try {
                // Формат: YYYYMMDDTHHMM или YYYYMMDDTHHMMSS
                const year = t.substring(0, 4);
                const month = t.substring(4, 6);
                const day = t.substring(6, 8);
                const hour = t.substring(9, 11);
                const min = t.substring(11, 13);

                const date = new Date(`${year}-${month}-${day}T${hour}:${min}:00`);
                if (!isNaN(date.getTime())) {
                    parsed.date = date;
                }
            } catch (e) {
                logger.warn('QR: Date parsing failed', { t });
            }
        }

        return parsed;
    } catch (error: any) {
        logger.error('Error scanning QR code', { message: error.message, stack: error.stack });
        return null;
    }
}
