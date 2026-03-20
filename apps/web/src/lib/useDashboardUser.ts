'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchSession, type SessionUser } from './api';

export function useDashboardUser() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchSession()
      .then((session) => {
        if (!session?.user) {
          router.replace('/login');
          return;
        }
        setUser(session.user);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  return { user, loading, error };
}
