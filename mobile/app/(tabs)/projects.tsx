import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, Building2, MapPin, ChevronRight } from 'lucide-react-native';
import { useProjects, Project } from '../../hooks/useProjects';
import { useAuthStore } from '../../lib/auth';
import { apiGet } from '../../lib/api';
import { formatMoney } from '../../lib/utils';
import { useState } from 'react';
import CreateProjectModal from '../../components/CreateProjectModal';

export default function ProjectsScreen() {
    const { projects, loading, refreshing, refresh, error } = useProjects();
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.address?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="flex-1 px-4 pt-4">
                {/* Header */}
                <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-white text-2xl font-bold">Объекты</Text>
                </View>

                {/* Search - only show if there are projects */}
                {projects.length > 0 && (
                    <View className="bg-white/10 flex-row items-center px-4 h-12 rounded-2xl border border-white/20 mb-6">
                        <Search color="#94A3B8" size={20} />
                        <TextInput
                            placeholder="Поиск объектов..."
                            placeholderTextColor="#9CA3AF"
                            className="flex-1 ml-3 text-white"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                )}

                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#2563EB" />
                    }
                >
                    {loading && !refreshing ? (
                        <ActivityIndicator color="#2563EB" className="my-8" />
                    ) : error ? (
                        <View className="bg-danger/10 p-4 rounded-2xl items-center mb-4">
                            <Text className="text-danger">{error}</Text>
                        </View>
                    ) : filteredProjects.length === 0 ? (
                        <View className="bg-card rounded-[32px] p-10 items-center border border-secondary">
                            <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-6">
                                <Building2 color="#2563EB" size={40} />
                            </View>
                            <Text className="text-white font-bold text-xl mb-3 text-center">Объекты не найдены</Text>
                            <Text className="text-muted text-center mb-8 leading-5">
                                У вас пока нет созданных объектов. Добавьте первый объект, чтобы начать вести по нему учёт.
                            </Text>
                            <TouchableOpacity
                                onPress={() => setIsModalVisible(true)}
                                className="bg-primary px-8 py-4 rounded-2xl shadow-lg shadow-primary/30"
                            >
                                <Text className="text-white font-bold text-base">Добавить объект</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        filteredProjects.map((project) => (
                            <ProjectCard key={project.id} project={project} />
                        ))
                    )}

                    <View className="h-20" />
                </ScrollView>
            </View>

            <CreateProjectModal
                visible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
                onSuccess={refresh}
            />
        </SafeAreaView>
    );
}

function ProjectCard({ project }: { project: Project }) {
    const isCompleted = project.status === 'COMPLETED';

    return (
        <TouchableOpacity className="bg-card rounded-3xl p-5 mb-4 border border-secondary shadow-sm">
            <View className="flex-row justify-between items-start mb-4">
                <View className="flex-1">
                    <Text className="text-white font-bold text-lg mb-1">{project.name}</Text>
                    <View className="flex-row items-center">
                        <MapPin color="#94A3B8" size={14} />
                        <Text className="text-muted text-xs ml-1" numberOfLines={1}>
                            {project.address || 'Адрес не указан'}
                        </Text>
                    </View>
                </View>
                <View className={`px-3 py-1 rounded-full ${isCompleted ? 'bg-success/20' : 'bg-primary/20'
                    }`}>
                    <Text className={`text-[10px] font-bold ${isCompleted ? 'text-success' : 'text-primary'
                        }`}>
                        {isCompleted ? 'ЗАВЕРШЕН' : 'В РАБОТЕ'}
                    </Text>
                </View>
            </View>

            <View className="mb-4">
                <View className="flex-row justify-between mb-2">
                    <Text className="text-muted text-xs">Прогресс</Text>
                    <Text className="text-white text-xs font-bold">{project.progress}%</Text>
                </View>
                <View className="h-2 bg-secondary rounded-full overflow-hidden">
                    <View
                        className="h-full bg-primary"
                        style={{ width: `${project.progress}%` }}
                    />
                </View>
            </View>

            <View className="flex-row justify-between items-center border-t border-secondary pt-4">
                <View>
                    <Text className="text-muted text-[10px] uppercase font-semibold">Расход / Бюджет</Text>
                    <View className="flex-row items-center mt-1">
                        <Text className="text-white font-bold text-sm">{formatMoney(project.spentCents)}</Text>
                        <Text className="text-muted text-xs mx-1">/</Text>
                        <Text className="text-muted text-xs">{formatMoney(project.budgetCents)}</Text>
                    </View>
                </View>
                <ChevronRight color="#475569" size={20} />
            </View>
        </TouchableOpacity>
    );
}
