import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, TrendingDown, PieChart, Calendar } from 'lucide-react-native';
import { useReportsData } from '../../hooks/useReportsData';
import { formatMoney } from '../../lib/utils';

export default function ReportsScreen() {
    const { data, loading, refreshing, refresh, error, period, setPeriod } = useReportsData();

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView
                className="flex-1 px-4 pt-4"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#2563EB" />
                }
            >
                {/* Header */}
                <View className="mb-6">
                    <Text className="text-white text-2xl font-bold mb-4">Отчеты</Text>

                    {/* Period Selector */}
                    <View className="flex-row bg-card rounded-2xl p-1 border border-secondary">
                        {(['DAY', 'WEEK', 'MONTH', 'YEAR'] as const).map((p) => (
                            <TouchableOpacity
                                key={p}
                                onPress={() => setPeriod(p)}
                                className={`flex-1 py-2 rounded-xl items-center ${period === p ? 'bg-primary' : ''}`}
                            >
                                <Text className={`font-bold text-[10px] ${period === p ? 'text-white' : 'text-muted'}`}>
                                    {p === 'DAY' ? 'День' : p === 'WEEK' ? 'Неделя' : p === 'MONTH' ? 'Месяц' : 'Год'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {loading && !refreshing ? (
                    <ActivityIndicator color="#2563EB" className="my-10" />
                ) : error ? (
                    <View className="bg-danger/10 p-4 rounded-2xl items-center mb-6">
                        <Text className="text-danger">{error}</Text>
                    </View>
                ) : (
                    <>
                        {/* Overview Summary */}
                        <View className="bg-card rounded-3xl p-6 border border-secondary mb-8">
                            <View className="flex-row justify-between items-start mb-6">
                                <View>
                                    <Text className="text-muted text-xs uppercase tracking-wider mb-1 font-semibold">Обзор за месяц</Text>
                                    <View className="flex-row items-baseline">
                                        <Text className="text-white text-3xl font-bold">{formatMoney(data?.cashFlowCents || 0)}</Text>
                                    </View>
                                </View>
                                {data?.monthlyTrend !== undefined && (
                                    <View className={`flex-row items-center px-2 py-1 rounded-full ${data.monthlyTrend >= 0 ? 'bg-success/20' : 'bg-danger/20'}`}>
                                        {data.monthlyTrend >= 0 ? (
                                            <TrendingUp color="#10B981" size={14} />
                                        ) : (
                                            <TrendingDown color="#EF4444" size={14} />
                                        )}
                                        <Text className={`text-[10px] font-bold ml-1 ${data.monthlyTrend >= 0 ? 'text-success' : 'text-danger'}`}>
                                            {Math.abs(data.monthlyTrend)}%
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <View className="flex-row justify-between pt-6 border-t border-secondary">
                                <View className="flex-1">
                                    <View className="flex-row items-center mb-1">
                                        <View className="w-2 h-2 rounded-full bg-success mr-2" />
                                        <Text className="text-muted text-[10px]">Приход</Text>
                                    </View>
                                    <Text className="text-success font-bold text-sm">
                                        {formatMoney(data?.totalIncomeCents || 0)}
                                    </Text>
                                </View>
                                <View className="flex-1 items-end">
                                    <View className="flex-row items-center mb-1">
                                        <View className="w-2 h-2 rounded-full bg-danger mr-2" />
                                        <Text className="text-muted text-[10px]">Расход</Text>
                                    </View>
                                    <Text className="text-danger font-bold text-sm">
                                        {formatMoney(Math.abs(data?.totalExpenseCents || 0))}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Income Section */}
                        <View className="mb-6">
                            <View className="flex-row items-center mb-3">
                                <TrendingUp color="#10B981" size={18} />
                                <Text className="text-white/60 text-sm font-bold ml-2 uppercase tracking-widest">Приходы</Text>
                            </View>
                            <View className="bg-card border border-secondary rounded-3xl overflow-hidden">
                                {(!data?.categories || data.categories.filter(c => (c.amountCents || 0) > 0).length === 0) ? (
                                    <View className="p-6 items-center">
                                        <Text className="text-muted text-xs italic">Нет данных по приходам</Text>
                                    </View>
                                ) : (
                                    data.categories.filter(c => (c.amountCents || 0) > 0).map((cat, index, array) => (
                                        <View key={index} className={`flex-row justify-between items-center p-4 ${index !== array.length - 1 ? 'border-b border-white/5' : ''}`}>
                                            <View className="flex-1">
                                                <Text className="text-white text-sm font-medium">{cat.name}</Text>
                                                <View className="h-1 bg-secondary rounded-full overflow-hidden mt-1 w-24">
                                                    <View className="h-full bg-success" style={{ width: `${cat.percentage}%` }} />
                                                </View>
                                            </View>
                                            <Text className="text-success font-bold text-sm">{formatMoney(cat.amountCents)}</Text>
                                        </View>
                                    ))
                                )}
                                <View className="bg-white/5 p-4 flex-row justify-between items-center">
                                    <Text className="text-white font-bold text-sm">Всего приход</Text>
                                    <Text className="text-success font-bold text-sm">{formatMoney(data?.totalIncomeCents || 0)}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Expense Section */}
                        <View className="mb-8">
                            <View className="flex-row items-center mb-3">
                                <TrendingDown color="#EF4444" size={18} />
                                <Text className="text-white/60 text-sm font-bold ml-2 uppercase tracking-widest">Расходы</Text>
                            </View>
                            <View className="bg-card border border-secondary rounded-3xl overflow-hidden">
                                {(!data?.categories || data.categories.filter(c => (c.amountCents || 0) < 0).length === 0) ? (
                                    <View className="p-6 items-center">
                                        <Text className="text-muted text-xs italic">Нет данных по расходам</Text>
                                    </View>
                                ) : (
                                    data.categories.filter(c => (c.amountCents || 0) < 0).map((cat, index, array) => (
                                        <View key={index} className={`flex-row justify-between items-center p-4 ${index !== array.length - 1 ? 'border-b border-white/5' : ''}`}>
                                            <View className="flex-1">
                                                <Text className="text-white text-sm font-medium">{cat.name}</Text>
                                                <View className="h-1 bg-secondary rounded-full overflow-hidden mt-1 w-24">
                                                    <View className="h-full bg-danger" style={{ width: `${Math.abs(cat.percentage)}%` }} />
                                                </View>
                                            </View>
                                            <Text className="text-danger font-bold text-sm">{formatMoney(Math.abs(cat.amountCents))}</Text>
                                        </View>
                                    ))
                                )}
                                <View className="bg-white/5 p-4 flex-row justify-between items-center">
                                    <Text className="text-white font-bold text-sm">Всего расход</Text>
                                    <Text className="text-danger font-bold text-sm">{formatMoney(Math.abs(data?.totalExpenseCents || 0))}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Net Cash Flow (Bottom Card) */}
                        <View className="bg-primary border border-primary/20 rounded-3xl p-6 mb-8 flex-row justify-between items-center shadow-lg shadow-primary/20">
                            <View>
                                <Text className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">Чистый доход</Text>
                                <Text className="text-white text-2xl font-bold">{formatMoney(data?.cashFlowCents || 0)}</Text>
                            </View>
                            <View className="w-12 h-12 bg-white/20 rounded-2xl items-center justify-center">
                                <PieChart color="#fff" size={24} />
                            </View>
                        </View>

                        {/* Mutual Settlements Section */}
                        <View className="mb-8">
                            <View className="flex-row items-center mb-4">
                                <Text className="text-white text-lg font-bold">Взаиморасчеты</Text>
                            </View>
                            <View className="bg-card rounded-[32px] p-8 items-center border border-secondary">
                                <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4">
                                    <View className="flex-row">
                                        <TrendingUp color="#2563EB" size={20} />
                                        <TrendingDown color="#EF4444" size={20} />
                                    </View>
                                </View>
                                <Text className="text-white font-bold text-center mb-2">Здесь будут ваши долги</Text>
                                <Text className="text-muted text-center text-xs leading-4">
                                    Раздел со всеми задолженностями перед контрагентами и их долгами перед вами в разработке.
                                </Text>
                            </View>
                        </View>
                    </>
                )}

                <View className="h-20" />
            </ScrollView>
        </SafeAreaView>
    );
}
