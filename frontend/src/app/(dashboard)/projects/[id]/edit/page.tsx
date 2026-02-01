'use client';

import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, FolderKanban, MapPin, Trash2 } from 'lucide-react';
import { Button, Input, Card, Select, MoneyInput } from '@/components/ui';
import { useProject, useUpdateProject, useDeleteProject } from '@/lib/hooks';

const projectSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  address: z.string().optional(),
  budgetCents: z.number().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']),
});

type ProjectForm = z.infer<typeof projectSchema>;

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const { data: project, isLoading } = useProject(projectId);
  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    values: project ? {
      name: project.name,
      address: project.address || '',
      budgetCents: project.budgetCents,
      status: project.status,
    } : undefined,
  });

  const onSubmit = async (data: ProjectForm) => {
    try {
      await updateMutation.mutateAsync({ id: projectId, data });
      router.push(`/projects/${projectId}`);
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить объект? Это действие нельзя отменить.')) return;
    try {
      await deleteMutation.mutateAsync(projectId);
      router.push('/projects');
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Редактировать объект</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4 pb-24">
        <Card padding="lg">
          <Input
            label="Название объекта"
            placeholder="Ленина 15, квартира 42"
            leftIcon={<FolderKanban className="w-4 h-4" />}
            error={errors.name?.message}
            {...register('name')}
          />
        </Card>

        <Card padding="lg">
          <Input
            label="Адрес"
            placeholder="г. Москва, ул. Ленина, д. 15"
            leftIcon={<MapPin className="w-4 h-4" />}
            error={errors.address?.message}
            {...register('address')}
          />
        </Card>

        <Card padding="lg">
          <MoneyInput
            label="Бюджет (опционально)"
            value={watch('budgetCents')}
            onChange={(cents) => setValue('budgetCents', cents)}
          />
        </Card>

        <Card padding="lg">
          <Select
            label="Статус"
            options={[
              { value: 'ACTIVE', label: 'Активный' },
              { value: 'COMPLETED', label: 'Завершён' },
              { value: 'ARCHIVED', label: 'В архиве' },
            ]}
            {...register('status')}
          />
        </Card>

        <div className="space-y-3">
          <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
            Сохранить изменения
          </Button>

          <Button
            type="button"
            variant="danger"
            className="w-full"
            onClick={handleDelete}
            isLoading={deleteMutation.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Удалить объект
          </Button>
        </div>
      </form>
    </div>
  );
}
