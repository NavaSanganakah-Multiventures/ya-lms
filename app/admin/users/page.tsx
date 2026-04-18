'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/admin/users')
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          router.push('/auth/login');
          return;
        }
        return res.json();
      })
      .then((data: any) => {
        if (data && data.users) setUsers(data.users);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, [router]);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">उपयोगकर्ता प्रबंधन</h1>
          <p className="text-neutral-400 mt-2 text-sm">प्लेटफ़ॉर्म में सभी पंजीकृत उपयोगकर्ताओं को देखें और प्रबंधित करें।</p>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-950/50 text-neutral-400 text-sm font-medium border-b border-neutral-800">
                <th className="px-6 py-4 font-medium">यूज़र आईडी (User ID)</th>
                <th className="px-6 py-4 font-medium">ईमेल</th>
                <th className="px-6 py-4 font-medium">भूमिका (Role)</th>
                <th className="px-6 py-4 font-medium text-right">शामिल हुए</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-neutral-800/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-neutral-500 font-mono">
                    {user.id.split('-')[0]}...
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-200">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      user.role === 'admin' ? 'bg-red-500/10 text-red-400' :
                      user.role === 'teacher' ? 'bg-indigo-500/10 text-indigo-400' :
                      'bg-green-500/10 text-green-400'
                    }`}>
                      {user.role === 'admin' ? 'एडमिन' : user.role === 'teacher' ? 'शिक्षक' : 'छात्र'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-400 text-right">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-neutral-500">
                    कोई उपयोगकर्ता नहीं मिला।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
