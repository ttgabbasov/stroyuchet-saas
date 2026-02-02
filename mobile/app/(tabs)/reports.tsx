import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, TrendingDown, PieChart, Calendar } from 'lucide-react-native';
import { useReportsData } from '../hooks/useReportsData';
import { formatMoney } from '../lib/utils';

export default function ReportsScreen() {
    const { data, loading, refreshing, refresh, error } = useReportsData();

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView
                className="flex-1 px-4 pt-4"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#2563EB" />
                }
            >
                {/* Header */}
                <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-white text-2xl font-bold">Отчёты</Text>
                    <View className="bg-card w-10 h-10 rounded-xl items-center justify-center border border-secondary">
                        <Calendar color="#94A3B8" size={20} />
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
                            <Text className="text-muted text-xs uppercase tracking-wider mb-4 font-semibold">Обзор за месяц</Text>

                            <View className="flex-row justify-between items-center mb-6">
                                <View>
                                    <Text className="text-white/60 text-xs mb-1">Чистая прибыль</Text>
                                    <Text className={`text-2xl font-bold ${(data?.cashFlowCents || 0) >= 0 ? 'text-white' : 'text-danger'
                                        }`}>
                                        {formatMoney(data?.cashFlowCents || 0)}
                                    </Text>
                                </View>
                                {data?.monthlyTrend !== undefined && (
                                    <View className={`flex-row items-center px-2 py-1 rounded-full ${data.monthlyTrend >= 0 ? 'bg-success/20' : 'bg-danger/20'
                                        }`}>
                                        {data.monthlyTrend >= 0 ? (
                                            <TrendingUp color="#10B981" size={14} />
                                        ) : (
                                            <TrendingDown color="#EF4444" size={14} />
                                        )}
                                        <Text className={`text-[10px] font-bold ml-1 ${data.monthlyTrend >= 0 ? 'text-success' : 'text-danger'
                                            }`}>
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
                                        {formatMoney(data?.totalExpenseCents || 0)}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Category Breakdown */}
                        <View className="mb-8">
                            <View className="flex-row items-center mb-4">
                                <PieChart color="#2563EB" size={20} />
                                <Text className="text-white text-lg font-bold ml-2">Расходы по категориям</Text>
                            </View>

                            {data?.categories.length === 0 ? (
                                <View className="bg-card rounded-2xl p-8 items-center border border-secondary">
                                    <Text className="text-muted">Нет данных для анализа</Text>
                                </View>
                            ) : (
                                data?.categories.map((cat, index) => (
                                    <View key={index} className="mb-4">
                                        <View className="flex-row justify-between mb-2">
                                            <Text className="text-white text-sm">{cat.name}</Text>
                                            <Text className="text-muted text-xs font-bold">{cat.percentage}%</Text>
                                        </View>
                                        <View className="h-2 bg-secondary rounded-full overflow-hidden">
                                            <View
                                                className="h-full bg-primary"
                                                style={{ width: `${cat.percentage}%` }}
                                            />
                                        </View>
                                        <Text className="text-muted text-[10px] mt-1">{formatMoney(cat.amountCents)}</Text>
                                    </View>
                                ))
                            )}
                        </View>
                    </>
                )}

                <View className="h-20" />
            </ScrollView>
        </SafeAreaView>
    );
}
