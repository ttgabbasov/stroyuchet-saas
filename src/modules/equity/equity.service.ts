// ============================================
// Partnership Equity Service
// ============================================
// Расчет взаиморасчетов между партнерами (50/50)
// ============================================

import { prisma } from '../../lib/prisma';
import { ErrorCodes } from '../../types/api.types';

export class EquityError extends Error {
    constructor(
        public code: string,
        message: string
    ) {
        super(message);
        this.name = 'EquityError';
    }
}

export interface PartnerEquity {
    userId: string;
    userName: string;
    cashBalanceCents: number;        // Деньги в кассах
    withdrawnCents: number;           // Уже взял себе через PAYOUT
    totalEquityCents: number;         // Общая ценность (касса + выведено)
    targetShareCents: number;         // Должно быть по честному (50%)
    settlementCents: number;          // Сколько должен отдать/получить
}

export interface EquityReport {
    partners: PartnerEquity[];
    totalCompanyValueCents: number;
    settlementNeeded: boolean;
    settlementSummary?: {
        from: { userId: string; userName: string };
        to: { userId: string; userName: string };
        amountCents: number;
    };
}

/**
 * Получение отчета по взаиморасчетам партнеров
 */
export async function getEquityReport(companyId: string): Promise<EquityReport> {
    // 1. Найти партнеров (OWNER + PARTNER, исключая FOREMAN)
    const partners = await prisma.user.findMany({
        where: {
            companyId,
            role: { in: ['OWNER', 'PARTNER'] }
        },
        select: {
            id: true,
            name: true
        }
    });

    if (partners.length === 0) {
        throw new EquityError(ErrorCodes.NOT_FOUND, 'Партнеры не найдены');
    }

    // 2. Рассчитать баланс для каждого партнера
    const partnerEquities: PartnerEquity[] = [];

    for (const partner of partners) {
        // 2a. Баланс касс (Money Sources, где владелец - партнер)
        const moneySources = await prisma.moneySource.findMany({
            where: {
                ownerId: partner.id,
                companyId,
                isActive: true
            },
            select: { id: true }
        });

        let cashBalanceCents = 0;
        for (const ms of moneySources) {
            const balance = await calculateMoneySourceBalance(ms.id);
            cashBalanceCents += balance;
        }

        // 2b. Выплаты себе (PAYOUT)
        const payouts = await prisma.transaction.aggregate({
            where: {
                payoutUserId: partner.id,
                type: 'PAYOUT',
                deletedAt: null,
                moneySource: { companyId }
            },
            _sum: { amountCents: true }
        });

        const withdrawnCents = payouts._sum.amountCents || 0;
        const totalEquityCents = cashBalanceCents + withdrawnCents;

        partnerEquities.push({
            userId: partner.id,
            userName: partner.name,
            cashBalanceCents,
            withdrawnCents,
            totalEquityCents,
            targetShareCents: 0, // Будет вычислено после
            settlementCents: 0
        });
    }

    // 3. Вычислить целевую долю (50/50)
    const totalCompanyValueCents = partnerEquities.reduce((sum, p) => sum + p.totalEquityCents, 0);
    const targetShareCents = Math.round(totalCompanyValueCents / partners.length);

    // 4. Вычислить settlement для каждого
    partnerEquities.forEach(p => {
        p.targetShareCents = targetShareCents;
        p.settlementCents = p.totalEquityCents - targetShareCents;
    });

    // 5. Определить, нужен ли перевод
    const settlementNeeded = partnerEquities.some(p => Math.abs(p.settlementCents) > 100); // Игнорируем копейки

    let settlementSummary;
    if (settlementNeeded && partners.length === 2) {
        // Для 2 партнеров формируем простое резюме
        const debtor = partnerEquities.find(p => p.settlementCents > 0);
        const creditor = partnerEquities.find(p => p.settlementCents < 0);

        if (debtor && creditor) {
            settlementSummary = {
                from: { userId: debtor.userId, userName: debtor.userName },
                to: { userId: creditor.userId, userName: creditor.userName },
                amountCents: Math.abs(creditor.settlementCents)
            };
        }
    }

    return {
        partners: partnerEquities,
        totalCompanyValueCents,
        settlementNeeded,
        settlementSummary
    };
}

/**
 * Вычисление баланса кассы (копия из money-sources.service.ts)
 */
async function calculateMoneySourceBalance(moneySourceId: string): Promise<number> {
    const incoming = await prisma.transaction.aggregate({
        where: {
            deletedAt: null,
            OR: [
                { moneySourceId, type: 'INCOME' },
                { toMoneySourceId: moneySourceId, type: 'INTERNAL' },
            ],
        },
        _sum: { amountCents: true },
    });

    const outgoing = await prisma.transaction.aggregate({
        where: {
            moneySourceId,
            deletedAt: null,
            type: { in: ['EXPENSE', 'PAYOUT', 'INTERNAL'] },
        },
        _sum: { amountCents: true },
    });

    const incomingTotal = incoming._sum.amountCents || 0;
    const outgoingTotal = outgoing._sum.amountCents || 0;

    return incomingTotal - outgoingTotal;
}
