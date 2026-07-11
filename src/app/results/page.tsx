'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { VoteResults } from '@/lib/types';

export default function PublicResultsPage() {
  const [results, setResults] = useState<VoteResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectorMode, setProjectorMode] = useState(false);

  useEffect(() => {
    fetch('/api/results')
      .then((r) => r.json())
      .then((d) => { if (d) setResults(d); })
      .finally(() => setLoading(false));
  }, []);

  const pct = (n: number, total: number) => (total > 0 ? (n / total) * 100 : 0);
  const fmtPct = (n: number, total: number) => pct(n, total).toFixed(1);

  const turnout = results ? fmtPct(results.total, results.totalHouseholds) : '0.0';
  const verifiedPct = results ? fmtPct(results.verified, results.total || 1) : '0.0';

  const onlineItems = results
    ? [
        { key: 'juristic', label: 'จัดตั้งนิติบุคคลหมู่บ้าน', count: results.juristic, color: 'from-fuchsia-500 to-rose-500', textColor: 'text-fuchsia-700', icon: '🏢' },
        { key: 'municipality', label: 'ให้เทศบาลรับภารกิจดูแล', count: results.municipality, color: 'from-blue-500 to-cyan-500', textColor: 'text-blue-700', icon: '🏛️' },
        { key: 'follow_majority', label: 'ออกเสียงตามข้างมาก', count: results.follow_majority, color: 'from-amber-500 to-orange-500', textColor: 'text-amber-700', icon: '🤝' },
        { key: 'abstain', label: 'งดออกเสียง', count: results.abstain, color: 'from-slate-500 to-zinc-500', textColor: 'text-slate-700', icon: '⚪' },
      ]
    : [];

  const offlineItems = results
    ? [
        { key: 'juristic_offline', label: 'จัดตั้งนิติบุคคลหมู่บ้าน', count: results.juristic_offline, color: 'from-indigo-500 to-violet-500', icon: '🏢' },
        { key: 'municipality_offline', label: 'ให้เทศบาลรับภารกิจดูแล', count: results.municipality_offline, color: 'from-teal-500 to-emerald-500', icon: '🏛️' },
        { key: 'follow_majority_offline', label: 'ออกเสียงตามข้างมาก', count: results.follow_majority_offline, color: 'from-sky-500 to-cyan-500', icon: '🤝' },
        { key: 'abstain_offline', label: 'งดออกเสียง', count: results.abstain_offline, color: 'from-gray-500 to-zinc-500', icon: '⚪' },
      ]
    : [];

  const leader = onlineItems.reduce<{ label: string; count: number }>(
    (best, item) => (item.count > best.count ? { label: item.label, count: item.count } : best),
    { label: 'ยังไม่มีคะแนน', count: 0 }
  );
  const projectorOnline = onlineItems.map((item) => ({
    ...item,
    percent: results ? fmtPct(item.count, Math.max(results.verified, 1)) : '0.0',
  }));

  const donutStyle = results
    ? {
        background: `conic-gradient(
          #d946ef 0% ${pct(results.juristic, Math.max(results.verified, 1))}%,
          #06b6d4 ${pct(results.juristic, Math.max(results.verified, 1))}% ${pct(results.juristic + results.municipality, Math.max(results.verified, 1))}%,
          #f59e0b ${pct(results.juristic + results.municipality, Math.max(results.verified, 1))}% ${pct(results.juristic + results.municipality + results.follow_majority, Math.max(results.verified, 1))}%,
          #71717a ${pct(results.juristic + results.municipality + results.follow_majority, Math.max(results.verified, 1))}% 100%
        )`,
      }
    : undefined;

  return (
    <div className="min-h-screen bg-[#f3f4f8] text-slate-900 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-fuchsia-300/40 blur-3xl" />
        <div className="absolute top-24 right-0 h-80 w-80 rounded-full bg-cyan-300/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-200/35 blur-3xl" />
      </div>

      <nav className="border-b border-white/70 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-slate-500">LIVE DASHBOARD</p>
            <h1 className="text-lg font-extrabold sm:text-2xl">ผลโหวตปัจจุบัน</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setProjectorMode((v) => !v)}
              className="rounded-full border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:-translate-y-0.5 hover:bg-indigo-100"
            >
              {projectorMode ? 'ปิดโหมดโปรเจคเตอร์' : 'โหมดโปรเจคเตอร์'}
            </button>
            <Link href="/login" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50">
              กลับหน้าเข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {loading ? (
          <div className="rounded-3xl border border-white/70 bg-white/80 p-10 text-center shadow-lg shadow-slate-200/80">
            <p className="text-slate-500">กำลังโหลดผลโหวต...</p>
          </div>
        ) : !results ? (
          <div className="rounded-3xl border border-red-100 bg-red-50 p-10 text-center text-red-700">
            ไม่สามารถโหลดข้อมูลได้
          </div>
        ) : projectorMode ? (
          <div className="space-y-6">
            <section className="rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-cyan-950 p-6 text-white shadow-2xl sm:p-10">
              <p className="text-sm font-semibold tracking-[0.2em] text-cyan-200">PROJECTOR MODE</p>
              <h2 className="mt-2 text-3xl font-black sm:text-5xl">ผลโหวตงานประชุม</h2>
              <p className="mt-3 text-sm text-slate-200 sm:text-lg">สรุปคะแนนแบบตัวเลขขนาดใหญ่สำหรับการฉายจอ</p>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur sm:p-5">
                  <p className="text-xs text-slate-200 sm:text-sm">ผู้มีสิทธิ์</p>
                  <p className="mt-1 text-4xl font-black sm:text-6xl">{results.totalHouseholds}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur sm:p-5">
                  <p className="text-xs text-slate-200 sm:text-sm">ส่งมติแล้ว</p>
                  <p className="mt-1 text-4xl font-black sm:text-6xl">{results.total}</p>
                  <p className="text-xs text-cyan-200 sm:text-sm">{turnout}% turnout</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur sm:p-5">
                  <p className="text-xs text-slate-200 sm:text-sm">ผ่านการตรวจ</p>
                  <p className="mt-1 text-4xl font-black sm:text-6xl">{results.verified}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur sm:p-5">
                  <p className="text-xs text-slate-200 sm:text-sm">ออฟไลน์</p>
                  <p className="mt-1 text-4xl font-black sm:text-6xl">{results.offline}</p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-xl shadow-slate-300/40 sm:p-8">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <h3 className="text-2xl font-black text-slate-900 sm:text-4xl">คะแนนออนไลน์ (นับแล้ว)</h3>
                <p className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600 sm:text-base">รวม {results.verified} คะแนน</p>
              </div>
              {results.verified === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-8 text-center text-xl text-slate-500">ยังไม่มีคะแนนออนไลน์ที่นับแล้ว</p>
              ) : (
                <div className="space-y-4">
                  {projectorOnline.map((item) => (
                    <div key={`projector-${item.key}`} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-lg font-bold text-slate-800 sm:text-2xl">{item.icon} {item.label}</p>
                        <p className="text-xl font-black text-slate-900 sm:text-3xl">{item.count} <span className="text-sm font-bold text-slate-500 sm:text-lg">({item.percent}%)</span></p>
                      </div>
                      <div className="h-4 w-full overflow-hidden rounded-full bg-slate-200 sm:h-5">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${item.color} transition-all duration-700 ease-out`}
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
              {[
                { label: 'รอรับเอกสาร', value: results.submitted, cls: 'bg-amber-50 border-amber-200 text-amber-800' },
                { label: 'ไม่ผ่านการตรวจ', value: results.rejected, cls: 'bg-rose-50 border-rose-200 text-rose-800' },
                { label: 'เสียงนำ', value: `${leader.label} (${leader.count})`, cls: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
              ].map((item) => (
                <article key={item.label} className={`rounded-2xl border p-4 sm:p-5 ${item.cls}`}>
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="mt-1 text-2xl font-black sm:text-4xl">{item.value}</p>
                </article>
              ))}
            </section>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-cyan-900 p-5 text-white shadow-2xl shadow-cyan-900/20 sm:p-8">
              <div className="absolute -right-12 -top-14 h-44 w-44 rounded-full bg-white/10" />
              <div className="absolute -bottom-10 right-20 h-40 w-40 rounded-full bg-cyan-300/15" />
              <div className="relative grid gap-4 sm:grid-cols-2 sm:gap-6">
                <div>
                  <p className="text-sm font-semibold text-cyan-200">ภาพรวม ณ ตอนนี้</p>
                  <h2 className="mt-1 text-2xl font-extrabold sm:text-4xl">บอร์ดสรุปผลการลงมติ</h2>
                  <p className="mt-3 max-w-xl text-sm text-slate-200 sm:text-base">
                    แสดงผลแบบเรียลไทม์จากคะแนนออนไลน์ที่ผ่านการตรวจสอบและคะแนนออฟไลน์จากเจ้าหน้าที่
                  </p>
                  <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm backdrop-blur">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-300" />
                    ข้อมูลอัปเดตอัตโนมัติ
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 self-end sm:gap-4">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <p className="text-xs text-slate-200">ผู้มีสิทธิ์ทั้งหมด</p>
                    <p className="mt-1 text-3xl font-extrabold">{results.totalHouseholds}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <p className="text-xs text-slate-200">ส่งมติแล้ว</p>
                    <p className="mt-1 text-3xl font-extrabold">{results.total}</p>
                    <p className="text-xs text-cyan-200">{turnout}% turnout</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <p className="text-xs text-slate-200">คะแนนที่นับได้</p>
                    <p className="mt-1 text-3xl font-extrabold">{results.verified}</p>
                    <p className="text-xs text-emerald-200">{verifiedPct}% ของทั้งหมด</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <p className="text-xs text-slate-200">เสียงนำ</p>
                    <p className="mt-1 text-sm font-bold leading-tight">{leader.label}</p>
                    <p className="text-xs text-fuchsia-200">{leader.count} คะแนน</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'รอรับเอกสาร', value: results.submitted, chip: 'ยังไม่นับคะแนน', cls: 'from-amber-50 to-yellow-100 border-amber-200 text-amber-800' },
                { label: 'ผ่านการตรวจสอบ', value: results.verified, chip: 'นับผลแล้ว', cls: 'from-emerald-50 to-green-100 border-emerald-200 text-emerald-800' },
                { label: 'ไม่ผ่านการตรวจ', value: results.rejected, chip: 'ตัดออกจากการนับ', cls: 'from-rose-50 to-red-100 border-rose-200 text-rose-800' },
                { label: 'บันทึกออฟไลน์', value: results.offline, chip: 'โดยเจ้าหน้าที่', cls: 'from-sky-50 to-cyan-100 border-sky-200 text-sky-800' },
              ].map((card) => (
                <article key={card.label} className={`rounded-2xl border bg-gradient-to-br p-4 shadow-sm ${card.cls}`}>
                  <p className="text-xs font-semibold">{card.label}</p>
                  <p className="mt-2 text-3xl font-black">{card.value}</p>
                  <p className="mt-1 inline-flex rounded-full bg-white/60 px-2 py-1 text-[11px] font-semibold">{card.chip}</p>
                </article>
              ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <article className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-lg shadow-slate-200/60 sm:p-6">
                <div className="mb-4 flex items-end justify-between">
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-800">ผลคะแนนออนไลน์</h3>
                    <p className="text-sm text-slate-500">นับเฉพาะมติที่ผ่านการตรวจสอบเอกสาร ({results.verified} คะแนน)</p>
                  </div>
                </div>

                {results.verified === 0 ? (
                  <p className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500">ยังไม่มีคะแนนออนไลน์ที่ผ่านการตรวจสอบ</p>
                ) : (
                  <div className="space-y-4">
                    {onlineItems.map((opt) => {
                      const p = pct(opt.count, Math.max(results.verified, 1));
                      return (
                        <div key={opt.key} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 sm:p-4">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <span className="text-lg sm:text-xl">{opt.icon}</span>
                              <p className="text-sm font-semibold text-slate-700 sm:text-base">{opt.label}</p>
                            </div>
                            <p className={`text-sm font-extrabold sm:text-base ${opt.textColor}`}>{opt.count} เสียง ({fmtPct(opt.count, results.verified)}%)</p>
                          </div>
                          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                            <div className={`h-full rounded-full bg-gradient-to-r ${opt.color} transition-all duration-700 ease-out`} style={{ width: `${p}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>

              <article className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-lg shadow-slate-200/60 sm:p-6">
                <h3 className="text-xl font-extrabold text-slate-800">สัดส่วนคะแนนออนไลน์</h3>
                <p className="text-sm text-slate-500">จากคะแนนที่ผ่านการตรวจสอบ</p>

                {results.verified === 0 ? (
                  <p className="mt-6 rounded-2xl bg-slate-50 p-6 text-center text-slate-500">ยังไม่มีข้อมูลสำหรับกราฟ</p>
                ) : (
                  <>
                    <div className="mx-auto mt-6 grid w-48 place-items-center">
                      <div className="grid h-48 w-48 place-items-center rounded-full" style={donutStyle}>
                        <div className="grid h-32 w-32 place-items-center rounded-full bg-white text-center shadow-inner">
                          <p className="text-xs text-slate-500">คะแนนที่นับแล้ว</p>
                          <p className="text-3xl font-black text-slate-800">{results.verified}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 space-y-2">
                      {onlineItems.map((item) => (
                        <div key={`${item.key}-legend`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-sm font-medium text-slate-700">{item.icon} {item.label}</p>
                          <p className="text-sm font-bold text-slate-800">{fmtPct(item.count, results.verified)}%</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </article>
            </section>

            <section className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-lg shadow-slate-200/60 sm:p-6">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800">ผลคะแนนออฟไลน์</h3>
                  <p className="text-sm text-slate-500">มติที่บันทึกแบบออฟไลน์โดยเจ้าหน้าที่ ({results.offline} คะแนน)</p>
                </div>
              </div>

              {results.offline === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500">ยังไม่มีมติแบบออฟไลน์</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {offlineItems.map((opt) => (
                    <div key={opt.key} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                      <p className="text-sm font-semibold text-slate-700">{opt.icon} {opt.label}</p>
                      <p className="mt-2 text-3xl font-black text-slate-800">{opt.count}</p>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${opt.color} transition-all duration-700 ease-out`}
                          style={{ width: `${pct(opt.count, Math.max(results.offline, 1))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
