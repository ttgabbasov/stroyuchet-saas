'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, FolderKanban, ChevronRight } from 'lucide-react';
import { Card, Button, Input, AmountDisplay } from '@/components/ui';
import { useProjects } from '@/lib/hooks';
import { STATUS_LABELS, ProjectStatus } from '@/types';
import { clsx } from 'clsx';

// ============================================
// Projects List Page
// ============================================

export default function ProjectsPage() {
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('');
  const [search, setSearch] = useState('');

  const { data: projects, isLoading } = useProjects();

  const filteredProjects = projects?.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusFilters: { value: ProjectStatus | ''; label: string }[] = [
    { value: '', label: 'Все' },
    { value: 'ACTIVE', label: 'Активные' },
    { value: 'COMPLETED', label: 'Завершённые' },
    { value: 'ARCHIVED', label: 'Архив' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Объекты</h1>
        <Link href="/projects/new">
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
            Добавить
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Input
        placeholder="Поиск по названию..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={<Search className="w-4 h-4" />}
      />

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={clsx(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              statusFilter === filter.value
                ? 'bg-primary-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Projects List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredProjects && filteredProjects.length > 0 ? (
        <div className="space-y-2">
          {filteredProjects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card
                padding="none"
                className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0 transition-colors">
                    <FolderKanban className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-foreground truncate">
                        {project.name}
                      </p>
                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={clsx(
                          'text-xs px-2 py-0.5 rounded-full font-medium transition-colors',
                          project.status === 'ACTIVE'
                            ? 'bg-success-100 dark:bg-success-900/20 text-success-700 dark:text-success-400'
                            : project.status === 'COMPLETED'
                              ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                              : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {STATUS_LABELS[project.status]}
                      </span>
                      <AmountDisplay
                        cents={project.balance.balanceCents}
                        type="balance"
                        size="sm"
                      />
                    </div>
                  </div>
                </div>

                {project.address && (
                  <p className="text-sm text-muted-foreground mt-2 truncate pl-13">
                    {project.address}
                  </p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <FolderKanban className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground mb-4">
            {search || statusFilter ? 'Ничего не найдено' : 'Нет объектов'}
          </p>
          {!search && !statusFilter && (
            <Link href="/projects/new">
              <Button>Создать первый</Button>
            </Link>
          )}
        </Card>
      )}
    </div>
  );
}
