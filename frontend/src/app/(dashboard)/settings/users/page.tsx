'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus, Mail, Trash2, CheckCircle2 } from 'lucide-react';
import { Button, Card, Input } from '@/components/ui';
import { useCompanyUsers } from '@/lib/hooks';
import { useIsOwner, useUser } from '@/store/auth';
import { apiPost, apiDelete } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { ROLE_LABELS } from '@/types';

export default function UsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useCompanyUsers();
  const isOwner = useIsOwner();
  const currentUser = useUser();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ACCOUNTANT' | 'FOREMAN' | 'VIEWER' | 'PARTNER'>('FOREMAN');
  const [sending, setSending] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<{ link: string; code: string } | null>(null);

  const handleInvite = async () => {
    setSending(true);
    try {
      const response = await apiPost<{ link: string; code: string }>('/users/invite', {
        email: inviteEmail || undefined,
        role: inviteRole
      });
      setCreatedInvite(response);
      if (inviteEmail) {
        alert('Приглашение отправлено на почту');
      }
      queryClient.invalidateQueries({ queryKey: ['company-users'] });
    } catch (error: any) {
      alert(error?.response?.data?.error?.message || 'Ошибка при отправке');
    } finally {
      setSending(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Ссылка скопирована!');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Пользователи</h1>
          </div>
          {isOwner && (
            <Button size="sm" onClick={() => {
              setShowInvite(true);
              setCreatedInvite(null);
              setInviteEmail('');
            }}>
              <UserPlus className="w-4 h-4 mr-1" />
              Пригласить
            </Button>
          )}
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Invite Modal */}
        {showInvite && (
          <Card padding="lg" className="border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/10">
            {!createdInvite ? (
              <>
                <h3 className="font-medium text-foreground mb-3">Пригласить сотрудника</h3>
                <div className="space-y-4">
                  <Input
                    label="Email (опционально)"
                    type="email"
                    placeholder="email@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    leftIcon={<Mail className="w-4 h-4" />}
                    description="Если указать почту, мы отправим письмо с приглашением автоматически."
                  />
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Роль</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                      className="w-full px-3 py-2 border border-border bg-card rounded-lg text-foreground focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                      <option value="FOREMAN">Прораб</option>
                      <option value="ACCOUNTANT">Бухгалтер</option>
                      {isOwner && <option value="PARTNER">Партнер</option>}
                      <option value="VIEWER">Наблюдатель</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" className="flex-1" onClick={() => setShowInvite(false)}>
                      Отмена
                    </Button>
                    <Button className="flex-1" onClick={handleInvite} isLoading={sending}>
                      {inviteEmail ? 'Отправить и создать' : 'Создать ссылку'}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-medium">
                  <CheckCircle2 className="w-5 h-5" />
                  Приглашение создано
                </div>
                <p className="text-sm text-muted-foreground">
                  Отправьте эту ссылку сотруднику. Она действительна в течение 7 дней.
                </p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={createdInvite.link}
                    className="flex-1 font-mono text-xs bg-muted/50"
                  />
                  <Button onClick={() => copyToClipboard(createdInvite.link)}>
                    Копировать
                  </Button>
                </div>
                <Button variant="secondary" className="w-full" onClick={() => setShowInvite(false)}>
                  Готово
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Users List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} padding="lg">
                <div className="animate-pulse flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : users?.length === 0 ? (
          <Card padding="lg" className="text-center">
            <p className="text-gray-500">Пользователей пока нет</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {users?.map((user) => (
              <Card key={user.id} padding="lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
                      <span className="font-medium text-primary-600 dark:text-primary-400">
                        {user.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      {ROLE_LABELS[user.role]}
                    </span>
                    {isOwner && user.id !== currentUser?.id && (
                      <button
                        onClick={() => handleRemove(user.id, user.name)}
                        className="p-2 text-muted-foreground hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
