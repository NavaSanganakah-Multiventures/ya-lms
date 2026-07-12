import { useState, useEffect, useCallback } from 'react';

export function useWallet(userId?: string) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    async function fetchWallet() {
      try {
        const url = userId ? `/api/wallet/balance?userId=${encodeURIComponent(userId)}` : '/api/wallet/balance';
        const res = await fetch(url, { signal: abortController.signal });
        if (!res.ok) throw new Error('Failed to fetch wallet');
        const json: any = await res.json();

        setData({
          balance_rupees: json.balance_rupees || 0,
          lifetime_deposits_rupees: json.lifetime_deposits_rupees || 0,
          lifetime_withdrawals_rupees: json.lifetime_withdrawals_rupees || 0,
        });
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setError(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchWallet();
    return () => abortController.abort();
  }, [userId]);

  return { data, isLoading, error };
}

export function useAddBalance() {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(async (params: { userId: string, amount: number, description: string }) => {
    setIsPending(true);
    try {
      const res = await fetch(`/api/admin/users/${params.userId}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: params.amount,
          reason: params.description,
        })
      });
      if (!res.ok) throw new Error('Failed to add balance');
      return await res.json();
    } catch (err) {
      throw err;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending };
}

export function useWalletHistory(userId?: string) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      if (!userId) {
        setData([]);
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/wallet/ledger?userId=${encodeURIComponent(userId)}`);
        if (!res.ok) throw new Error('Failed to fetch history');
        const json: any = await res.json();
        const history = Array.isArray(json?.ledger) ? json.ledger : [];

        const transformed = history.map((h: any) => ({
          id: h.id,
          type: h.change_rupees > 0 ? 'credit' : 'debit',
          amount_rupees: Math.abs(h.change_rupees),
          description: h.reason,
          balance_after_rupees: h.balance_after_rupees,
          status: 'completed',
          created_at: h.created_at
        }));

        setData(transformed);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchHistory();
  }, [userId]);

  return { data, isLoading };
}

export function useBalanceAnalytics(userId?: string) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      if (!userId) {
        setData(null);
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/wallet/analytics?userId=${encodeURIComponent(userId)}`);
        if (!res.ok) throw new Error('Failed to fetch analytics');
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAnalytics();
  }, [userId]);

  return { data, isLoading };
}
