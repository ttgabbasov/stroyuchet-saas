import { Tabs, useRouter } from 'expo-router';
import {
  Home,
  Building2,
  BarChart3,
  Settings,
  Plus,
  PieChart,
  Receipt,
  Wallet,
  LayoutPanelLeft
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import "../../global.css";
import { View, TouchableOpacity, Text } from 'react-native';
import React, { useState } from 'react';
import CreateTransactionModal from '../../components/CreateTransactionModal';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#0B0F19',
            borderBottomColor: '#1E293B',
          },
          headerTitleStyle: {
            color: '#fff',
            fontWeight: 'bold',
          },
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              className="mr-4 w-8 h-8 bg-primary rounded-full items-center justify-center shadow-lg shadow-primary/40"
            >
              <Plus color="#fff" size={20} />
            </TouchableOpacity>
          ),
          tabBarStyle: {
            backgroundColor: '#0B0F19',
            borderTopColor: '#1E293B',
            height: 65 + insets.bottom,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: '#2563EB',
          tabBarInactiveTintColor: '#94A3B8',
          tabBarLabelStyle: {
            fontSize: 9,
            fontWeight: '600',
            marginTop: 2,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Главная',
            tabBarLabel: 'Главная',
            tabBarIcon: ({ color }: { color: string }) => <Home color={color} size={20} />,
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: 'Аналитика',
            tabBarLabel: 'Аналитика',
            tabBarIcon: ({ color }: { color: string }) => <PieChart color={color} size={20} />,
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'Отчёты',
            tabBarLabel: 'Отчёты',
            tabBarIcon: ({ color }: { color: string }) => <BarChart3 color={color} size={20} />,
          }}
        />
        <Tabs.Screen
          name="projects"
          options={{
            title: 'Объекты',
            tabBarLabel: 'Объекты',
            tabBarIcon: ({ color }: { color: string }) => <Building2 color={color} size={20} />,
          }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: 'Операции',
            tabBarLabel: 'Операции',
            tabBarIcon: ({ color }: { color: string }) => <Receipt color={color} size={20} />,
          }}
        />
        <Tabs.Screen
          name="money-sources"
          options={{
            title: 'Кассы',
            tabBarLabel: 'Кассы',
            tabBarIcon: ({ color }: { color: string }) => <Wallet color={color} size={20} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Настройки',
            tabBarLabel: 'Настройки',
            tabBarIcon: ({ color }: { color: string }) => <Settings color={color} size={20} />,
          }}
        />

        {/* Hidden internal screens */}
        <Tabs.Screen name="operations" options={{ href: null }} />
        <Tabs.Screen name="cashboxes" options={{ href: null }} />
        <Tabs.Screen name="menu_trigger" options={{ href: null }} />
        <Tabs.Screen name="more" options={{ href: null }} />
        <Tabs.Screen name="two" options={{ href: null }} />
      </Tabs>

      <CreateTransactionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={() => { }}
        initialType="EXPENSE"
      />
    </>
  );
}

