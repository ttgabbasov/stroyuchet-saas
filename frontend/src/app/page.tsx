import Link from 'next/link';
import {
  BarChart3,
  ShieldCheck,
  Clock,
  Users,
  ChevronRight,
  HardHat,
  Wallet,
  Calculator
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background selection:bg-primary-100 selection:text-primary-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
              <HardHat size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight">СтройУчёт</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Вход
            </Link>
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-all active:scale-95"
            >
              Начать работу
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 md:pt-32 md:pb-36">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 mb-6 text-xs font-medium text-muted-foreground backdrop-blur-sm animate-fade-in">
            <span className="flex h-2 w-2 rounded-full bg-primary-500" />
            Мощное решение для современных строек
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">
            Управляйте <span className="text-primary-600">финансами</span> <br className="hidden md:block" />
            вашей стройки прозрачно
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Профессиональный учет доходов, расходов и выплат по объектам.
            Вся отчетность в одном месте — всегда под рукой.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-primary-600 px-8 text-base font-semibold text-white shadow-lg shadow-primary-500/20 hover:bg-primary-700 hover:shadow-primary-500/40 transition-all active:scale-95"
            >
              Попробовать бесплатно <ChevronRight className="ml-2" size={20} />
            </Link>
            <Link
              href="#features"
              className="inline-flex h-12 items-center justify-center rounded-xl border bg-background px-8 text-base font-semibold hover:bg-muted transition-all active:scale-95"
            >
              Узнать больше
            </Link>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-1/2 left-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 bg-primary-500/10 blur-[120px]" />
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Всё необходимое для роста</h2>
            <p className="mt-4 text-muted-foreground">Инструменты, которые помогут вам контролировать каждую копейку</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'Учет объектов',
                desc: 'Создавайте неограниченное кол-во проектов и следите за маржой каждого.',
                icon: <BarChart3 className="text-primary-600" />,
              },
              {
                title: 'Контроль выплат',
                desc: 'Автоматизируйте учет авансов и окончательных расчетов с рабочими.',
                icon: <Wallet className="text-primary-600" />,
              },
              {
                title: 'Аналитика в реальном времени',
                desc: 'Наглядные графики и отчеты по прибыли и расходам в один клик.',
                icon: <Calculator className="text-primary-600" />,
              },
              {
                title: 'Командный доступ',
                desc: 'Добавляйте сотрудников с разными уровнями прав: от прораба до бухгалтера.',
                icon: <Users className="text-primary-600" />,
              },
              {
                title: 'Надежность и безопасность',
                desc: 'Ваши данные защищены современными методами шифрования и бэкапами.',
                icon: <ShieldCheck className="text-primary-600" />,
              },
              {
                title: 'История изменений',
                desc: 'Прозрачная история всех операций: кто, когда и что изменил.',
                icon: <Clock className="text-primary-600" />,
              }
            ].map((feature, i) => (
              <div key={i} className="group relative rounded-2xl border bg-background p-8 transition-all hover:border-primary-500/50 hover:shadow-xl hover:shadow-primary-500/5">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 group-hover:bg-primary-100 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="mb-2 text-xl font-bold">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section / About */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-12 rounded-3xl bg-slate-900 p-8 md:p-16 text-white overflow-hidden relative">
            <div className="flex-1 space-y-6 relative z-10">
              <h2 className="text-4xl font-bold leading-tight">Почему выбирают нас?</h2>
              <p className="text-slate-400 text-lg leading-relaxed">
                Мы создали «СтройУчёт» как инструмент для автоматизации внутренних процессов.
                Наша цель — сделать финансовый учет на стройке простым и понятым, исключив ошибки и воровство.
              </p>
              <div className="pt-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary-400" />
                  <span>Личный проект в активной разработке</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary-400" />
                  <span>Поддержка пользователей 24/7</span>
                </div>
              </div>
              <div className="pt-6">
                <p className="text-sm font-semibold tracking-wider uppercase text-slate-500 mb-2">Свяжитесь с нами</p>
                <Link href="mailto:support@tgabbasov.store" className="text-primary-400 underline decoration-primary-400/30 underline-offset-4 hover:decoration-primary-400 transition-all">
                  support@tgabbasov.store
                </Link>
              </div>
            </div>

            <div className="flex-1 w-full max-w-sm relative z-10">
              <div className="aspect-square rounded-2xl bg-gradient-to-tr from-primary-600/20 to-primary-400/10 border border-white/10 flex items-center justify-center p-8">
                <div className="text-center group">
                  <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary-500 text-white shadow-2xl shadow-primary-500/50 group-hover:scale-110 transition-transform">
                    <HardHat size={40} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-3xl font-bold">100%</p>
                    <p className="text-slate-400">Прозрачность</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Background pattern */}
            <div className="absolute top-0 right-0 h-full w-full opacity-10 pointer-events-none">
              <div className="absolute top-0 right-0 h-[500px] w-[500px] bg-primary-500 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/10">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} СтройУчёт. Профессиональный учет для строителей.</p>
          <div className="mt-4 flex justify-center gap-6 text-sm">
            <Link href="/login" className="hover:text-foreground transition-colors">Вход в систему</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Политика конфиденциальности</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
