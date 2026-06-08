'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <AlertTriangle size={48} className="text-amber-500" />
      <h2 className="text-xl font-bold text-slate-800">Bir hata oluştu</h2>
      <p className="text-sm text-slate-500 max-w-md text-center">
        Sayfa yüklenirken beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.
      </p>
      <Button onClick={reset} variant="outline">
        Tekrar Dene
      </Button>
    </div>
  );
}
