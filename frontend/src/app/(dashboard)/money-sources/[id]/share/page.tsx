'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, UserPlus, Eye, CreditCard, Trash2 } from 'lucide-react';
import { Button, Card, Select } from '@/components/ui';
import { useMoneySource, useCompanyUsers } from '@/lib/hooks';
import { apiPost, apiDelete } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/store/auth';
import { ROLE_LABELS } from '@/types';

export default function ShareMoneySourcePage() {
  const router = useRouter();
  const params = useParams();
  const moneySourceId = params.id as string;
  const queryClient = useQueryClient();
  const currentUser = useUser();

  const { data: moneySource, isLoading } = useMoneySource(moneySourceId);
  const { data: allUsers } = useCompanyUsers();

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [canView, setCanView] = useState(true);
  const [canSpend, setCanSpend] = useState(false);
  const [saving, setSaving] = useState(false);

  // Фильтруем пользователей, которые ещё не имеют доступа
  const availableUsers = allUsers?.filter(
    (u) =>
      u.id !== moneySource?.ownerId &&
      !moneySource?.sharedWith?.some((s) => s.userId === u.id)
  );

  const handleAddAccess = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    try {
      await apiPost(`/money-sources/${moneySourceId}/access`, {
        userId: selectedUserId,
        canView,
        canSpend,
      });
      queryClient.invalidateQueries({ queryKey: ['money-source', moneySourceId] });
      setShowAddForm(false);
      setSelectedUserId('');
    } catch (error: any) {
      alert(error?.response?.data?.error?.message || 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAccess = async (userId: string) => {
    if (!confirm('Отозвать доступ у пользователя?')) return;
    try {
      await apiDelete(`/money-sources/${moneySourceId}/access/${userId}`);
      queryClient.invalidateQueries({ queryKey: ['money-source', moneySourceId] });
    } catch (error: any) {
      alert(error?.response?.data?.error?.message || 'Ошибка');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }
  const isOwner = moneySource?.ownerId === currentUser?.id;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Доступы к кассе</h1>
          </div>
          {isOwner && !showAddForm && availableUsers && availableUsers.length > 0 && (
            <Button size="sm" onClick={() => setShowAddForm(true)}>
              <UserPlus className="w-4 h-4 mr-1" />
              Добавить
            </Button>
          )}
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Касса инфо */}
        <Card padding="lg">
          <h3 className="font-semibold text-foreground">{moneySource?.name}</h3>
          <p className="text-sm text-muted-foreground">
            Владелец: {moneySource?.ownerName}
          </p>
        </Card>

        {/* Форма добавления */}
        {showAddForm && (
          <Card padding="lg" className="border-primary-500/20 bg-primary-500/10">
            <h3 className="font-medium text-foreground mb-3">Дать доступ</h3>
            <div className="space-y-3">
              <Select
                label="Пользователь"
                placeholder="Выберите сотрудника"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                options={
                  availableUsers?.map((u) => ({
                    value: u.id,
                    label: `${u.name} (${ROLE_LABELS[u.role]})`,
                  })) || []
                }
              />

              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canView}
                    onChange={(e) => setCanView(e.target.checked)}
                    className="w-4 h-4 rounded border-border bg-muted/50 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">Может просматривать</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canSpend}
                    onChange={(e) => setCanSpend(e.target.checked)}
                    className="w-4 h-4 rounded border-border bg-muted/50 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">Может тратить</span>
                  </div>
                </label>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowAddForm(false)}>
                  Отмена
                </Button>
                <Button className="flex-1" onClick={handleAddAccess} isLoading={saving}>
                  Добавить
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Список пользователей с доступом */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Пользователи с доступом</h3>

          {(!moneySource?.sharedWith || moneySource.sharedWith.length === 0) ? (
            <Card padding="lg" className="text-center">
              <p className="text-gray-500">Доступ есть только у владельца</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {moneySource.sharedWith.map((access) => (
                <Card key={access.userId} padding="lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="font-medium text-muted-foreground">
                          {access.userName?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{access.userName}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {access.canView && (
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" /> Просмотр
                            </span>
                          )}
                          {access.canSpend && (
                            <span className="flex items-center gap-1">
                              <CreditCard className="w-3 h-3" /> Траты
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => handleRemoveAccess(access.userId)}
                        className="p-2 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
