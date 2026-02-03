import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Alert
} from 'react-native';
import { X } from 'lucide-react-native';
import { apiPost } from '../lib/api';

interface CreateProjectModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateProjectModal({
    visible,
    onClose,
    onSuccess
}: CreateProjectModalProps) {
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [budget, setBudget] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!name || name.trim().length < 2) {
            Alert.alert('Ошибка', 'Введите название объекта (минимум 2 символа)');
            return;
        }

        setLoading(true);
        try {
            await apiPost('/projects', {
                name: name.trim(),
                address: address.trim() || undefined,
                budgetCents: budget ? Math.round(parseFloat(budget.replace(',', '.')) * 100) : undefined,
            });
            onSuccess();
            resetForm();
            onClose();
        } catch (err: any) {
            Alert.alert('Ошибка', err.message || 'Не удалось создать объект');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setName('');
        setAddress('');
        setBudget('');
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-end bg-black/60">
                <View className="bg-background rounded-t-[40px] h-[70%] px-6 pt-6">
                    {/* Header */}
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-white text-xl font-bold">Новый объект</Text>
                        <TouchableOpacity onPress={onClose} className="p-2">
                            <X color="#94A3B8" size={24} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Name Input */}
                        <View className="mb-6">
                            <Text className="text-muted text-xs font-bold uppercase mb-2 ml-1">Название объекта</Text>
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                placeholder="Например: ЖК «Светлый»"
                                placeholderTextColor="#475569"
                                className="bg-card border border-secondary rounded-2xl p-4 text-white text-lg font-bold"
                            />
                        </View>

                        {/* Address Input */}
                        <View className="mb-6">
                            <Text className="text-muted text-xs font-bold uppercase mb-2 ml-1">Адрес</Text>
                            <TextInput
                                value={address}
                                onChangeText={setAddress}
                                placeholder="Улица, дом..."
                                placeholderTextColor="#475569"
                                className="bg-card border border-secondary rounded-2xl p-4 text-white text-sm"
                            />
                        </View>

                        {/* Budget Input */}
                        <View className="mb-8">
                            <Text className="text-muted text-xs font-bold uppercase mb-2 ml-1">Бюджет (₽) — опционально</Text>
                            <TextInput
                                value={budget}
                                onChangeText={setBudget}
                                placeholder="0.00"
                                placeholderTextColor="#475569"
                                keyboardType="decimal-pad"
                                className="bg-card border border-secondary rounded-2xl p-4 text-white text-lg font-bold"
                            />
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            onPress={handleCreate}
                            disabled={loading}
                            className={`bg-primary rounded-2xl p-5 items-center mb-10 shadow-lg shadow-primary/30 ${loading ? 'opacity-70' : ''
                                }`}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text className="text-white font-bold text-lg">Создать объект</Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
