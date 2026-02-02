/**
 * Formats a number of cents into a localized currency string.
 * @param cents - The amount in cents.
 * @returns A formatted string (e.g., "1 234 567 ₽").
 */
export function formatMoney(cents: number): string {
    const amount = cents / 100;
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: 0,
    }).format(amount).replace(' руб.', ' ₽');
}
