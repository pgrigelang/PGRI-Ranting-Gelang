import React, { useEffect, useState } from 'react';
import { WifiOff, CloudUpload } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';
import { flushOfflineQueue, getOfflineQueueCount } from '../lib/sync';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState<number>(() => getOfflineQueueCount());
  const [isFlushing, setIsFlushing] = useState(false);

  useEffect(() => {
    const syncQueueCount = () => {
      setPendingCount(getOfflineQueueCount());
    };
    window.addEventListener('pgri-offline-queue-updated', syncQueueCount);
    return () => window.removeEventListener('pgri-offline-queue-updated', syncQueueCount);
  }, []);

  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isFlushing) {
      setIsFlushing(true);
      flushOfflineQueue()
        .finally(() => {
          setPendingCount(getOfflineQueueCount());
          setIsFlushing(false);
        });
    }
  }, [isOnline, pendingCount]);

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={`fixed bottom-4 left-4 z-[9990] flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-xl border backdrop-blur-md ${
        !isOnline
          ? 'bg-amber-700/95 border-amber-400/50'
          : 'bg-red-900/95 border-amber-400/50'
      }`}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
          <span>
            Mode Offline — Data tersimpan lokal
            {pendingCount > 0 ? ` (${pendingCount} antrean sinkron)` : ''}
          </span>
        </>
      ) : (
        <>
          <CloudUpload className="w-4 h-4 shrink-0 animate-bounce" />
          <span>Menyinkronkan {pendingCount} data antrean offline...</span>
        </>
      )}
    </div>
  );
};
