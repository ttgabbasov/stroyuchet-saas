import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart3 } from 'lucide-react-native';

export default function AnalyticsScreen() {
    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="px-4 pt-4 mb-6">
                <Text className="text-white text-2xl font-bold">Аналитика</Text>
            </View>
            <ScrollView className="flex-1 px-4">
                <View className="bg-card p-10 rounded-[32px] border border-secondary items-center">
                    <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-6">
                        <BarChart3 color="#2563EB" size={40} />
                    </View>
                    <Text className="text-white font-bold text-xl mb-3 text-center">Аналитика появится здесь</Text>
                    <Text className="text-muted text-center leading-5">
                        Начните добавлять финансовые операции и объекты. Как только в системе появится достаточно данных, мы построим для вас графики доходов, расходов и рентабельности.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
