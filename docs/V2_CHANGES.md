# СтройУчёт v2 - Изменения архитектуры

## Обзор изменений

### 1. MoneySource (Кассы)

Новая сущность для управления денежными средствами с контролем доступа.

```
MoneySource
├── id
├── name ("Касса Тимура", "Касса Дмитрия", "Банк")
├── ownerId → User (владелец кассы)
├── companyId → Company
├── isCompanyMain (главная касса компании)
├── isActive
└── sharedWith[] → MoneySourceAccess

MoneySourceAccess
├── moneySourceId
├── userId
├── canView (может видеть баланс)
└── canSpend (может тратить)
```

**Логика доступа:**
- **OWNER** компании: видит и может тратить из ВСЕХ касс
- **ACCOUNTANT**: видит все кассы, но НЕ может тратить
- **Владелец кассы**: полный доступ к своей кассе
- **sharedWith**: доступ согласно canView/canSpend
- **Главная касса** (isCompanyMain): видна всем, тратить только с правами

### 2. Типы транзакций

| Тип | Описание | Влияет на баланс проекта |
|-----|----------|--------------------------|
| **INCOME** | Доход проекта (от заказчика) | ✅ Да (+) |
| **EXPENSE** | Расход проекта (материалы, услуги) | ✅ Да (-) |
| **PAYOUT** | Выплата сотруднику | ❌ Нет |
| **INTERNAL** | Перевод между кассами | ❌ Нет |

**Формула баланса проекта:**
```
Баланс = Σ(INCOME) - Σ(EXPENSE)
```

PAYOUT и INTERNAL влияют только на баланс касс, но не на прибыльность проекта.

### 3. Категории

**EXPENSE (Расходы проекта):**
- Материалы: Строительные, Отделочные, Электрика, Сантехника, Инструменты
- Услуги: Доставка, Аренда техники, Аренда помещений, Субподряд
- Накладные: ГСМ, Питание, Офис, Транспорт, Связь

**PAYOUT (Выплаты):**
- Выплата рабочим
- Выплата прорабу
- Аванс сотруднику
- Премия

**INCOME (Доходы):**
- От заказчика
- Аванс от заказчика
- Доп. работы
- Металлолом / возврат

**INTERNAL:**
- Перевод между кассами

### 4. Статус чеков

```typescript
enum ReceiptStatus {
  RECEIPT     // Есть чек
  NO_RECEIPT  // Без чека
  PENDING     // Чек ожидается
}
```

### 5. Структура транзакции

```
Transaction
├── id
├── type (INCOME | EXPENSE | PAYOUT | INTERNAL)
├── amountCents
├── categoryId
├── moneySourceId → MoneySource (откуда деньги)
├── toMoneySourceId → MoneySource? (куда, для INTERNAL)
├── payoutUserId → User? (кому, для PAYOUT)
├── projectId → Project? (опционально для INTERNAL)
├── receiptStatus
├── receiptUrl
├── date
├── comment
└── createdById
```

## API Endpoints

### Money Sources

| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/money-sources` | Список касс (с учётом доступа) |
| POST | `/api/money-sources` | Создать кассу |
| GET | `/api/money-sources/:id` | Получить кассу |
| PATCH | `/api/money-sources/:id` | Обновить |
| DELETE | `/api/money-sources/:id` | Деактивировать |
| POST | `/api/money-sources/:id/share` | Добавить доступ |
| DELETE | `/api/money-sources/:id/share/:userId` | Удалить доступ |

### Transactions (обновлено)

Создание транзакции теперь требует `moneySourceId`:

```typescript
// INCOME
{
  type: "INCOME",
  moneySourceId: "...",
  projectId: "...",
  amountCents: 10000000,
  categoryId: "cat_income_client",
  date: "2025-01-26",
  receiptStatus: "RECEIPT"
}

// EXPENSE
{
  type: "EXPENSE",
  moneySourceId: "...",
  projectId: "...",
  amountCents: 500000,
  categoryId: "cat_construction",
  date: "2025-01-26",
  receiptStatus: "NO_RECEIPT"
}

// PAYOUT
{
  type: "PAYOUT",
  moneySourceId: "...",
  payoutUserId: "...",
  projectId: "..." // опционально
  amountCents: 300000,
  categoryId: "cat_payout_workers",
  date: "2025-01-26"
}

// INTERNAL
{
  type: "INTERNAL",
  moneySourceId: "...",
  toMoneySourceId: "...",
  amountCents: 1000000,
  categoryId: "cat_internal_transfer",
  date: "2025-01-26"
}
```

## Миграция данных

### Шаги миграции:

1. **Prisma migrate**
   ```bash
   npx prisma migrate dev --name v2_money_sources
   ```

2. **Seed новые категории**
   ```bash
   npm run db:seed
   ```

3. **SQL миграция существующих данных**
   ```bash
   psql -f prisma/migrations/v2_migration.sql
   ```

### Что делает миграция:

1. Создаёт главную кассу для каждой компании
2. Привязывает существующие транзакции к главной кассе
3. Конвертирует TRANSFER → INTERNAL
4. Конвертирует расходы на "Рабочим"/"Прорабу" → PAYOUT
5. Маппит старые категории на новые
6. Устанавливает receiptStatus по наличию receiptUrl

### Обратная совместимость:

- Старые транзакции сохраняются
- projectId остаётся обязательным для INCOME/EXPENSE
- Новый фильтр `moneySourceId` в списке транзакций

## Примеры использования

### Сценарий: Тимур (Owner) передаёт деньги Дмитрию (Foreman)

1. Тимур создаёт кассу для Дмитрия:
```json
POST /api/money-sources
{
  "name": "Касса Дмитрия"
}
// Owner автоматически становится владельцем, но можно передать
```

2. Шарит кассу Дмитрию:
```json
POST /api/money-sources/{id}/share
{
  "userId": "{dmitry_id}",
  "canView": true,
  "canSpend": true
}
```

3. Переводит деньги (INTERNAL):
```json
POST /api/transactions
{
  "type": "INTERNAL",
  "moneySourceId": "{main_kassa_id}",
  "toMoneySourceId": "{dmitry_kassa_id}",
  "amountCents": 5000000,
  "categoryId": "cat_internal_transfer",
  "date": "2025-01-26",
  "comment": "На материалы для объекта Ленина 15"
}
```

4. Дмитрий тратит на материалы (EXPENSE):
```json
POST /api/transactions
{
  "type": "EXPENSE",
  "moneySourceId": "{dmitry_kassa_id}",
  "projectId": "{project_id}",
  "amountCents": 450000,
  "categoryId": "cat_construction",
  "date": "2025-01-26",
  "receiptStatus": "RECEIPT",
  "comment": "Кирпич 500шт"
}
```

### Сценарий: Выплата рабочему

```json
POST /api/transactions
{
  "type": "PAYOUT",
  "moneySourceId": "{kassa_id}",
  "payoutUserId": "{worker_id}",
  "projectId": "{project_id}", // опционально
  "amountCents": 1500000,
  "categoryId": "cat_payout_workers",
  "date": "2025-01-26",
  "comment": "За неделю 20-26 января"
}
```

## Ограничения тарифов

| План | maxMoneySources |
|------|-----------------|
| FREE | 1 |
| PRO | 5 |
| BUSINESS | ∞ |
