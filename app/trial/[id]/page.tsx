"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
export const runtime = 'edge';

export default function TrialEnrollPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  useEffect(() => {
    if (!id) return;
    const enroll = async () => {
      try {
        const res = await fetch(`/api/trial/${id}/enroll`, {
          method: "POST",
        });

        if (res.status === 401) {
          router.push(`/login?returnUrl=/trial/${id}`);
          return;
        }

        const data = await res.json() as any;

        if (!res.ok) {
          throw new Error(data.error || "Enrollment failed");
        }

        setExpiresAt(data.expiresAt);
        setStatus("success");
      } catch (err: any) {
        setErrorMessage(err.message);
        setStatus("error");
      }
    };
    enroll();
  }, [id, router]);

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl w-full max-w-md text-center">
        {status === "loading" && (
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Activating Trial...</h1>
            <p className="text-neutral-400">Please wait while we unlock your free access.</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Free Trial Activated!</h1>
            <p className="text-neutral-300 mb-6">
              You now have free access until <span className="font-bold text-orange-400">{new Date(expiresAt).toLocaleDateString()}</span>.
            </p>
            <Link
              href="/dashboard"
              className="px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-all inline-block"
            >
              Go to Dashboard
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Trial Activation Failed</h1>
            <p className="text-neutral-400 mb-6">{errorMessage}</p>
            <Link
              href="/courses"
              className="px-8 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-all inline-block"
            >
              Browse Courses
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
