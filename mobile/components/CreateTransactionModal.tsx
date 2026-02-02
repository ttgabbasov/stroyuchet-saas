import React, { useState, useEffect } from 'react';
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
import { X, ChevronDown, Check } from 'lucide-react-native';
import { useProjects } from '../hooks/useProjects';
import { useCategories } from '../hooks/useCategories';
import { apiPost } from '../lib/api';

interface CreateTransactionModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialType?: 'INCOME' | 'EXPENSE' | 'INTERNAL' | 'PAYOUT';
}

export default function CreateTransactionModal({
    visible,
    onClose,
    onSuccess,
    initialType = 'EXPENSE'
}: CreateTransactionModalProps) {
    const [type, setType] = useState(initialType);
    const [amount, setAmount] = useState('');
    const [projectId, setProjectId] = useState<string | null>(null);
    const [categoryId, setCategoryId] = useState<string | null>(null);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);

    const { projects, loading: loadingProjects } = useProjects();
    const { groups, ungrouped, loading: loadingCategories } = useCategories(type);

    // Reset category if type changes
    useEffect(() => {
        setCategoryId(null);
    }, [type]);

    const allCategories = [
        ...ungrouped,
        ...groups.flatMap(g => g.categories)
    ];

    const handleCreate = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            Alert.alert('Ошибка', 'Введите корректную сумму');
            return;
        }
        if (!categoryId) {
            Alert.alert('Ошибка', 'Выберите категорию');
            return;
        }

        setLoading(true);
        try {
            await apiPost('/transactions', {
                type,
                amountCents: Math.round(parseFloat(amount.replace(',', '.')) * 100),
                projectId,
                categoryId,
                comment,
                date: new Date().toISOString(),
            });
            onSuccess();
            resetForm();
            onClose();
        } catch (err: any) {
            Alert.alert('Ошибка', err.message || 'Не удалось создать операцию');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setAmount('');
        setProjectId(null);
        setCategoryId(null);
        setComment('');
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-end bg-black/60">
                <View className="bg-background rounded-t-[40px] h-[90%] px-6 pt-6">
                    {/* Header */}
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-white text-xl font-bold">Новая операция</Text>
                        <TouchableOpacity onPress={onClose} className="p-2">
                            <X color="#94A3B8" size={24} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Type Selector */}
                        <View className="flex-row bg-card rounded-2xl p-1 mb-6 border border-secondary">
                            {(['EXPENSE', 'INCOME', 'INTERNAL'] as const).map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    onPress={() => setType(t)}
                                    className={`flex-1 py-3 rounded-xl items-center ${type === t ? 'bg-primary' : ''
                                        }`}
                                >
                                    <Text className={`font-bold text-xs ${type === t ? 'text-white' : 'text-muted'
                                        }`}>
                                        {t === 'EXPENSE' ? 'Расход' : t === 'INCOME' ? 'Приход' : 'Перевод'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Amount Input */}
                        <View className="mb-6">
                            <Text className="text-muted text-xs font-bold uppercase mb-2 ml-1">Сумма (₽)</Text>
                            <TextInput
                                value={amount}
                                onChangeText={setAmount}
                                placeholder="0.00"
                                placeholderTextColor="#475569"
                                keyboardType="decimal-pad"
                                className="bg-card border border-secondary rounded-2xl p-4 text-white text-3xl font-bold"
                            />
                        </View>

                        {/* Project Selector */}
                        <View className="mb-6">
                            <Text className="text-muted text-xs font-bold uppercase mb-2 ml-1">Объект</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                <TouchableOpacity
                                    onPress={() => setProjectId(null)}
                                    className={`px-4 py-2 rounded-full border mr-2 ${projectId === null ? 'bg-primary border-primary' : 'bg-card border-secondary'
                                        }`}
                                >
                                    <Text className={`text-xs ${projectId === null ? 'text-white' : 'text-muted'}`}>
                                        Без объекта
                                    </Text>
                                </TouchableOpacity>
                                {projects.map((p) => (
                                    <TouchableOpacity
                                        key={p.id}
                                        onPress={() => setProjectId(p.id)}
                                        className={`px-4 py-2 rounded-full border mr-2 ${projectId === p.id ? 'bg-primary border-primary' : 'bg-card border-secondary'
                                            }`}
                                    >
                                        <Text className={`text-xs ${projectId === p.id ? 'text-white' : 'text-muted'}`}>
                                            {p.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Category Selector */}
                        <View className="mb-6">
                            <Text className="text-muted text-xs font-bold uppercase mb-2 ml-1">Категория</Text>
                            <View className="flex-row flex-wrap">
                                {loadingCategories ? (
                                    <ActivityIndicator color="#2563EB" />
                                ) : (
                                    allCategories.map((cat) => (
                                        <TouchableOpacity
                                            key={cat.id}
                                            onPress={() => setCategoryId(cat.id)}
                                            className={`px-3 py-2 rounded-xl border m-1 flex-row items-center ${categoryId === cat.id ? 'bg-primary/20 border-primary' : 'bg-card border-secondary'
                                                }`}
                                        >
                                            <Text className="mr-2 text-sm">{cat.icon}</Text>
                                            <Text className={`text-xs ${categoryId === cat.id ? 'text-primary font-bold' : 'text-white'}`}>
                                                {cat.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))
                                )}
                            </View>
                        </View>

                        {/* Comment */}
                        <View className="mb-8">
                            <Text className="text-muted text-xs font-bold uppercase mb-2 ml-1">Комментарий</Text>
                            <TextInput
                                value={comment}
                                onChangeText={setComment}
                                placeholder="На что потрачено..."
                                placeholderTextColor="#475569"
                                multiline
                                numberOfLines={3}
                                className="bg-card border border-secondary rounded-2xl p-4 text-white text-sm min-h-[100px]"
                                textAlignVertical="top"
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
                                <Text className="text-white font-bold text-lg">Создать операцию</Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
