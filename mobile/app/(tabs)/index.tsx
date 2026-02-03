import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  ClipboardList,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Plus
} from 'lucide-react-native';
import { useDashboardData } from '../../hooks/useDashboardData';
import { formatMoney } from '../../lib/utils';
import { useAuthStore } from '../../lib/auth';
import CreateTransactionModal from '../../components/CreateTransactionModal';
import { useState } from 'react';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const { summary, transactions, loading, refreshing, refresh, error } = useDashboardData();
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'INCOME' | 'EXPENSE' | 'INTERNAL'>('EXPENSE');

  const firstName = user?.name?.split(' ')[0] || 'Пользователь';

  const openCreateModal = (type: 'INCOME' | 'EXPENSE' | 'INTERNAL') => {
    setModalType(type);
    setModalVisible(true);
  };

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
          <View>
            <Text className="text-muted text-sm">Добро пожаловать,</Text>
            <Text className="text-white text-2xl font-bold">{firstName}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/more')}
            className="w-12 h-12 rounded-full bg-primary/20 items-center justify-center border border-primary/30"
          >
            <Text className="text-primary font-bold text-lg">{firstName ? firstName[0] : 'U'}</Text>
          </TouchableOpacity>
        </View>

        {/* Status Notification - Show error if any */}
        {error ? (
          <View className="bg-danger/10 border border-danger/20 rounded-2xl p-4 flex-row items-center mb-6">
            <Text className="text-danger flex-1 ml-3">{error}</Text>
          </View>
        ) : (!summary) ? (
          <View className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex-row items-center mb-6">
            <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center mr-3">
              <Plus color="#2563EB" size={20} />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold">Нет объектов в работе</Text>
              <TouchableOpacity onPress={() => router.push('/projects')}>
                <Text className="text-primary text-xs font-semibold">Добавить первый объект</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="bg-success/20 border border-success/30 rounded-2xl p-4 flex-row items-center mb-6">
            <CheckCircle2 color="#10B981" size={24} />
            <Text className="text-white flex-1 ml-3">Все объекты в работе</Text>
          </View>
        )}

        {/* Main Balance Card */}
        <View className="bg-primary rounded-[32px] p-6 mb-8 shadow-xl shadow-primary/40 overflow-hidden relative">
          {/* Subtle background circles for premium look */}
          <View className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
          <View className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-black/10" />

          <Text className="text-white/80 text-sm mb-1 uppercase tracking-wider font-semibold">Ваш баланс</Text>
          <Text className="text-white text-4xl font-bold mb-6">
            {loading ? '...' : formatMoney(summary?.totalBalanceCents || 0)}
          </Text>

          <View className="flex-row justify-between border-t border-white/20 pt-6">
            <View>
              <View className="flex-row items-center mb-1">
                <ArrowUpRight color="#fff" size={14} className="mr-1" />
                <Text className="text-white/80 text-xs">Доходы</Text>
              </View>
              <Text className="text-white text-lg font-bold">
                {loading ? '...' : formatMoney(summary?.monthlyIncomeCents || 0)}
              </Text>
            </View>
            <View className="w-px bg-white/20" />
            <View>
              <View className="flex-row items-center mb-1">
                <ArrowDownLeft color="#fff" size={14} className="mr-1" />
                <Text className="text-white/80 text-xs">Расходы</Text>
              </View>
              <Text className="text-white text-lg font-bold">
                {loading ? '...' : formatMoney(summary?.monthlyExpenseCents || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mb-8">
          <Text className="text-white text-lg font-bold mb-4">Быстрые действия</Text>
          <View className="flex-row justify-between">
            <QuickAction
              icon={<ArrowUpRight color="#10B981" size={24} />}
              label="Приход"
              onPress={() => openCreateModal('INCOME')}
            />
            <QuickAction
              icon={<ArrowDownLeft color="#EF4444" size={24} />}
              label="Расход"
              onPress={() => openCreateModal('EXPENSE')}
            />
            <QuickAction
              icon={<ArrowLeftRight color="#2563EB" size={24} />}
              label="Перевод"
              onPress={() => openCreateModal('INTERNAL')}
            />
            <QuickAction icon={<ClipboardList color="#94A3B8" size={24} />} label="Отчёт" />
          </View>
        </View>

        {/* Recent Transactions */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white text-lg font-bold">Последние операции</Text>
            <TouchableOpacity>
              <Text className="text-primary text-sm font-semibold">Все</Text>
            </TouchableOpacity>
          </View>

          {loading && !refreshing ? (
            <ActivityIndicator color="#2563EB" className="my-4" />
          ) : transactions.length === 0 ? (
            <View className="bg-card rounded-2xl p-8 items-center border border-secondary">
              <Text className="text-muted">Нет операций за последнее время</Text>
            </View>
          ) : (
            transactions.map((tx) => (
              <TransactionItem
                key={tx.id}
                type={tx.type}
                amountCents={tx.amountCents}
                category={tx.category}
                projectName={tx.projectName}
                comment={tx.comment}
                date={tx.date}
              />
            ))
          )}
        </View>

        {/* Extra Bottom Spacing for Tab Bar */}
        <View className="h-20" />
      </ScrollView>

      <CreateTransactionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={refresh}
        initialType={modalType}
      />
    </SafeAreaView>
  );
}

function TransactionItem({ type, amountCents, category, projectName, comment, date }: any) {
  const isIncome = type === 'INCOME';
  return (
    <TouchableOpacity
      className="bg-card rounded-2xl p-4 flex-row items-center border border-secondary mb-3"
    >
      <View className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${isIncome ? 'bg-success/10' : 'bg-danger/10'
        }`}>
        {isIncome ? (
          <TrendingUp color="#10B981" size={20} />
        ) : (
          <TrendingDown color="#EF4444" size={20} />
        )}
      </View>
      <View className="flex-1">
        <Text className="text-white font-bold text-sm">{typeof category === 'string' ? category : category.name}</Text>
        <Text className="text-muted text-xs" numberOfLines={1}>
          {projectName || 'Без объекта'} • {comment || 'Без комментария'}
        </Text>
      </View>
      <View className="items-end">
        <Text className={`font-bold text-sm ${isIncome ? 'text-success' : 'text-white'
          }`}>
          {isIncome ? '+' : '-'}{formatMoney(amountCents)}
        </Text>
        <View className="flex-row items-center">
          <Text className="text-muted text-[10px]">
            {new Date(date).toLocaleDateString('ru-RU')}
          </Text>
          <ChevronRight color="#475569" size={12} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function QuickAction({ icon, label, onPress }: { icon: React.ReactNode, label: string, onPress?: () => void }) {
  return (
    <TouchableOpacity className="items-center" onPress={onPress}>
      <View className="w-14 h-14 bg-card rounded-2xl items-center justify-center border border-secondary mb-2">
        {icon}
      </View>
      <Text className="text-muted text-xs">{label}</Text>
    </TouchableOpacity>
  );
}
