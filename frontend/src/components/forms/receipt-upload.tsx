'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, X, Check, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useUploadFile } from '@/lib/hooks';
import type { ReceiptStatus } from '@/types';

// ============================================
// Receipt Upload Component
// ============================================

interface ReceiptUploadProps {
  value?: {
    url?: string;
    status: ReceiptStatus;
  };
  onChange: (value: { url?: string; status: ReceiptStatus }) => void;
}

export function ReceiptUpload({ value, onChange }: ReceiptUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(value?.url || null);

  const uploadMutation = useUploadFile();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    try {
      const result = await uploadMutation.mutateAsync(file);
      onChange({ url: result.url, status: 'RECEIPT' });
    } catch (error) {
      console.error('Upload failed:', error);
      setPreview(null);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange({ status: 'NO_RECEIPT' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const statusOptions: { value: ReceiptStatus; label: string; icon: typeof Check }[] = [
    { value: 'RECEIPT', label: 'Есть', icon: Check },
    { value: 'NO_RECEIPT', label: 'Нет', icon: X },
    { value: 'PENDING', label: 'Будет', icon: Loader2 },
  ];

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-muted-foreground mb-2">
        Чек
      </label>

      <div className="flex gap-3">
        {/* Status buttons */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                if (opt.value !== 'RECEIPT') {
                  setPreview(null);
                }
                onChange({ url: value?.url, status: opt.value });
              }}
              className={clsx(
                'px-3 py-2 text-sm font-medium transition-colors',
                value?.status === opt.value
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-accent transition-colors'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Upload button */}
        {value?.status === 'RECEIPT' && !preview && (
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent transition-colors"
            >
              {uploadMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
              <span className="text-sm">Фото</span>
            </button>
          </div>
        )}
      </div>

      {/* Preview */}
      {preview && (
        <div className="mt-3 relative inline-block">
          <img
            src={preview}
            alt="Чек"
            className="h-24 w-auto rounded-lg border border-border object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-danger-500 text-white flex items-center justify-center shadow-sm hover:bg-danger-600"
          >
            <X className="w-4 h-4" />
          </button>
          {uploadMutation.isPending && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] rounded-lg flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
