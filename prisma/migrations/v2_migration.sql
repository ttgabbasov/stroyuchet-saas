-- ============================================
-- СтройУчёт v2 Migration Script
-- ============================================
-- Выполнить ПОСЛЕ prisma migrate
-- Миграция существующих данных
-- ============================================

-- 1. Создаём главную кассу для каждой компании (от имени Owner)
INSERT INTO money_sources (id, name, owner_id, company_id, is_company_main, is_active, created_at, updated_at)
SELECT 
    'ms_main_' || c.id,
    'Главная касса',
    (SELECT id FROM users WHERE company_id = c.id AND role = 'OWNER' LIMIT 1),
    c.id,
    true,
    true,
    NOW(),
    NOW()
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM money_sources ms WHERE ms.company_id = c.id AND ms.is_company_main = true
);

-- 2. Привязываем существующие транзакции к главной кассе
UPDATE transactions t
SET money_source_id = (
    SELECT id FROM money_sources ms 
    WHERE ms.company_id = (
        SELECT company_id FROM projects p WHERE p.id = t.project_id
    )
    AND ms.is_company_main = true
    LIMIT 1
)
WHERE t.money_source_id IS NULL;

-- 3. Миграция типов транзакций
-- TRANSFER → INTERNAL (если между кассами)
-- Старые категории "Рабочим", "Прорабу" → тип PAYOUT

-- Находим транзакции с категориями выплат и меняем тип на PAYOUT
UPDATE transactions t
SET type = 'PAYOUT'
WHERE t.category_id IN (
    SELECT id FROM categories 
    WHERE name IN ('Рабочим', 'Прорабу', 'Выплата рабочим', 'Выплата прорабу')
)
AND t.type = 'EXPENSE';

-- 4. Обновление receiptStatus
-- Все транзакции с receiptUrl → RECEIPT
UPDATE transactions
SET receipt_status = 'RECEIPT'
WHERE receipt_url IS NOT NULL AND receipt_url != '';

-- Остальные → NO_RECEIPT (уже дефолт)

-- 5. Маппинг старых категорий на новые
-- cat_workers → cat_payout_workers
UPDATE transactions SET category_id = 'cat_payout_workers' WHERE category_id = 'cat_workers';
-- cat_foreman → cat_payout_foreman  
UPDATE transactions SET category_id = 'cat_payout_foreman' WHERE category_id = 'cat_foreman';
-- cat_transfer → cat_internal_transfer
UPDATE transactions SET category_id = 'cat_internal_transfer' WHERE category_id = 'cat_transfer';
-- cat_client → cat_income_client
UPDATE transactions SET category_id = 'cat_income_client' WHERE category_id = 'cat_client';
-- cat_advance → cat_income_advance
UPDATE transactions SET category_id = 'cat_income_advance' WHERE category_id = 'cat_advance';
-- cat_scrap → cat_income_scrap
UPDATE transactions SET category_id = 'cat_income_scrap' WHERE category_id = 'cat_scrap';

-- 6. TRANSFER → INTERNAL для старых переводов
UPDATE transactions
SET type = 'INTERNAL'
WHERE type = 'TRANSFER';

-- 7. Проверка целостности
-- Все транзакции должны иметь money_source_id
SELECT COUNT(*) as orphan_transactions 
FROM transactions 
WHERE money_source_id IS NULL;

-- Все PAYOUT должны иметь payout_user_id (опционально, можно заполнить вручную)
-- SELECT * FROM transactions WHERE type = 'PAYOUT' AND payout_user_id IS NULL;

-- ============================================
-- Rollback (если нужно откатить)
-- ============================================
-- UPDATE transactions SET type = 'TRANSFER' WHERE type = 'INTERNAL';
-- UPDATE transactions SET type = 'EXPENSE' WHERE type = 'PAYOUT';
-- UPDATE transactions SET category_id = 'cat_workers' WHERE category_id = 'cat_payout_workers';
-- etc...
