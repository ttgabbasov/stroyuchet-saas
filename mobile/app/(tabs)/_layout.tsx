import { Tabs } from 'expo-router';
import { Home, Building2, BarChart3, Menu, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import "../../global.css";
import NavBottomSheet from '../../components/NavBottomSheet';
import { View, TouchableOpacity } from 'react-native';
import React, { useState } from 'react';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const [showNav, setShowNav] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#0B0F19',
            borderTopColor: '#1E293B',
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
            paddingTop: 10,
          },
          tabBarActiveTintColor: '#2563EB',
          tabBarInactiveTintColor: '#94A3B8',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Главная',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => <Home color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="projects"
          options={{
            title: 'Объекты',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => <Building2 color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="menu_trigger"
          options={{
            title: 'Меню',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <View className="w-12 h-12 bg-primary rounded-2xl items-center justify-center -mt-6 border-4 border-background">
                <Plus color="#fff" size={24} />
              </View>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setShowNav(true);
            },
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'Отчёты',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => <BarChart3 color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'Ещё',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => <Menu color={color} size={size} />,
          }}
        />
        <Tabs.Screen name="operations" options={{ href: null }} />
        <Tabs.Screen name="cashboxes" options={{ href: null }} />
        <Tabs.Screen name="two" options={{ href: null }} />
      </Tabs>

      <NavBottomSheet
        isVisible={showNav}
        onClose={() => setShowNav(false)}
      />
    </>
  );
}

