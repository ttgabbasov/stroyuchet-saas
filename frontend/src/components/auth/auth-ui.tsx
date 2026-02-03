'use client';

import { Check, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

// ============================================
// Checkbox Component
// ============================================

interface CheckboxProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

export function Checkbox({ label, checked, onChange }: CheckboxProps) {
    return (
        <label className="flex items-center gap-2 cursor-pointer group">
            <div
                onClick={() => onChange(!checked)}
                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${checked
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'border-input group-hover:border-primary-400'
                    }`}
            >
                {checked && <Check className="w-3 h-3" strokeWidth={3} />}
            </div>
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                {label}
            </span>
        </label>
    );
}

// ============================================
// BackgroundSelector Component
// ============================================

const BACKGROUNDS = [
    { id: 'bg-slate-900', color: '#0f172a', name: 'Тёмный' },
    { id: 'bg-indigo-950', color: '#1e1b4b', name: 'Синий' },
    { id: 'bg-emerald-950', color: '#064e3b', name: 'Изумруд' },
    { id: 'bg-rose-950', color: '#4c0519', name: 'Бордо' },
    { id: 'bg-zinc-950', color: '#09090b', name: 'Черный' },
];

export function BackgroundSelector() {
    const { background, setBackground } = useAuthStore();

    return (
        <div className="flex flex-col gap-2 mt-6 p-4 rounded-xl bg-muted/30 border border-border/50">
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Выбор фона</p>
            <div className="flex items-center gap-3">
                {BACKGROUNDS.map((bg) => (
                    <button
                        key={bg.id}
                        type="button"
                        onClick={() => setBackground(bg.id)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${background === bg.id ? 'border-primary ring-2 ring-primary/20 scale-110' : 'border-transparent'
                            }`}
                        style={{ backgroundColor: bg.color }}
                        title={bg.name}
                    />
                ))}
            </div>
        </div>
    );
}
