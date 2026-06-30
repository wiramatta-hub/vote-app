'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { VoteResults } from '@/lib/types';

export default function PublicResultsPage() {
  const [results, setResults] = useState<VoteResults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/results')
      .then((r) => r.json())
      .then((d) => { if (d) setResults(d); })
      .finally(() => setLoading(false));
  }, []);

  const pct = (n: number, total: number) =>
    total > 0 ? ((n / total) * 100).toFixed(1) : '0.0';

  const turnout = results ? pct(results.total, results.totalHouseholds) : '0.0';

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gray-800 text-white px-6 py-4 flex items-center justify-between">
        <Link href="/login" className="font-bold text-lg">📊 ผลโหวตปัจจุบัน</Link>
        <Link href="/login" className="text-sm text-gray-300 hover:text-white">กลับหน้าเข้าสู่ระบบ</Link>
      </nav>

      <div className="p-6 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">ผลการลงมติ</h2>

        {loading ? (
          <p className="text-gray-500">กำลังโหลด...</p>
        ) : results ? (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-4 text-lg">สรุปภาพรวม</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: 'หลังคาเรือนทั้งหมด', value: results.totalHouseholds, sub: 'ผู้มีสิทธิ์' },
                  { label: 'ส่งมติแล้ว', value: results.total, sub: `${turnout}% ของผู้มีสิทธิ์` },
                  { label: 'ผ่านการตรวจสอบ', value: results.verified, sub: 'คะแนนที่นับได้' },
                  { label: 'รอรับเอกสาร', value: results.submitted, sub: 'ยังไม่นับ' },
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

            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-2 text-lg">ผลคะแนน (ออนไลน์)</h3>
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
                    return (
                      <div key={opt.label}>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <span>{opt.icon}</span>
                            <span className="font-medium text-gray-800">{opt.label}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-bold text-gray-800">{opt.count}</span>
                            <span className="text-sm text-gray-500 ml-1">คะแนน ({pct(opt.count, results.verified)}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-4">
                          <div className={`${opt.color} h-4 rounded-full transition-all`} style={{ width: `${p}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-2 text-lg">ผลคะแนน (ออฟไลน์)</h3>
              <p className="text-sm text-gray-500 mb-6">มติที่บันทึกแบบออฟไลน์โดยเจ้าหน้าที่ ({results.offline} คะแนน)</p>

              {results.offline === 0 ? (
                <p className="text-gray-400 text-center py-6">ยังไม่มีมติแบบออฟไลน์</p>
              ) : (
                <div className="space-y-5">
                  {[
                    { label: 'จัดตั้งนิติบุคคลหมู่บ้าน', count: results.juristic_offline, color: 'bg-blue-500', icon: '🏢' },
                    { label: 'ให้เทศบาลรับภารกิจดูแล', count: results.municipality_offline, color: 'bg-cyan-500', icon: '🏛️' },
                    { label: 'ออกเสียงตามข้างมาก', count: results.follow_majority_offline, color: 'bg-sky-500', icon: '🤝' },
                    { label: 'งดออกเสียง', count: results.abstain_offline, color: 'bg-gray-400', icon: '⚪' },
                  ].map((opt) => {
                    const p = parseFloat(pct(opt.count, results.offline));
                    return (
                      <div key={opt.label}>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <span>{opt.icon}</span>
                            <span className="font-medium text-gray-800">{opt.label}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-bold text-gray-800">{opt.count}</span>
                            <span className="text-sm text-gray-500 ml-1">คะแนน ({pct(opt.count, results.offline)}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-4">
                          <div className={`${opt.color} h-4 rounded-full transition-all`} style={{ width: `${p}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-500">ไม่สามารถโหลดข้อมูลได้</p>
        )}
      </div>
    </div>
  );
}
