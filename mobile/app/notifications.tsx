import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft, Bell, MessageSquare, BadgePercent } from 'lucide-react-native';

export default function NotificationsScreen() {
    const router = useRouter();
    const [pushEnabled, setPushEnabled] = React.useState(true);
    const [emailEnabled, setEmailEnabled] = React.useState(true);

    return (
        <SafeAreaView className="flex-1 bg-background">
            <Stack.Screen options={{ headerShown: false }} />
            <View className="flex-row items-center px-4 py-4 border-b border-white/5">
                <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                    <ChevronLeft color="#fff" size={24} />
                </TouchableOpacity>
                <Text className="text-white text-xl font-bold ml-2">Уведомления</Text>
            </View>

            <ScrollView className="flex-1 px-4 pt-6">
                <View className="bg-card rounded-[32px] border border-secondary overflow-hidden mb-8">
                    <ToggleRow
                        icon={<Bell color="#94A3B8" size={20} />}
                        label="Push-уведомления"
                        value={pushEnabled}
                        onValueChange={setPushEnabled}
                    />
                    <ToggleRow
                        icon={<Mail color="#94A3B8" size={20} />}
                        label="Email-рассылка"
                        value={emailEnabled}
                        onValueChange={setEmailEnabled}
                    />
                </View>

                <View className="bg-primary/10 rounded-[32px] p-6 border border-primary/20">
                    <Text className="text-white font-bold mb-2">Настройка типов событий</Text>
                    <Text className="text-muted text-xs leading-4">
                        Вы можете выбрать, о каких именно операциях и событиях на объектах вы хотите получать уведомления в веб-версии приложения.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function ToggleRow({ icon, label, value, onValueChange }: any) {
    return (
        <View className="flex-row items-center justify-between p-5 border-b border-white/5">
            <View className="flex-row items-center">
                <View className="mr-3">{icon}</View>
                <Text className="text-white font-medium">{label}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: '#1E293B', true: '#2563EB' }}
                thumbColor={value ? '#fff' : '#94A3B8'}
            />
        </View>
    );
}

function Mail({ color, size }: any) {
    return <MessageSquare color={color} size={size} />;
}
