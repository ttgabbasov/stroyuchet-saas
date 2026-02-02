import { eventBus, EVENTS } from '../../lib/events.js';
import { NotificationService } from './notification.service';
import { TransactionResponseV2 } from '../transactions/transactions.service';

/**
 * Initialize all push notification handlers
 */
export function initPushHandlers() {
    // Listen for new transactions (Disabled per user request)
    /*
    eventBus.on(EVENTS.TRANSACTION.CREATED, async (transaction: TransactionResponseV2) => {
        try {
            const { type, amountCents, category, project, createdBy } = transaction;
            const amount = (amountCents / 100).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' });

            const title = type === 'INCOME' ? '💰 Новый доход' : '💸 Новый расход';
            const body = `${createdBy.name} добавил ${amount} (${category.name})${project ? ` на объект ${project.name}` : ''}`;

            // Notify everyone in the company EXCEPT the creator
            // (Or we can notify everyone, but usually creator knows already)
            // For now, let's notify the whole company for visibility
            await NotificationService.sendToCompany(
                transaction.moneySource.companyId || '',
                title,
                body,
                { screen: 'TransactionDetails', transactionId: transaction.id }
            );
        } catch (error) {
            console.error('Error in TRANSACTION.CREATED push handler:', error);
        }
    });
    */

    console.log('Push notification handlers initialized (Transactions disabled).');
}
