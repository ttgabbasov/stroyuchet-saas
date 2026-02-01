import { EventEmitter } from 'events';

/**
 * Глобальный Event Bus для внутреннего взаимодействия модулей.
 * Позволяет избежать цикличных зависимостей (например, между Transactions и Telegram).
 */
export const eventBus = new EventEmitter();

export const EVENTS = {
    TRANSACTION: {
        CREATED: 'transaction.created',
        DELETED: 'transaction.deleted',
    },
    ADVANCE: {
        REFILLED: 'advance.refilled',
    }
};
