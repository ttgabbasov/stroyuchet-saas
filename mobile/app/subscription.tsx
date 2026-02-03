import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft, CreditCard, Zap, CheckCircle2, Clock } from 'lucide-react-native';
import { useAuthStore } from '../lib/auth';

export default function SubscriptionScreen() {
    const router = useRouter();

    const company = useAuthStore((state) => state.company);

    const plans = [
        {
            name: 'Минимальный',
            price: 'Бесплатно',
            active: company?.planId === 'FREE',
            features: ['3 проекта', '1 пользователь', 'Базовая аналитика']
        },
        {
            name: 'Бизнес',
            price: '4,990 ₽/мес',
            active: !company?.planId || company?.planId === 'BUSINESS',
            features: ['Безлимитно проектов', 'До 50 пользователей', 'P&L и аналитика', 'Поддержка']
        },
        {
            name: 'Профи',
            price: '9,990 ₽/мес',
            active: company?.planId === 'PRO',
            features: ['Все из Бизнес', 'Персональный менеджер', 'API интеграции', 'VIP поддержка']
        },
    ];

    return (
        <SafeAreaView className="flex-1 bg-background">
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View className="flex-row items-center px-4 py-4 border-b border-white/5">
                <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                    <ChevronLeft color="#fff" size={24} />
                </TouchableOpacity>
                <Text className="text-white text-xl font-bold ml-2">Подписка</Text>
            </View>

            <ScrollView className="flex-1 px-4 pt-6">
                {/* Active Plan Card */}
                <View className="bg-primary rounded-[32px] p-6 mb-8 overflow-hidden relative shadow-lg shadow-primary/30">
                    <View className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
                    <Zap color="#fff" size={32} className="mb-4 opacity-70" />
                    <Text className="text-white/80 text-sm uppercase font-bold tracking-widest mb-1">Ваш тариф</Text>
                    <Text className="text-white text-3xl font-bold mb-4">{plans.find(p => p.active)?.name || 'Бизнес'}</Text>

                    <View className="flex-row items-center bg-white/20 self-start px-3 py-1 rounded-full">
                        <Clock color="#fff" size={14} />
                        <Text className="text-white text-xs font-bold ml-2">Подписка активна</Text>
                    </View>
                </View>

                {/* All Plans */}
                <Text className="text-white text-lg font-bold mb-4">Доступные тарифы</Text>
                {plans.map((plan, idx) => (
                    <View key={idx} className={`bg-card rounded-[24px] border ${plan.active ? 'border-primary' : 'border-secondary'} p-5 mb-4`}>
                        <View className="flex-row justify-between items-start mb-4">
                            <View>
                                <Text className="text-white font-bold text-lg">{plan.name}</Text>
                                <Text className="text-primary font-bold">{plan.price}</Text>
                            </View>
                            {plan.active && (
                                <View className="bg-primary/20 px-2 py-0.5 rounded-full border border-primary/30">
                                    <Text className="text-primary text-[10px] font-bold uppercase">Активен</Text>
                                </View>
                            )}
                        </View>
                        <View className="space-y-2">
                            {plan.features.map((f, fIdx) => (
                                <View key={fIdx} className="flex-row items-center">
                                    <CheckCircle2 color={plan.active ? "#2563EB" : "#475569"} size={14} />
                                    <Text className="text-muted text-xs ml-2">{f}</Text>
                                </View>
                            ))}
                        </View>
                        {!plan.active && (
                            <TouchableOpacity className="mt-4 bg-secondary py-2 rounded-xl items-center">
                                <Text className="text-white text-xs font-bold">Выбрать тариф</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ))}

                {/* Features */}
                <Text className="text-white text-lg font-bold mb-4">Возможности тарифа</Text>
                <View className="bg-card rounded-3xl border border-secondary p-4 mb-8">
                    <FeatureItem text="Неограниченное кол-во объектов" />
                    <FeatureItem text="Командная работа (до 50 чел)" />
                    <FeatureItem text="Расширенная аналитика и P&L" />
                    <FeatureItem text="Приоритетная поддержка" isLast />
                </View>

                {/* Contact Support */}
                <TouchableOpacity
                    className="bg-primary/10 border border-primary/30 rounded-2xl p-5 items-center mb-10"
                    onPress={() => alert('Служба поддержки свяжется с вами')}
                >
                    <Text className="text-primary font-bold text-lg">Нужна помощь с тарифом?</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

function FeatureItem({ text, isLast }: { text: string, isLast?: boolean }) {
    return (
        <View className={`flex-row items-center py-3 ${!isLast ? 'border-b border-white/5' : ''}`}>
            <CheckCircle2 color="#10B981" size={20} />
            <Text className="text-muted ml-3 text-sm">{text}</Text>
        </View>
    );
}
