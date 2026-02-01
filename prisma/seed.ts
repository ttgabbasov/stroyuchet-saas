// ============================================
// Database Seed v2 - Categories & Plan Configs
// ============================================
// Запуск: npm run db:seed
// 
// Типы транзакций:
// - INCOME: доходы проекта (влияют на баланс)
// - EXPENSE: расходы проекта (влияют на баланс)
// - PAYOUT: выплаты сотрудникам (НЕ влияют на баланс проекта)
// - INTERNAL: переводы между кассами (НЕ влияют на баланс)
// ============================================

import { PrismaClient, TransactionType, Plan } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database v2...');

  // ============================================
  // PLAN CONFIGS
  // ============================================

  console.log('📋 Creating plan configs...');

  await prisma.planConfig.upsert({
    where: { plan: Plan.FREE },
    update: { maxMoneySources: 1 },
    create: {
      plan: Plan.FREE,
      maxProjects: 1,
      maxUsers: 1,
      maxMoneySources: 1,
      exportEnabled: false,
      analyticsEnabled: false,
      apiEnabled: false,
    },
  });

  await prisma.planConfig.upsert({
    where: { plan: Plan.PRO },
    update: { maxMoneySources: 5 },
    create: {
      plan: Plan.PRO,
      maxProjects: 5,
      maxUsers: 5,
      maxMoneySources: 5,
      exportEnabled: true,
      analyticsEnabled: false,
      apiEnabled: false,
    },
  });

  await prisma.planConfig.upsert({
    where: { plan: Plan.BUSINESS },
    update: { maxMoneySources: 999999 },
    create: {
      plan: Plan.BUSINESS,
      maxProjects: 999999,
      maxUsers: 999999,
      maxMoneySources: 999999,
      exportEnabled: true,
      analyticsEnabled: true,
      apiEnabled: true,
    },
  });

  // ============================================
  // CATEGORY GROUPS
  // ============================================

  console.log('📁 Creating category groups...');

  const groups = await Promise.all([
    // Группы для EXPENSE (расходы проекта)
    prisma.categoryGroup.upsert({
      where: { id: 'grp_materials' },
      update: {},
      create: { id: 'grp_materials', name: 'Материалы', sortOrder: 1 },
    }),
    prisma.categoryGroup.upsert({
      where: { id: 'grp_services' },
      update: {},
      create: { id: 'grp_services', name: 'Услуги', sortOrder: 2 },
    }),
    prisma.categoryGroup.upsert({
      where: { id: 'grp_overhead' },
      update: {},
      create: { id: 'grp_overhead', name: 'Накладные', sortOrder: 3 },
    }),
    // Группа для PAYOUT (выплаты)
    prisma.categoryGroup.upsert({
      where: { id: 'grp_payout' },
      update: {},
      create: { id: 'grp_payout', name: 'Выплаты', sortOrder: 4 },
    }),
    // Группа для INCOME (доходы)
    prisma.categoryGroup.upsert({
      where: { id: 'grp_income' },
      update: {},
      create: { id: 'grp_income', name: 'Доходы', sortOrder: 5 },
    }),
  ]);

  console.log(`   Created ${groups.length} groups`);

  // ============================================
  // EXPENSE CATEGORIES (Расходы проекта)
  // Влияют на баланс проекта
  // ============================================

  console.log('💸 Creating EXPENSE categories (project costs)...');

  const expenseCategories = [
    // Материалы
    { id: 'cat_construction', name: 'Строительные материалы', icon: '🧱', color: '#dc2626', groupId: 'grp_materials', sortOrder: 1 },
    { id: 'cat_finishing', name: 'Отделочные материалы', icon: '🎨', color: '#ea580c', groupId: 'grp_materials', sortOrder: 2 },
    { id: 'cat_electrical', name: 'Электрика', icon: '⚡', color: '#ca8a04', groupId: 'grp_materials', sortOrder: 3 },
    { id: 'cat_plumbing', name: 'Сантехника', icon: '🚿', color: '#2563eb', groupId: 'grp_materials', sortOrder: 4 },
    { id: 'cat_tools', name: 'Инструменты', icon: '🔧', color: '#7c3aed', groupId: 'grp_materials', sortOrder: 5 },
    { id: 'cat_materials_other', name: 'Прочие материалы', icon: '📦', color: '#64748b', groupId: 'grp_materials', sortOrder: 6 },

    // Услуги
    { id: 'cat_delivery', name: 'Доставка', icon: '🚚', color: '#0891b2', groupId: 'grp_services', sortOrder: 1 },
    { id: 'cat_equipment', name: 'Аренда техники', icon: '🏗️', color: '#0d9488', groupId: 'grp_services', sortOrder: 2 },
    { id: 'cat_rent', name: 'Аренда помещений', icon: '🔑', color: '#059669', groupId: 'grp_services', sortOrder: 3 },
    { id: 'cat_subcontract', name: 'Субподряд', icon: '👷', color: '#16a34a', groupId: 'grp_services', sortOrder: 4 },
    { id: 'cat_services_other', name: 'Прочие услуги', icon: '🛠️', color: '#64748b', groupId: 'grp_services', sortOrder: 5 },

    // Накладные
    { id: 'cat_fuel', name: 'ГСМ', icon: '⛽', color: '#ef4444', groupId: 'grp_overhead', sortOrder: 1 },
    { id: 'cat_food', name: 'Питание', icon: '🍽️', color: '#f97316', groupId: 'grp_overhead', sortOrder: 2 },
    { id: 'cat_office', name: 'Офисные расходы', icon: '🏢', color: '#eab308', groupId: 'grp_overhead', sortOrder: 3 },
    { id: 'cat_transport', name: 'Транспорт', icon: '🚗', color: '#84cc16', groupId: 'grp_overhead', sortOrder: 4 },
    { id: 'cat_communication', name: 'Связь', icon: '📱', color: '#06b6d4', groupId: 'grp_overhead', sortOrder: 5 },
    { id: 'cat_overhead_other', name: 'Прочие накладные', icon: '📋', color: '#64748b', groupId: 'grp_overhead', sortOrder: 6 },
  ];

  for (const cat of expenseCategories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: { allowedTypes: [TransactionType.EXPENSE] },
      create: {
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        allowedTypes: [TransactionType.EXPENSE],
        groupId: cat.groupId,
        sortOrder: cat.sortOrder,
        isSystem: true,
      },
    });
  }

  console.log(`   Created ${expenseCategories.length} expense categories`);

  // ============================================
  // PAYOUT CATEGORIES (Выплаты сотрудникам)
  // НЕ влияют на баланс проекта
  // ============================================

  console.log('💰 Creating PAYOUT categories (employee payments)...');

  const payoutCategories = [
    { id: 'cat_payout_workers', name: 'Выплата рабочим', icon: '👷‍♂️', color: '#9333ea', groupId: 'grp_payout', sortOrder: 1 },
    { id: 'cat_payout_foreman', name: 'Выплата прорабу', icon: '👨‍💼', color: '#c026d3', groupId: 'grp_payout', sortOrder: 2 },
    { id: 'cat_payout_advance', name: 'Аванс сотруднику', icon: '💸', color: '#a855f7', groupId: 'grp_payout', sortOrder: 3 },
    { id: 'cat_payout_bonus', name: 'Премия', icon: '🎁', color: '#d946ef', groupId: 'grp_payout', sortOrder: 4 },
    { id: 'cat_payout_other', name: 'Прочие выплаты', icon: '💵', color: '#64748b', groupId: 'grp_payout', sortOrder: 5 },
  ];

  for (const cat of payoutCategories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: { allowedTypes: [TransactionType.PAYOUT] },
      create: {
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        allowedTypes: [TransactionType.PAYOUT],
        groupId: cat.groupId,
        sortOrder: cat.sortOrder,
        isSystem: true,
      },
    });
  }

  console.log(`   Created ${payoutCategories.length} payout categories`);

  // ============================================
  // INCOME CATEGORIES (Доходы)
  // Влияют на баланс проекта
  // ============================================

  console.log('📈 Creating INCOME categories...');

  const incomeCategories = [
    { id: 'cat_income_client', name: 'От заказчика', icon: '💵', color: '#22c55e', groupId: 'grp_income', sortOrder: 1 },
    { id: 'cat_income_advance', name: 'Аванс от заказчика', icon: '💳', color: '#10b981', groupId: 'grp_income', sortOrder: 2 },
    { id: 'cat_income_additional', name: 'Доп. работы', icon: '➕', color: '#34d399', groupId: 'grp_income', sortOrder: 3 },
    { id: 'cat_income_scrap', name: 'Металлолом / возврат', icon: '♻️', color: '#14b8a6', groupId: 'grp_income', sortOrder: 4 },
    { id: 'cat_income_other', name: 'Прочие доходы', icon: '💰', color: '#64748b', groupId: 'grp_income', sortOrder: 5 },
  ];

  for (const cat of incomeCategories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: { allowedTypes: [TransactionType.INCOME] },
      create: {
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        allowedTypes: [TransactionType.INCOME],
        groupId: cat.groupId,
        sortOrder: cat.sortOrder,
        isSystem: true,
      },
    });
  }

  console.log(`   Created ${incomeCategories.length} income categories`);

  // ============================================
  // INTERNAL CATEGORY (Переводы между кассами)
  // НЕ влияют на баланс проекта
  // ============================================

  console.log('🔄 Creating INTERNAL category...');

  await prisma.category.upsert({
    where: { id: 'cat_internal_transfer' },
    update: { allowedTypes: [TransactionType.INTERNAL] },
    create: {
      id: 'cat_internal_transfer',
      name: 'Перевод между кассами',
      icon: '🔄',
      color: '#6366f1',
      allowedTypes: [TransactionType.INTERNAL],
      sortOrder: 1,
      isSystem: true,
    },
  });

  // ============================================
  // CLEANUP: Remove old categories (backward compat)
  // ============================================

  console.log('🧹 Cleaning up old categories...');

  // Удаляем старые категории которые больше не нужны
  const oldCategoryIds = [
    'cat_workers',    // Заменена на cat_payout_workers
    'cat_foreman',    // Заменена на cat_payout_foreman
    'cat_transfer',   // Заменена на cat_internal_transfer
    'cat_client',     // Заменена на cat_income_client
    'cat_advance',    // Заменена на cat_income_advance
    'cat_scrap',      // Заменена на cat_income_scrap
    'cat_income_other', // Уже есть с новым id
  ];

  // Проверяем есть ли транзакции с этими категориями перед удалением
  for (const catId of oldCategoryIds) {
    const count = await prisma.transaction.count({
      where: { categoryId: catId },
    });

    if (count === 0) {
      await prisma.category.deleteMany({
        where: { id: catId },
      }).catch(() => {
        // Игнорируем если категории не существует
      });
    } else {
      console.log(`   ⚠️  Skipping ${catId} - has ${count} transactions`);
    }
  }

  // ============================================
  // HELP ITEMS (FAQ)
  // ============================================

  console.log('❓ Creating help items...');

  // Очищаем старые перед добавлением
  await prisma.helpItem.deleteMany({});

  const helpItems = [
    {
      question: 'Как добавить сотрудника?',
      answer: 'Перейдите в Настройки → Пользователи → Пригласить. Введите email сотрудника и выберите его роль.',
      category: 'Общее',
      sortOrder: 1,
    },
    {
      question: 'Как создать новый объект?',
      answer: 'На главной странице нажмите синюю кнопку "+" или перейдите в раздел Объекты → Добавить.',
      category: 'Общее',
      sortOrder: 2,
    },
    {
      question: 'Как экспортировать данные?',
      answer: 'Экспорт доступен на тарифах PRO и выше. Перейдите в Настройки → Тариф для обновления.',
      category: 'Финансы',
      sortOrder: 3,
    },
    {
      question: 'Как дать доступ к кассе другому сотруднику?',
      answer: 'Откройте кассу → нажмите на "Доступы" → выберите сотрудника и уровень доступа.',
      category: 'Финансы',
      sortOrder: 4,
    },
    {
      question: 'Как внести расход через Telegram?',
      answer: 'Нажмите «Внести расход» в боте и пришлите фото чека. Бот автоматически найдет сумму. Также можно использовать голосовые сообщения.',
      category: 'Telegram',
      sortOrder: 5,
    },
    {
      question: 'Чем приложение полезно руководителю?',
      answer: 'Вы получаете полный контроль над всеми денежными потоками компании. Видите прибыль по каждому объекту в реальном времени, контролируете расходы прорабов и взаиморасчеты с партнерами. Все отчеты формируются автоматически.',
      category: 'Примеры использования',
      sortOrder: 6,
    },
    {
      question: 'Как прорабу использовать СтройУчёт?',
      answer: 'Вы можете вести несколько объектов одновременно, не путаясь в чеках и авансах. Просто фотографируйте каждый чек в Telegram и привязывайте к нужному проекту. В конце месяца у вас будет готовый отчет для заказчика со всеми тратами.',
      category: 'Примеры использования',
      sortOrder: 7,
    },
    {
      question: 'Зачем это мастеру-отделочнику?',
      answer: 'Если заказчик рассчитывает вас по чекам, СтройУчёт — ваш главный помощник. Больше никаких потерянных бумажек. Сразу после покупки в магазине скинули фото чека боту — и сумма зафиксирована. Вы всегда знаете, сколько денег заказчика потрачено и сколько он вам должен за работу.',
      category: 'Примеры использования',
      sortOrder: 8,
    },
  ];

  for (const item of helpItems) {
    await prisma.helpItem.create({
      data: item,
    });
  }

  console.log(`   Created ${helpItems.length} help items`);

  console.log('✅ Seed v2 completed!');

  // ============================================
  // SUMMARY
  // ============================================

  console.log('\n📊 Category Summary:');
  console.log('   EXPENSE (project costs): Materials, Services, Overhead');
  console.log('   PAYOUT (employee payments): Workers, Foreman, Advance, Bonus');
  console.log('   INCOME (project income): Client, Advance, Additional, Scrap');
  console.log('   INTERNAL (transfers): Between money sources');
  console.log('\n💡 Balance formula: INCOME - EXPENSE (PAYOUT and INTERNAL excluded)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
