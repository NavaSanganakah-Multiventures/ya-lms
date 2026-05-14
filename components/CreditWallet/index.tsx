/**
 * Credit Wallet Components - Frontend UI
 */

'use client';

import React, { useState } from 'react';
import {
  useCreditWallet,
  useAddCredits,
  useDeductCredits,
  useCreditHistory,
  useCreditAnalytics,
} from '@/hooks/useCreditWallet';
import { formatCurrency } from '@/lib/utils';

// ============================================================================
// CREDIT WALLET DISPLAY
// ============================================================================
export function CreditWalletCard({ userId }: { userId: string }) {
  const { data: wallet, isLoading, error } = useCreditWallet(userId);

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Error loading wallet</p>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">Wallet not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-md border border-blue-200">
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-600 mb-2">Available Credits</h3>
        <p className="text-4xl font-bold text-indigo-600">{wallet.available_credits}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Base Credits */}
        <div className="bg-white p-4 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">Base Credits</p>
          <p className="text-2xl font-semibold text-blue-600">
            {wallet.base_credits_total - wallet.base_credits_used}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {wallet.base_credits_used} / {wallet.base_credits_total} used
          </p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full"
              style={{
                width: `${
                  wallet.base_credits_total > 0
                    ? (wallet.base_credits_used / wallet.base_credits_total) * 100
                    : 0
                }%`,
              }}
            ></div>
          </div>
        </div>

        {/* Bonus Credits */}
        <div className="bg-white p-4 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">Bonus Credits</p>
          <p className="text-2xl font-semibold text-green-600">
            {wallet.bonus_credits_total - wallet.bonus_credits_used}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {wallet.bonus_credits_used} / {wallet.bonus_credits_total} used
          </p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-green-600 h-1.5 rounded-full"
              style={{
                width: `${
                  wallet.bonus_credits_total > 0
                    ? (wallet.bonus_credits_used / wallet.bonus_credits_total) * 100
                    : 0
                }%`,
              }}
            ></div>
          </div>
        </div>
      </div>

      {wallet.subscription_plan !== 'none' && (
        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
          <p className="text-xs font-medium text-blue-900 capitalize">
            Plan: {wallet.subscription_plan}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ADD CREDITS FORM (Admin)
// ============================================================================
export function AddCreditsForm({ userId }: { userId: string }) {
  const { mutate: addCredits, isPending } = useAddCredits();
  const [amount, setAmount] = useState('');
  const [creditType, setCreditType] = useState<'base' | 'bonus'>('bonus');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    addCredits({
      userId,
      amount: parseInt(amount),
      creditType,
      description,
    });

    setAmount('');
    setDescription('');
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Add Credits</h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g., 100"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={creditType}
            onChange={(e) => setCreditType(e.target.value as 'base' | 'bonus')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="base">Base</option>
            <option value="bonus">Bonus</option>
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g., Promotional credits"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {isPending ? 'Adding...' : 'Add Credits'}
      </button>
    </form>
  );
}

// ============================================================================
// TRANSACTION HISTORY
// ============================================================================
export function TransactionHistory({ userId }: { userId: string }) {
  const { data: transactions, isLoading } = useCreditHistory(userId);

  if (isLoading) {
    return <div className="animate-pulse space-y-3">Loading...</div>;
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No transactions yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold">Transaction History</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                Credits
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {transactions.map((txn) => (
              <tr key={txn.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                    {txn.transaction_type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`font-semibold ${
                      ['purchase', 'bonus_added', 'referral'].includes(txn.transaction_type)
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {['purchase', 'bonus_added', 'referral'].includes(txn.transaction_type)
                      ? '+'
                      : '-'}
                    {txn.credits_amount}
                  </span>
                </td>
                <td className="px-6 py-4">{txn.description}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      txn.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {txn.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {new Date(txn.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// USAGE ANALYTICS
// ============================================================================
export function UsageAnalytics({ userId }: { userId: string }) {
  const { data: analytics, isLoading } = useCreditAnalytics(userId);

  if (isLoading) {
    return <div className="animate-pulse space-y-3">Loading...</div>;
  }

  if (!analytics || analytics.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No usage data yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Usage by Service</h3>

      <div className="space-y-4">
        {analytics.map((item: any) => (
          <div key={item.service_type}>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-gray-700 capitalize">{item.service_type}</p>
              <span className="text-sm font-semibold text-indigo-600">{item.total_credits_used}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full"
                style={{
                  width: `${
                    analytics.reduce((sum: number, a: any) => sum + a.total_credits_used, 0) > 0
                      ? (item.total_credits_used /
                          analytics.reduce((sum: number, a: any) => sum + a.total_credits_used, 0)) *
                        100
                      : 0
                  }%`,
                }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Used {item.usage_count} times</p>
          </div>
        ))}
      </div>
    </div>
  );
}
