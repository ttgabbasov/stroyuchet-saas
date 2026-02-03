import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Building2, Landmark, Repeat, Settings, X, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface NavBottomSheetProps {
    isVisible: boolean;
    onClose: () => void;
}

export default function NavBottomSheet({ isVisible, onClose }: NavBottomSheetProps) {
    const router = useRouter();
    const bottomSheetRef = useRef<BottomSheet>(null);

    // Variables
    const snapPoints = useMemo(() => ['45%'], []);

    // Callbacks
    const handleSheetChanges = useCallback((index: number) => {
        if (index === -1) {
            onClose();
        }
    }, [onClose]);

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.5}
            />
        ),
        []
    );

    const navigateTo = (path: any) => {
        onClose();
        router.push(path);
    };

    if (!isVisible) return null;

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={0}
            snapPoints={snapPoints}
            onChange={handleSheetChanges}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            backgroundStyle={styles.background}
            handleIndicatorStyle={styles.indicator}
        >
            <BottomSheetView style={styles.contentContainer}>
                <View className="flex-row justify-between items-center mb-6 px-6">
                    <Text className="text-white text-xl font-bold">Навигация</Text>
                    <TouchableOpacity onPress={onClose} className="p-2 bg-secondary/50 rounded-full">
                        <X color="#94A3B8" size={20} />
                    </TouchableOpacity>
                </View>

                <View className="px-4">
                    <NavItem
                        icon={<Building2 color="#2563EB" size={24} />}
                        label="Объекты"
                        description="Управление вашими стройками"
                        onPress={() => navigateTo('/projects')}
                    />
                    <NavItem
                        icon={<Repeat color="#10B981" size={24} />}
                        label="Операции"
                        description="Список всех приходов и расходов"
                        onPress={() => navigateTo('/operations')}
                    />
                    <NavItem
                        icon={<Landmark color="#F59E0B" size={24} />}
                        label="Кассы"
                        description="Счета и наличные средства"
                        onPress={() => navigateTo('/cashboxes')}
                    />
                    <NavItem
                        icon={<Settings color="#94A3B8" size={24} />}
                        label="Настройки"
                        description="Профиль и команда"
                        onPress={() => navigateTo('/more')}
                    />
                </View>
            </BottomSheetView>
        </BottomSheet>
    );
}

function NavItem({ icon, label, description, onPress }: any) {
    return (
        <TouchableOpacity
            onPress={onPress}
            className="flex-row items-center p-4 bg-secondary/20 rounded-2xl mb-3 active:bg-secondary/40"
        >
            <View className="w-12 h-12 bg-card rounded-xl items-center justify-center mr-4">
                {icon}
            </View>
            <View className="flex-1">
                <Text className="text-white font-bold text-base">{label}</Text>
                <Text className="text-muted text-xs">{description}</Text>
            </View>
            <ChevronRight color="#475569" size={20} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    background: {
        backgroundColor: '#0B0F19',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
    },
    indicator: {
        backgroundColor: '#334155',
        width: 40,
    },
    contentContainer: {
        paddingTop: 12,
        paddingBottom: 40,
    },
});
