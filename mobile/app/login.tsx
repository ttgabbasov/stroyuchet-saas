import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, Mail, ChevronRight, LayoutDashboard } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../lib/auth';
import { apiPost } from '../lib/api';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();
    const { setAuth } = useAuthStore();

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Пожалуйста, заполните все поля');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await apiPost<any>('/auth/login', { email, password });

            if (result.tokens) {
                setAuth(result.user, result.company, result.tokens.accessToken, result.tokens.refreshToken);
                router.replace('/(tabs)');
            }
        } catch (err: any) {
            console.error('Login error details:', JSON.stringify(err, null, 2));
            let errorMessage = 'Ошибка входа. ';
            if (err.message) errorMessage += err.message;
            if (err.code) errorMessage += ` (${err.code})`;
            if (err.response?.status) errorMessage += ` [${err.response.status}]`;
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 pt-12">
                    {/* Logo / Icon */}
                    <View className="items-center mb-12">
                        <View className="w-20 h-20 bg-primary rounded-3xl items-center justify-center shadow-lg shadow-primary/50">
                            <LayoutDashboard color="white" size={40} />
                        </View>
                        <Text className="text-white text-3xl font-bold mt-6">СтройУчёт</Text>
                        <Text className="text-muted text-center mt-2">Управление строительством в вашем кармане</Text>
                    </View>

                    {/* Form */}
                    <View className="space-y-4">
                        <View>
                            <Text className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2 ml-1">Email</Text>
                            <View className="flex-row items-center bg-white/10 border border-white/20 rounded-2xl px-4 py-4">
                                <Mail color="#94A3B8" size={20} />
                                <TextInput
                                    className="flex-1 ml-3 text-white text-base"
                                    placeholder="name@example.com"
                                    placeholderTextColor="#9CA3AF"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>
                        </View>

                        <View className="mt-4">
                            <Text className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2 ml-1">Пароль</Text>
                            <View className="flex-row items-center bg-white/10 border border-white/20 rounded-2xl px-4 py-4">
                                <Lock color="#94A3B8" size={20} />
                                <TextInput
                                    className="flex-1 ml-3 text-white text-base"
                                    placeholder="••••••••"
                                    placeholderTextColor="#9CA3AF"
                                    secureTextEntry
                                    value={password}
                                    onChangeText={setPassword}
                                />
                            </View>
                        </View>

                        {error && (
                            <Text className="text-danger text-sm mt-4 text-center">{error}</Text>
                        )}

                        <TouchableOpacity
                            onPress={handleLogin}
                            disabled={loading}
                            className={`bg-primary rounded-2xl py-4 items-center flex-row justify-center mt-8 ${loading ? 'opacity-70' : ''}`}
                        >
                            <Text className="text-white text-lg font-bold mr-2">
                                {loading ? 'Вход...' : 'Войти'}
                            </Text>
                            {!loading && <ChevronRight color="white" size={20} />}
                        </TouchableOpacity>

                        <TouchableOpacity className="items-center mt-6">
                            <Text className="text-muted text-sm">
                                Нет аккаунта? <Text className="text-primary font-bold">Зарегистрироваться</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
