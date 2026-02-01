'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, FolderKanban, MapPin } from 'lucide-react';
import { Button, Input, Card, MoneyInput } from '@/components/ui';
import { apiPost } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useCompany } from '@/store/auth';
import { PlanLimitModal } from '@/components/modals/plan-limit-modal';
import { usePlanLimit } from '@/hooks/use-plan-limit';

// ============================================
// Validation Schema
// ============================================

const projectSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  address: z.string().optional(),
  budgetCents: z.number().optional(),
});

type ProjectForm = z.infer<typeof projectSchema>;

// ============================================
// Page Component
// ============================================

export default function NewProjectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const company = useCompany();
  const { limitError, isModalOpen, handleApiError, closeModal } = usePlanLimit();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
  });

  const onSubmit = async (data: ProjectForm) => {
    try {
      await apiPost('/projects', data);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      router.push('/projects');
    } catch (error: any) {
      // Проверяем, является ли это ошибкой лимита
      if (!handleApiError(error)) {
        // Если это другая ошибка, показываем стандартное сообщение
        console.error('Failed to create project:', error);
        alert(error?.response?.data?.error?.message || 'Ошибка при создании объекта');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="px-4 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Новый объект</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4 pb-24">
        {/* Name */}
        <Card padding="lg">
          <Input
            label="Название объекта"
            placeholder="Ленина 15, квартира 42"
            leftIcon={<FolderKanban className="w-4 h-4" />}
            error={errors.name?.message}
            {...register('name')}
          />
        </Card>

        {/* Address */}
        <Card padding="lg">
          <Input
            label="Адрес"
            placeholder="г. Москва, ул. Ленина, д. 15"
            leftIcon={<MapPin className="w-4 h-4" />}
            error={errors.address?.message}
            {...register('address')}
          />
        </Card>

        {/* Budget */}
        <Card padding="lg">
          <MoneyInput
            label="Бюджет (опционально)"
            value={watch('budgetCents')}
            onChange={(cents) => setValue('budgetCents', cents)}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Если указать бюджет, вы сможете отслеживать прогресс расходов
          </p>
        </Card>

        {/* Submit Button */}
        <div className="mt-6">
          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isSubmitting}
          >
            Создать объект
          </Button>
        </div>
      </form>

      {/* Plan Limit Modal */}
      <PlanLimitModal
        isOpen={isModalOpen}
        onClose={closeModal}
        limitType={limitError?.limitType || 'projects'}
        currentPlan={company?.plan || 'FREE'}
        currentCount={limitError?.currentCount || 0}
        limit={limitError?.limit || 1}
      />
    </div>
  );
}
