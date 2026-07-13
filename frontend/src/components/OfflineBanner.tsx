import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function OfflineBanner() {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="flex items-center justify-between bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-sm text-yellow-800">
      <span>⚠️ No internet connection. Some features may not work.</span>
      <button
        onClick={() => window.location.reload()}
        className="ml-4 text-yellow-700 underline hover:text-yellow-900"
      >
        Retry
      </button>
    </div>
  );
}
