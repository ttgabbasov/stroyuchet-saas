import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft, HelpCircle, MessageCircle, FileText, Phone } from 'lucide-react-native';

export default function HelpScreen() {
    const router = useRouter();

    const openTelegram = () => Linking.openURL('https://t.me/STUchetBot');

    return (
        <SafeAreaView className="flex-1 bg-background">
            <Stack.Screen options={{ headerShown: false }} />
            <View className="flex-row items-center px-4 py-4 border-b border-white/5">
                <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                    <ChevronLeft color="#fff" size={24} />
                </TouchableOpacity>
                <Text className="text-white text-xl font-bold ml-2">Помощь</Text>
            </View>

            <ScrollView className="flex-1 px-4 pt-6">
                <View className="bg-card rounded-[32px] border border-secondary overflow-hidden mb-8">
                    <HelpItem
                        icon={<MessageCircle color="#2563EB" size={20} />}
                        label="Чат поддержки в Telegram"
                        onPress={openTelegram}
                    />
                    <HelpItem
                        icon={<FileText color="#94A3B8" size={20} />}
                        label="Документация и инструкции"
                        onPress={() => Linking.openURL('http://docs.tgabbasov.store')}
                    />
                    <HelpItem
                        icon={<Phone color="#94A3B8" size={20} />}
                        label="Заказать звонок менеджера"
                        isLast
                    />
                </View>

                <View className="bg-primary/10 rounded-[32px] p-8 items-center border border-primary/20">
                    <HelpCircle color="#2563EB" size={48} className="mb-4" />
                    <Text className="text-white font-bold text-lg text-center mb-2">Мы на связи!</Text>
                    <Text className="text-muted text-center text-xs leading-4">
                        Наша служба поддержки работает пн-пт с 9:00 до 18:00 по московскому времени.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function HelpItem({ icon, label, onPress, isLast }: any) {
    return (
        <TouchableOpacity
            onPress={onPress}
            className={`flex-row items-center p-5 ${!isLast ? 'border-b border-white/5' : ''}`}
        >
            <View className="mr-4">{icon}</View>
            <Text className="text-white font-medium">{label}</Text>
        </TouchableOpacity>
    );
}
