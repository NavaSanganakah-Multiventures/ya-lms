"use client";

import { useEffect, useState } from "react";
import {
  Wallet,
  TrendingUp,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Download,
  Filter,
  Loader2,
  CreditCard,
  PieChart,
  Activity,
  DollarSign,
} from "lucide-react";
import { motion } from "motion/react";

export default function AccountingPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetch("/api/admin/accounting")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const filteredTransactions =
    data?.transactions?.filter(
      (t: any) =>
        t.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.course_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.user_email?.toLowerCase().includes(searchTerm.toLowerCase()),
    ) || [];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
        <p className="text-neutral-500 font-medium animate-pulse">
          खाता-बही तैयार की जा रही है...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">
            लेखा-जोखा (Accounting)
          </h1>
          <p className="text-neutral-500 mt-2 font-medium">
            राजस्व और लेनदेन का विस्तृत विवरण
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl font-bold text-sm border border-neutral-800 transition-all flex items-center gap-2">
            <Download className="w-4 h-4" />
            Report Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            label: "कुल राजस्व (Total Revenue)",
            value: `₹${data?.stats?.totalRevenue?.toLocaleString()}`,
            icon: Wallet,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            border: "border-emerald-500/20",
          },
          {
            label: "इस महीने का राजस्व",
            value: `₹${data?.stats?.monthlyRevenue?.toLocaleString()}`,
            icon: TrendingUp,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
            border: "border-orange-500/20",
          },
          {
            label: "कुल लेनदेन (Transactions)",
            value: data?.stats?.totalTransactions,
            icon: Activity,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
            border: "border-purple-500/20",
          },
        ].map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`p-8 rounded-[32px] border ${card.border} ${card.bg} backdrop-blur-xl group hover:scale-[1.02] transition-all duration-500`}
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className={`p-3 rounded-2xl bg-black/40 border border-white/5`}
              >
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
              <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                <ArrowUpRight className="w-3 h-3" />
                +12%
              </div>
            </div>
            <p className="text-neutral-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
              {card.label}
            </p>
            <h3 className="text-3xl font-black text-white tracking-tighter">
              {card.value}
            </h3>
          </motion.div>
        ))}
      </div>

      {/* Transactions Table */}
      <div className="bg-neutral-900/40 border border-neutral-800 rounded-[40px] overflow-hidden backdrop-blur-2xl shadow-2xl">
        <div className="p-8 border-b border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-neutral-500" />
            <h2 className="text-xl font-black text-white">
              हाल के लेनदेन (Recent Transactions)
            </h2>
          </div>
          <div className="relative group w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-orange-500 transition-colors" />
            <input
              type="text"
              placeholder="Search by name, email or course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-neutral-800 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:border-orange-500/50 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-8 py-5 text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                  छात्र (Student)
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                  कोर्स (Course)
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                  राशि (Amount)
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                  माध्यम (Source)
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-neutral-500 uppercase tracking-widest text-right">
                  तारीख (Date)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              {filteredTransactions.map((t: any) => (
                <tr
                  key={t.id}
                  className="group hover:bg-white/[0.01] transition-colors"
                >
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="font-black text-neutral-200 group-hover:text-white transition-colors">
                        {t.user_name}
                      </span>
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-tight">
                        {t.user_email}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm font-bold text-neutral-400">
                      {t.type === "credit_purchase"
                        ? "AI Credits"
                        : t.type === "subscription"
                          ? "Subscription"
                          : t.course_title || t.type}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="font-black text-emerald-500">
                        ₹{t.amount_inr.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest">
                        PAID
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-neutral-800 border border-neutral-700 rounded-lg text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                      {t.payment_source || "RAZORPAY"}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <span className="text-xs font-bold text-neutral-500">
                      {new Date(t.purchased_at).toLocaleDateString("hi-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTransactions.length === 0 && (
            <div className="py-20 text-center text-neutral-600 font-medium italic">
              कोई लेनदेन नहीं मिला।
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
