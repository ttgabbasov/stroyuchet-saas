import { useEquityReport } from '@/lib/hooks';
import { Card, Button } from '@/components/ui';
import { formatMoney, formatMoneyShort } from '@/types';
import { AlertCircle, ArrowRight, CheckCircle2, Wallet, RefreshCw } from 'lucide-react';

export function EquityReport() {
    const { data: report, isLoading, refetch } = useEquityReport();

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!report) {
        return (
            <Card padding="lg" className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground mb-4">Не удалось загрузить отчет по взаиморасчетам</p>
                <Button variant="secondary" onClick={() => refetch()}>Попробовать снова</Button>
            </Card>
        );
    }

    // Single Partner Warning
    if (report && report.partners.length === 1) {
        return (
            <div className="space-y-6">
                <Card padding="lg" className="border-warning-200 bg-warning-50 dark:bg-warning-900/10">
                    <div className="flex items-start gap-4">
                        <AlertCircle className="w-6 h-6 text-warning-600 mt-1" />
                        <div>
                            <h3 className="text-lg font-semibold text-warning-900 dark:text-warning-100 mb-1">Вы единственный партнер</h3>
                            <p className="text-warning-700 dark:text-warning-200 mb-3">
                                Взаиморасчеты (Equity) предназначены для разделения прибыли и обязательств между несколькими партнерами (50/50).
                            </p>
                            <Button variant="outline" size="sm" onClick={() => window.location.href = '/settings/users'}>
                                Пригласить партнера
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Show stats anyway so they can see their own confusing balance */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card padding="lg" className="bg-primary-50 dark:bg-primary-900/10 border-primary-100 dark:border-primary-900/20">
                        <p className="text-sm text-primary-600 dark:text-primary-400 font-medium mb-1">Ваш текущий баланс</p>
                        <p className={`text-2xl font-bold ${report.totalCompanyValueCents < 0 ? 'text-danger-600' : 'text-primary-700'}`}>
                            {formatMoney(report.totalCompanyValueCents)}
                        </p>
                        {report.totalCompanyValueCents < 0 && (
                            <div className="mt-2 text-sm text-muted-foreground bg-background/50 p-2 rounded">
                                <p>💡 <strong>Баланс отрицательный?</strong></p>
                                <p>Возможно, вы вносили свои деньги, но не записали это как "Доход" в кассу. Система видит только расходы.</p>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        );
    }

    // Empty State (No operations) for > 1 partners
    if (report && report.totalCompanyValueCents === 0 && report.partners.every(p => p.totalEquityCents === 0)) {
        return (
            <Card padding="lg" className="flex flex-col items-center justify-center py-16 text-center border-dashed">
                <div className="p-4 bg-muted rounded-full mb-4">
                    <Wallet className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Взаиморасчеты не требуются</h3>
                <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                    Здесь будет отображаться баланс между партнерами, когда появятся средства.
                </p>
                <Button variant="secondary" onClick={() => refetch()}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Обновить данные
                </Button>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card padding="lg" className="bg-primary-50 dark:bg-primary-900/10 border-primary-100 dark:border-primary-900/20">
                    <p className="text-sm text-primary-600 dark:text-primary-400 font-medium mb-1">Общая ценность</p>
                    <p className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                        {formatMoney(report.totalCompanyValueCents)}
                    </p>
                    <p className="text-xs text-primary-600/70 mt-1">Касса + Выплаты</p>
                </Card>

                <Card padding="lg">
                    <p className="text-sm text-muted-foreground font-medium mb-1">Доля партнера (50%)</p>
                    <p className="text-2xl font-bold text-foreground">
                        {formatMoney(report.partners[0]?.targetShareCents || 0)}
                    </p>
                </Card>

                <Card padding="lg" className={report.settlementNeeded ? "bg-warning-50 dark:bg-warning-900/10 border-warning-100" : "bg-success-50 dark:bg-success-900/10 border-success-100"}>
                    <p className="text-sm font-medium mb-1" style={{ color: report.settlementNeeded ? 'var(--warning-700)' : 'var(--success-700)' }}>
                        Статус
                    </p>
                    <div className="flex items-center gap-2">
                        {report.settlementNeeded ? (
                            <>
                                <AlertCircle className="w-6 h-6 text-warning-600" />
                                <span className="text-lg font-bold text-warning-700">Требуется расчет</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-6 h-6 text-success-600" />
                                <span className="text-lg font-bold text-success-700">Баланс в норме</span>
                            </>
                        )}
                    </div>
                </Card>
            </div>

            {/* Partners Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {report.partners.map(partner => (
                    <Card key={partner.userId} padding="none" className="overflow-hidden">
                        <div className="p-4 border-b border-border bg-muted/30">
                            <h3 className="font-semibold text-lg">{partner.userName}</h3>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                                <span className="text-sm text-muted-foreground">В кассе (Money Sources)</span>
                                <span className="font-medium text-foreground">{formatMoney(partner.cashBalanceCents)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                                <span className="text-sm text-muted-foreground">Вывел себе (Payouts)</span>
                                <span className="font-medium text-blue-600">{formatMoney(partner.withdrawnCents)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <span className="font-medium">Итого вклад</span>
                                <span className="font-bold text-lg">{formatMoney(partner.totalEquityCents)}</span>
                            </div>
                        </div>
                        {Math.abs(partner.settlementCents) > 100 && (
                            <div className={`p-3 text-center text-sm font-medium ${partner.settlementCents > 0 ? 'bg-danger-50 text-danger-700' : 'bg-success-50 text-success-700'}`}>
                                {partner.settlementCents > 0
                                    ? `Должен отдать: ${formatMoney(Math.abs(partner.settlementCents))}`
                                    : `Должен получить: ${formatMoney(Math.abs(partner.settlementCents))}`
                                }
                            </div>
                        )}
                    </Card>
                ))}
            </div>

            {/* Settlement Action */}
            {report.settlementNeeded && report.settlementSummary && (
                <Card padding="lg" className="border-2 border-primary-500 shadow-lg relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-50 to-transparent dark:from-primary-900/20 opacity-50" />
                    <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex flex-col gap-2">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <RefreshCw className="w-6 h-6 text-primary-600" />
                                План урегулирования
                            </h3>
                            <p className="text-muted-foreground">Для выравнивания долей 50/50 необходимо выполнить перевод:</p>
                        </div>

                        <div className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
                            <div className="text-right">
                                <p className="text-xs text-muted-foreground">Отправитель</p>
                                <p className="font-bold text-danger-600">{report.settlementSummary.from.userName}</p>
                            </div>
                            <div className="flex flex-col items-center px-4">
                                <span className="text-xs font-medium text-muted-foreground mb-1">Сумма</span>
                                <div className="flex items-center gap-2">
                                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                                    <span className="text-xl font-bold bg-primary-100 dark:bg-primary-900 px-3 py-1 rounded text-primary-700 dark:text-primary-300">
                                        {formatMoney(report.settlementSummary.amountCents)}
                                    </span>
                                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Получатель</p>
                                <p className="font-bold text-success-600">{report.settlementSummary.to.userName}</p>
                            </div>
                        </div>

                        <Button disabled variant="secondary">Зафиксировать (Скоро)</Button>
                    </div>
                </Card>
            )}
        </div>
    );
}
