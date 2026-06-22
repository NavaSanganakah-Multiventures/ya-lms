'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, X } from 'lucide-react';

export default function DeletionBanner() {
  const [deletionStatus, setDeletionStatus] = useState<any>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/user/deletion-status')
      .then(res => res.json())
      .then(data => setDeletionStatus(data))
      .catch(() => {});
  }, []);

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const res = await fetch('/api/user/cancel-deletion', { method: 'POST' });
      const data: any = await res.json();
      if (data.success) {
        setDeletionStatus({ pending: false });
        alert("Account deletion request cancelled.");
      }
    } finally {
      setIsCancelling(false);
    }
  };

  if (!deletionStatus?.pending) return null;

  return (
    <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-3 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/20 rounded-full text-red-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-red-300">Account Scheduled for Deletion</p>
            <p className="text-xs text-red-400/80">Your account will be permanently deleted on {new Date(deletionStatus.scheduled_deletion_date).toLocaleDateString()}.</p>
          </div>
        </div>
        <button
          onClick={handleCancel}
          disabled={isCancelling}
          className="whitespace-nowrap px-4 py-2 bg-red-500 hover:bg-red-600 active:scale-95 transition-all text-white text-xs font-bold rounded-lg disabled:opacity-50"
        >
          {isCancelling ? 'Cancelling...' : 'Cancel Deletion Request'}
        </button>
      </div>
    </div>
  );
}
