import { useState, useEffect, useCallback } from 'react';

// Using actual API endpoint that exists in Cloudflare Worker: /api/credits/balance
export function useCreditWallet(userId: string) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchWallet() {
      try {
        // Fetch from the actual API endpoint inside src/index.ts
        const res = await fetch('/api/credits/balance');
        if (!res.ok) throw new Error('Failed to fetch wallet');
        const json = await res.json();

        // Transform backend response into what the UI component expects
        // (UI component looks for base_credits_total, etc.)
        const credits = Array.isArray(json) ? json : ((json as any)?.data || []);

        // Find self_study credits which map to 'base' in the UI
        const selfStudy = credits.find((c: any) => c.credit_type === 'self_study') || { total_credits: 0, used_credits: 0 };
        const ai = credits.find((c: any) => c.credit_type === 'ai') || { total_credits: 0, used_credits: 0 };

        setData({
          base_credits_total: selfStudy.total_credits,
          base_credits_used: selfStudy.used_credits,
          bonus_credits_total: ai.total_credits,
          bonus_credits_used: ai.used_credits,
          available_credits: (selfStudy.total_credits - selfStudy.used_credits) + (ai.total_credits - ai.used_credits),
          subscription_plan: 'none' // Default as not provided by basic balance API
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

// Using actual API endpoint that exists in Cloudflare Worker: /api/admin/users/:id/credits
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
          credit_type: params.creditType === 'base' ? 'self_study' : 'ai',
          reason: params.description
        })
      });
      if (!res.ok) throw new Error('Failed to add credits');
      // Typically trigger a re-fetch here
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

  const mutate = useCallback(async (params: any) => {
    // There isn't a direct manual deduct endpoint in index.ts for admins right now,
    // deduction happens automatically during operations.
    // If needed, we'd add it to index.ts.
    console.warn('Manual deduction not implemented in backend yet');
  }, []);

  return { mutate, isPending };
}

// Using actual API endpoint: /api/credits/ledger
export function useCreditHistory(userId: string) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch('/api/credits/ledger');
        if (!res.ok) throw new Error('Failed to fetch history');
        const json = await res.json();
        const history = Array.isArray(json) ? json : ((json as any)?.data || []);

        // Transform the ledger to what the UI component expects
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
  return { data: [], isLoading: false };
}
