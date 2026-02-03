import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Repeat, ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';

export default function OperationsScreen() {
    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="px-4 pt-4 mb-6">
                <Text className="text-white text-2xl font-bold">Операции</Text>
            </View>
            <ScrollView className="flex-1 px-4">
                <View className="bg-card p-8 rounded-3xl border border-secondary items-center">
                    <Repeat color="#64748B" size={48} />
                    <Text className="text-white font-bold text-lg mt-4">Раздел в разработке</Text>
                    <Text className="text-muted text-center mt-2">
                        Здесь будет список всех ваших финансовых операций с удобными фильтрами и поиском.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
