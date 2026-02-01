'use client';

import { useState, useCallback } from 'react';

export interface PlanLimitError {
  limitType: 'projects' | 'users' | 'moneySources';
  currentCount: number;
  limit: number;
}

export function usePlanLimit() {
  const [limitError, setLimitError] = useState<PlanLimitError | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleApiError = useCallback((error: any) => {
    // Проверяем, является ли это ошибкой лимита
    if (error?.response?.data?.error?.code === 'PLAN_LIMIT') {
      const message = error.response.data.error.message as string;
      
      // Парсим сообщение для получения информации о лимите
      // Формат: "Лимит объектов исчерпан: 1/1. Обновите тариф."
      const match = message.match(/Лимит (\S+) исчерпан: (\d+)\/(\d+)/);
      
      if (match) {
        const typeMap: Record<string, PlanLimitError['limitType']> = {
          'объектов': 'projects',
          'пользователей': 'users',
          'касс': 'moneySources',
        };
        
        setLimitError({
          limitType: typeMap[match[1]] || 'projects',
          currentCount: parseInt(match[2], 10),
          limit: parseInt(match[3], 10),
        });
        setIsModalOpen(true);
        return true; // Ошибка обработана
      }
    }
    
    return false; // Ошибка не была лимитом
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setLimitError(null);
  }, []);

  return {
    limitError,
    isModalOpen,
    handleApiError,
    closeModal,
  };
}
