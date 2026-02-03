'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, FolderKanban, MapPin, Trash2, AlertTriangle } from 'lucide-react';
import { Button, Input, Card, Select, MoneyInput, Dialog } from '@/components/ui';
import { useProject, useUpdateProject, useInitiateDeleteProject, useConfirmDeleteProject } from '@/lib/hooks';

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

  // Secure Deletion Hooks
  const initiateDeleteMutation = useInitiateDeleteProject();
  const confirmDeleteMutation = useConfirmDeleteProject();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [deleteStep, setDeleteStep] = useState<'CONFIRM' | 'CODE'>('CONFIRM');
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  // 1. Open Modal
  const handleDeleteClick = () => {
    setDeleteError(null);
    setDeleteStep('CONFIRM');
    setIsDeleteModalOpen(true);
  };

  // 2. Send Code
  const handleRequestCode = async () => {
    try {
      setDeleteError(null);
      await initiateDeleteMutation.mutateAsync(projectId);
      setDeleteStep('CODE');
    } catch (error: any) {
      setDeleteError(error.message || 'Ошибка отправки кода');
    }
  };

  // 3. Confirm Delete
  const handleConfirmDelete = async () => {
    try {
      setDeleteError(null);
      await confirmDeleteMutation.mutateAsync({ id: projectId, code: verificationCode });
      setIsDeleteModalOpen(false);
      router.push('/projects');
    } catch (error: any) {
      setDeleteError(error.message || 'Неверный код');
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
            onClick={handleDeleteClick}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Удалить объект
          </Button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      <Dialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Удаление объекта"
      >
        <div className="space-y-4">
          {deleteStep === 'CONFIRM' ? (
            <>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg flex gap-3 text-yellow-800 dark:text-yellow-200">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p className="text-sm">
                  Это действие необратимо. Если по объекту есть транзакции, он будет перемещен в <b>Архив</b>.
                  Если транзакций нет — он будет <b>удален навсегда</b>.
                </p>
              </div>

              {deleteError && (
                <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{deleteError}</p>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setIsDeleteModalOpen(false)}>
                  Отмена
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={handleRequestCode}
                  isLoading={initiateDeleteMutation.isPending}
                >
                  Запросить код удаления
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                На почту владельца отправлен 6-значный код. Введите его для подтверждения.
              </p>

              <Input
                label="Код подтверждения"
                placeholder="XXXXXX"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                error={deleteError || undefined}
                className="text-center text-2xl tracking-widest uppercase font-mono"
              />

              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setIsDeleteModalOpen(false)}>
                  Отмена
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={handleConfirmDelete}
                  isLoading={confirmDeleteMutation.isPending}
                  disabled={verificationCode.length < 6}
                >
                  Подтвердить удаление
                </Button>
              </div>
            </>
          )}
        </div>
      </Dialog>
    </div>
  );
}
