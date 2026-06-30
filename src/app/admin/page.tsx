'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { VoteResults } from '@/lib/types';

export default function AdminDashboard() {
  const router = useRouter();
  const [results, setResults] = useState<VoteResults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/results')
      .then((r) => {
        if (r.status === 401) { router.push('/admin/login'); return null; }
        return r.json();
      })
      .then((d) => { if (d) setResults(d); })
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const percent = (n: number, total: number) =>
    total > 0 ? Math.round((n / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Nav */}
      <nav className="bg-gray-800 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-lg">⚙️ ระบบผู้ดูแล</span>
          <div className="hidden sm:flex gap-4 text-sm">
            <Link href="/admin" className="hover:text-indigo-300 font-medium text-indigo-300">ภาพรวม</Link>
            <Link href="/admin/review" className="hover:text-indigo-300">ตรวจเอกสาร</Link>
            <Link href="/admin/results" className="hover:text-indigo-300">ผลโหวต</Link>
            <Link href="/admin/households" className="hover:text-indigo-300">จัดการบ้าน</Link>
          </div>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-300 hover:text-white">ออกจากระบบ</button>
      </nav>

      <div className="p-6 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">ภาพรวมการลงมติ</h2>

        {loading ? (
          <p className="text-gray-500">กำลังโหลด...</p>
        ) : results ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              {[
                { label: 'หลังคาเรือนทั้งหมด', value: results.totalHouseholds, color: 'bg-blue-500' },
                { label: 'ส่งมติแล้ว', value: results.total, color: 'bg-yellow-500' },
                { label: 'ผ่านการตรวจ', value: results.verified, color: 'bg-green-500' },
              ].map((card) => (
                <div key={card.label} className="bg-white rounded-xl shadow-sm p-5">
                  <div className={`w-10 h-1.5 ${card.color} rounded-full mb-3`} />
                  <p className="text-3xl font-bold text-gray-800">{card.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{card.label}</p>
                </div>
              ))}
            </div>

            {/* Status breakdown (4 statuses) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'ยังไม่โหวต', value: results.statusCounts?.none ?? 0, color: 'bg-gray-400' },
                { label: 'โหวตแล้ว', value: results.statusCounts?.voted ?? 0, color: 'bg-green-500' },
                { label: 'โหวตแล้ว (ออฟไลน์)', value: results.statusCounts?.offline ?? 0, color: 'bg-blue-500' },
                { label: 'รอตรวจเอกสาร', value: results.statusCounts?.pending ?? 0, color: 'bg-orange-500' },
              ].map((card) => (
                <div key={card.label} className="bg-white rounded-xl shadow-sm p-5">
                  <div className={`w-10 h-1.5 ${card.color} rounded-full mb-3`} />
                  <p className="text-3xl font-bold text-gray-800">{card.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{card.label}</p>
                </div>
              ))}
            </div>

            {/* Vote Results */}
            {results.verified > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h3 className="font-semibold text-gray-800 mb-4">ผลคะแนน (เฉพาะที่ผ่านการตรวจ)</h3>
                <div className="space-y-4">
                  {[
                    { label: 'จัดตั้งนิติบุคคลหมู่บ้าน', count: results.juristic, color: 'bg-indigo-500' },
                    { label: 'ให้เทศบาลรับภารกิจดูแล', count: results.municipality, color: 'bg-teal-500' },
                    { label: 'ออกเสียงตามข้างมาก', count: results.follow_majority, color: 'bg-amber-500' },
                    { label: 'งดออกเสียง', count: results.abstain, color: 'bg-gray-400' },
                  ].map((opt) => (
                    <div key={opt.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{opt.label}</span>
                        <span className="text-gray-500">
                          {opt.count} คะแนน ({percent(opt.count, results.verified)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3">
                        <div
                          className={`${opt.color} h-3 rounded-full transition-all`}
                          style={{ width: `${percent(opt.count, results.verified)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick links */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { href: '/admin/review', label: 'ตรวจเอกสาร', badge: results.submitted, desc: 'รายการรอตรวจสอบ' },
                { href: '/admin/results', label: 'ดูผลโหวตเต็ม', badge: null, desc: 'รายงานสรุปผล' },
                { href: '/admin/households', label: 'จัดการบ้านเลขที่', badge: null, desc: 'เพิ่ม/จัดการผู้มีสิทธิ์' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-gray-800">{link.label}</p>
                    <p className="text-sm text-gray-500">{link.desc}</p>
                  </div>
                  {link.badge !== null && link.badge! > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                      {link.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </>
        ) : (
          <p className="text-gray-500">ไม่สามารถโหลดข้อมูลได้</p>
        )}
      </div>
    </div>
  );
}
