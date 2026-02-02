'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Building2, Save, Upload, X } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { useCompany, useAuthStore, useIsOwner } from '@/store/auth';
import { apiPatch } from '@/lib/api';
import { useEffect } from 'react';

const companySchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
});

type CompanyForm = z.infer<typeof companySchema>;

export default function CompanyPage() {
  const router = useRouter();
  const company = useCompany();
  const setCompany = useAuthStore((state) => state.setCompany);
  const isOwner = useIsOwner();
  const [success, setSuccess] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  useEffect(() => {
    const savedLogo = localStorage.getItem('stroyuchet_company_logo');
    if (savedLogo) setLogoBase64(savedLogo);
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert('Файл слишком большой (макс 1МБ)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setLogoBase64(base64);
      localStorage.setItem('stroyuchet_company_logo', base64);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoBase64(null);
    localStorage.removeItem('stroyuchet_company_logo');
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company?.name || '',
    },
  });

  const onSubmit = async (data: CompanyForm) => {
    try {
      const response = await apiPatch<any>('/companies/current', data);
      setCompany(response);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update company:', error);
      alert('Ошибка при сохранении');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
        <div className="px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Компания</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4 max-w-2xl mx-auto">
        {success && (
          <div className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 text-success-800 dark:text-success-400 px-4 py-3 rounded-xl">
            Изменения сохранены
          </div>
        )}

        <Card padding="lg">
          <h3 className="font-medium mb-4 text-foreground">Логотип компании</h3>
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 rounded-2xl bg-muted flex items-center justify-center border-2 border-dashed border-border overflow-hidden transition-colors">
              {logoBase64 ? (
                <img src={logoBase64} alt="Company Logo" className="w-full h-full object-contain" />
              ) : (
                <Building2 className="w-10 h-10 text-muted-foreground opacity-50" />
              )}
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" className="relative cursor-pointer overflow-hidden">
                  <Upload className="w-3.5 h-3.5 mr-2" />
                  Загрузить
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleLogoUpload}
                    disabled={!isOwner}
                  />
                </Button>
                {logoBase64 && (
                  <Button variant="secondary" size="sm" onClick={removeLogo} disabled={!isOwner} className="text-danger-600 hover:text-danger-700 hover:bg-danger-50 dark:hover:bg-danger-900/20">
                    <X className="w-3.5 h-3.5 mr-1" />
                    Удалить
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Формат: PNG, SVG или WebP. Рекомендуемый размер: 512x512px. <br />
                <span className="font-medium text-primary-600 dark:text-primary-400">Логотип хранится только на этом устройстве.</span>
              </p>
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <Input
            label="Название компании"
            leftIcon={<Building2 className="w-4 h-4 text-muted-foreground" />}
            placeholder="Название вашей компании"
            error={errors.name?.message}
            disabled={!isOwner}
            {...register('name')}
          />
          {!isOwner && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              Только владелец может изменить название компании
            </p>
          )}
        </Card>

        <Card padding="lg">
          <h3 className="font-medium mb-4 text-foreground">Информация о тарифе</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">Тариф</span>
              <span className="font-semibold text-primary-600 dark:text-primary-400">{company?.plan || 'FREE'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">Объектов</span>
              <span className="font-medium">{(company as any)?.projectsCount || 0} / {(company as any)?.maxProjects || 1}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground">Пользователей</span>
              <span className="font-medium">{(company as any)?.usersCount || 1} / {(company as any)?.maxUsers || 1}</span>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="w-full mt-6"
            onClick={() => router.push('/settings/plan')}
          >
            Управление подпиской
          </Button>
        </Card>

        {isOwner && (
          <Button type="submit" className="w-full shadow-lg" size="lg" isLoading={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            Сохранить изменения
          </Button>
        )}
      </form>
    </div>
  );
}
