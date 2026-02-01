'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from './button';

export function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    // Предотвращение ошибок гидратации
    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="w-10 h-10" />;
    }

    return (
        <Button
            variant="secondary"
            size="sm"
            className="w-10 h-10 p-0 rounded-full border-border bg-card text-foreground transition-colors"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
            {resolvedTheme === 'dark' ? (
                <Sun className="h-[1.2rem] w-[1.2rem] transition-all" />
            ) : (
                <Moon className="h-[1.2rem] w-[1.2rem] transition-all" />
            )}
            <span className="sr-only">Переключить тему</span>
        </Button>
    );
}
