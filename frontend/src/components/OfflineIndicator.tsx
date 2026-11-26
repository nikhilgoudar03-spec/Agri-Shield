import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const OfflineIndicator: React.FC = () => {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 4000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 p-3.5 rounded-xl shadow-lg border transition-all duration-300 flex items-start space-x-3 ${
        isOnline
          ? 'bg-emerald-900/90 text-white border-emerald-700'
          : 'bg-amber-900/95 text-white border-amber-700'
      }`}
    >
      <div className="p-1 rounded-lg bg-black/20 shrink-0 mt-0.5">
        {isOnline ? <Wifi className="w-4 h-4 text-emerald-300" /> : <WifiOff className="w-4 h-4 text-amber-300" />}
      </div>
      <div className="text-xs">
        <p className="font-semibold">
          {isOnline ? t('offline.reconnected') : t('offline.banner')}
        </p>
        {!isOnline && (
          <p className="text-amber-200 text-[11px] mt-1 flex items-center space-x-1">
            <Info className="w-3 h-3 shrink-0" />
            <span>Note: System authentication and telemetry synchronization require active internet connectivity.</span>
          </p>
        )}
      </div>
    </div>
  );
};
