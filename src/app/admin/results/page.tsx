'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { VoteResults } from '@/lib/types';

export default function ResultsPage() {
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

  const pct = (n: number, total: number) =>
    total > 0 ? ((n / total) * 100).toFixed(1) : '0.0';

  const turnout = results
    ? pct(results.total, results.totalHouseholds)
    : '0.0';

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gray-800 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="font-bold text-lg">⚙️ ระบบผู้ดูแล</Link>
          <div className="hidden sm:flex gap-4 text-sm">
            <Link href="/admin" className="hover:text-indigo-300">ภาพรวม</Link>
            <Link href="/admin/review" className="hover:text-indigo-300">ตรวจเอกสาร</Link>
            <Link href="/admin/results" className="hover:text-indigo-300 font-medium text-indigo-300">ผลโหวต</Link>
            <Link href="/admin/households" className="hover:text-indigo-300">จัดการบ้าน</Link>
          </div>
        </div>
        <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/admin/login'); }}
          className="text-sm text-gray-300 hover:text-white">ออกจากระบบ</button>
      </nav>

      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">ผลการลงมติ</h2>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            🖨️ พิมพ์รายงาน
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">กำลังโหลด...</p>
        ) : results ? (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-4 text-lg">สรุปภาพรวม</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: 'หลังคาเรือนทั้งหมด', value: results.totalHouseholds, sub: 'ผู้มีสิทธิ์' },
                  { label: 'ส่งมติแล้ว', value: results.total, sub: `${turnout}% ของผู้มีสิทธิ์` },
                  { label: 'ผ่านการตรวจสอบ', value: results.verified, sub: 'คะแนนที่นับได้' },
                  { label: 'รอตรวจสอบ', value: results.submitted, sub: 'ยังไม่นับ' },
                  { label: 'ไม่ผ่านการตรวจ', value: results.rejected, sub: 'ไม่นับ' },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-gray-800">{item.value}</p>
                    <p className="text-sm font-medium text-gray-700 mt-0.5">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Vote Breakdown - Pending */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-2 text-lg">ผลคะแนน (ยังไม่ได้ตรวจเอกสาร)</h3>
              <p className="text-sm text-gray-500 mb-6">มติที่รอตรวจสอบเอกสาร ยังไม่นับรวมผลทางการ ({results.submitted} คะแนน)</p>

              {results.submitted === 0 ? (
                <p className="text-gray-400 text-center py-6">ไม่มีมติที่รอตรวจสอบ</p>
              ) : (
                <div className="space-y-5">
                  {[
                    { label: 'จัดตั้งนิติบุคคลหมู่บ้าน', count: results.juristic_pending, color: 'bg-indigo-300', icon: '🏢' },
                    { label: 'ให้เทศบาลรับภารกิจดูแล', count: results.municipality_pending, color: 'bg-teal-300', icon: '🏛️' },
                    { label: 'ออกเสียงตามข้างมาก', count: results.follow_majority_pending, color: 'bg-amber-300', icon: '🤝' },
                    { label: 'งดออกเสียง', count: results.abstain_pending, color: 'bg-gray-300', icon: '⚪' },
                  ].map((opt) => {
                    const p = parseFloat(pct(opt.count, results.submitted));
                    return (
                      <div key={opt.label}>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <span>{opt.icon}</span>
                            <span className="font-medium text-gray-800">{opt.label}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-bold text-gray-800">{opt.count}</span>
                            <span className="text-sm text-gray-500 ml-1">คะแนน ({pct(opt.count, results.submitted)}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-4">
                          <div
                            className={`${opt.color} h-4 rounded-full transition-all`}
                            style={{ width: `${p}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Vote Breakdown */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-2 text-lg">ผลคะแนน</h3>
              <p className="text-sm text-gray-500 mb-6">นับเฉพาะมติที่ผ่านการตรวจสอบเอกสาร ({results.verified} คะแนน)</p>

              {results.verified === 0 ? (
                <p className="text-gray-400 text-center py-6">ยังไม่มีคะแนนที่ผ่านการตรวจสอบ</p>
              ) : (
                <div className="space-y-5">
                  {[
                    { label: 'จัดตั้งนิติบุคคลหมู่บ้าน', count: results.juristic, color: 'bg-indigo-500', icon: '🏢' },
                    { label: 'ให้เทศบาลรับภารกิจดูแล', count: results.municipality, color: 'bg-teal-500', icon: '🏛️' },
                    { label: 'ออกเสียงตามข้างมาก', count: results.follow_majority, color: 'bg-amber-500', icon: '🤝' },
                    { label: 'งดออกเสียง', count: results.abstain, color: 'bg-gray-400', icon: '⚪' },
                  ].map((opt) => {
                    const p = parseFloat(pct(opt.count, results.verified));
                    const isWinner = opt.count === Math.max(results.juristic, results.municipality) && results.verified > 0
                      && (opt.label === 'จัดตั้งนิติบุคคลหมู่บ้าน' || opt.label === 'ให้เทศบาลรับภารกิจดูแล');
                    return (
                      <div key={opt.label}>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <span>{opt.icon}</span>
                            <span className="font-medium text-gray-800">{opt.label}</span>
                            {isWinner && results.juristic !== results.municipality && results.votingOpen && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
                                นำอยู่
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-bold text-gray-800">{opt.count}</span>
                            <span className="text-sm text-gray-500 ml-1">คะแนน ({pct(opt.count, results.verified)}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-4">
                          <div
                            className={`${opt.color} h-4 rounded-full transition-all`}
                            style={{ width: `${p}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Participation */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-4">อัตราการมีส่วนร่วม</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">ผู้ส่งมติ / ผู้มีสิทธิ์ทั้งหมด</span>
                    <span className="font-semibold">{results.total} / {results.totalHouseholds} ({turnout}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className="bg-blue-500 h-3 rounded-full"
                      style={{ width: `${Math.min(parseFloat(turnout), 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">ไม่สามารถโหลดข้อมูลได้</p>
        )}
      </div>
    </div>
  );
}
