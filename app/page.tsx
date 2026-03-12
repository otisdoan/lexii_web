'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed') === 'true';
    router.replace(completed ? '/home' : '/onboarding');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-slate-500 text-sm">Đang tải...</p>
      </div>
    </div>
  );
}
