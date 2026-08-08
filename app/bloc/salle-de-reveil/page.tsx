'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SalleDeReveilIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/bloc/salle-de-reveil/liste');
  }, []);

  return null;
}
