// ============================================
// СтройУчёт SaaS - Project Structure
// ============================================

/*
stroyuchet-saas/
├── prisma/
│   └── schema.prisma           # Database schema
│
├── src/
│   ├── config/
│   │   ├── plan-limits.ts      # Tariff configurations
│   │   └── categories.ts       # Default categories seed
│   │
│   ├── types/
│   │   └── api.types.ts        # TypeScript types for API
│   │
│   ├── lib/
│   │   ├── prisma.ts           # Prisma client singleton
│   │   └── jwt.ts              # JWT helpers
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts  # Auth, RBAC, limits
│   │   ├── validate.middleware.ts
│   │   └── audit.middleware.ts
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.schema.ts  # Zod schemas
│   │   │   └── auth.routes.ts
│   │   │
│   │   ├── projects/
│   │   │   ├── projects.controller.ts
│   │   │   ├── projects.service.ts
│   │   │   ├── projects.schema.ts
│   │   │   └── projects.routes.ts
│   │   │
│   │   ├── transactions/
│   │   │   ├── transactions.controller.ts
│   │   │   ├── transactions.service.ts
│   │   │   ├── transactions.schema.ts
│   │   │   └── transactions.routes.ts
│   │   │
│   │   ├── estimates/
│   │   │   └── ...
│   │   │
│   │   ├── analytics/
│   │   │   └── ... (BUSINESS plan only)
│   │   │
│   │   └── export/
│   │       └── ... (PRO+ plans)
│   │
│   ├── utils/
│   │   ├── money.ts            # Money formatting, calculations
│   │   ├── errors.ts           # Custom error classes
│   │   └── logger.ts
│   │
│   ├── app.ts                  # Express app setup
│   └── server.ts               # Entry point
│
├── tests/
│   └── ...
│
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
*/

export {};
