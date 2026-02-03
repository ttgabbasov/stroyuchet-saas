import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { Card } from './card';

interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string; // для дополнительной стилизации контента
}

export const Dialog: React.FC<DialogProps> = ({
    isOpen,
    onClose,
    title,
    children,
    className,
}) => {
    // Блокировка скролла при открытом модальном окне
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    // Компонент модального окна
    const modal = (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={onClose} />

            <Card
                className={clsx(
                    "relative w-full max-w-lg bg-background shadow-xl animate-in zoom-in-95 duration-200",
                    className
                )}
                padding="lg"
                onClick={(e) => e.stopPropagation()} // Prevent close on card click
            >
                <div className="flex items-center justify-between mb-4">
                    {title && <h3 className="text-lg font-semibold">{title}</h3>}
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors absolute right-4 top-4"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div>{children}</div>
            </Card>
        </div>
    );

    return modal;
};
