import { useState, useEffect, useCallback } from 'react';

export function useCreditWallet(userId: string) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchWallet() {
      try {
        const res = await fetch('/api/credits/balance');
        if (!res.ok) throw new Error('Failed to fetch wallet');
        const json: any = await res.json();

        setData({
          base_credits_total: json.balance || 0,
          base_credits_used: 0,
          bonus_credits_total: 0,
          bonus_credits_used: 0,
          available_credits: json.balance || 0,
          subscription_plan: 'none'
        });
      } catch (err: any) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchWallet();
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
          reason: params.description
        })
      });
      if (!res.ok) throw new Error('Failed to add credits');
    } catch (err) {
      console.error(err);
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

export function useCreditHistory(userId: string) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch('/api/credits/ledger');
        if (!res.ok) throw new Error('Failed to fetch history');
        const json: any = await res.json();
        const history = Array.isArray(json?.ledger) ? json.ledger : [];

        const transformed = history.map((h: any) => ({
          id: h.id,
          transaction_type: h.change_amount > 0 ? 'bonus_added' : 'deduction',
          credits_amount: Math.abs(h.change_amount),
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

export function useCreditAnalytics(userId: string) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/credits/analytics');
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
