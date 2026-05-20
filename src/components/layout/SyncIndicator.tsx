import { Wifi, WifiOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';

export function SyncIndicator() {
  const { syncStatus } = useAppStore();

  const config = {
    synced: { icon: Check, label: 'Synced', color: 'text-accent-green' },
    syncing: { icon: RefreshCw, label: 'Syncing...', color: 'text-primary-500' },
    offline: { icon: WifiOff, label: 'Offline', color: 'text-accent-amber' },
    error: { icon: AlertCircle, label: 'Sync Error', color: 'text-accent-rose' },
  }[syncStatus];

  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-1.5 text-xs', config.color)}>
      <Icon size={12} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
      <span className="hidden sm:inline">{config.label}</span>
    </div>
  );
}
