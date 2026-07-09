import { useState, useEffect, useCallback } from 'react';

export function useCreditWallet(userId?: string) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    async function fetchWallet() {
      try {
        const url = userId ? `/api/credits/balance?userId=${encodeURIComponent(userId)}` : '/api/credits/balance';
        const res = await fetch(url, { signal: abortController.signal });
        if (!res.ok) throw new Error('Failed to fetch wallet');
        const json: any = await res.json();

        setData({
          ai_balance: json.ai_balance || 0,
          live_class_balance: json.live_class_balance || 0,
          self_study_balance: json.self_study_balance || 0,
          base_credits_total: json.ai_balance || json.balance || 0,
          base_credits_used: 0,
          bonus_credits_total: 0,
          bonus_credits_used: 0,
          available_credits: json.ai_balance || json.balance || 0,
          subscription_plan: 'none'
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

export function useAddCredits() {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(async (params: { userId: string, amount: number, creditType: string, description: string }) => {
    setIsPending(true);
    try {
      const res = await fetch(`/api/admin/users/${params.userId}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: params.amount,
          reason: params.description,
          credit_type: params.creditType
        })
      });
      if (!res.ok) throw new Error('Failed to add credits');
      return await res.json();
    } catch (err) {
      throw err;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending };
}

export function useDeductCredits() {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(async (params: { amount: number; reason?: string }) => {
    setIsPending(true);
    try {
      const res = await fetch('/api/credits/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: params.amount, reason: params.reason || 'manual_deduction' }),
      });
      if (!res.ok) {
        const err = await res.json() as any;
        throw new Error(err?.error || 'Failed to deduct credits');
      }
      return await res.json();
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending };
}

export function useCreditHistory(userId?: string) {
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
        const res = await fetch(`/api/credits/ledger?userId=${encodeURIComponent(userId)}`);
        if (!res.ok) throw new Error('Failed to fetch history');
        const json: any = await res.json();
        const history = Array.isArray(json?.ledger) ? json.ledger : [];

        const transformed = history.map((h: any) => ({
          id: h.id,
          transaction_type: h.change_amount > 0 ? (h.reason || 'bonus_added') : (h.reason || 'deduction'),
          credits_amount: Math.abs(h.change_amount),
          credit_type: h.credit_type || 'ai',
          description: h.reason,
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

export function useCreditAnalytics(userId?: string) {
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
        const res = await fetch(`/api/credits/analytics?userId=${encodeURIComponent(userId)}`);
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
