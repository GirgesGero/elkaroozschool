'use client';

import { useEffect } from 'react';
import { PushNotificationService } from '@/lib/mobile';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    void PushNotificationService.registerServiceWorker().catch(() => null);
  }, []);

  return null;
}
