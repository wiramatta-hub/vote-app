'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { VoteConfig } from '@/lib/types';
import {
  REPRESENTATIVES,
  type RepresentativeDecision,
  type RepresentativeVote,
} from '@/lib/representatives';

interface HouseholdInfo {
  house_no: string;
  owner_name: string;
}

export default function VotePage() {
  const router = useRouter();
  const [config, setConfig] = useState<VoteConfig | null>(null);
  const [household, setHousehold] = useState<HouseholdInfo | null>(null);
  const [voterName, setVoterName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [representativeDecisions, setRepresentativeDecisions] = useState<Record<string, RepresentativeDecision | ''>>(
    () => Object.fromEntries(REPRESENTATIVES.map((name) => [name, '']))
  );

  const startsAtMs = config?.starts_at ? new Date(config.starts_at).getTime() : null;
  const endsAtMs = config?.ends_at ? new Date(config.ends_at).getTime() : null;
  const now = Date.now();
  const beforeStart = !!startsAtMs && now < startsAtMs;
  const afterEnd = !!endsAtMs && now > endsAtMs;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/config').then((r) => r.json()),
    ])
      .then(([cfg]) => {
        setConfig(cfg);
        // Pre-fill voter name from session via cookie (decoded on server)
        // We try to get household info by calling login again – instead we store it in a hidden div
      })
      .finally(() => setLoading(false));

    // Get household info from hidden meta tag we set via server component
    // Alternative: store in sessionStorage during login
    const stored = sessionStorage.getItem('household_info');
    if (stored) {
      const info = JSON.parse(stored);
      setHousehold(info);
      if (info.owner_name) setVoterName(info.owner_name);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (beforeStart) {
      setError('ยังไม่ถึงเวลาเริ่มลงมติ');
      return;
    }
    if (afterEnd) {
      setError('หมดเวลาลงมติแล้ว');
      return;
    }

    const representativeVotes: RepresentativeVote[] = REPRESENTATIVES.map((representative) => ({
      representative,
      decision: representativeDecisions[representative] as RepresentativeDecision,
    }));

    if (representativeVotes.some((vote) => !vote.decision)) {
      setError('กรุณาเลือกเห็นชอบหรือไม่เห็นชอบให้ครบทุกท่าน');
      return;
    }
    if (!voterName.trim()) { setError('กรุณากรอกชื่อ-นามสกุลผู้ลงมติ'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          representative_votes: representativeVotes,
          voter_name: voterName.trim(),
          is_proxy: false,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
        return;
      }

      sessionStorage.removeItem('household_info');
      router.push('/vote/success');
    } catch {
      setError('ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองอีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    sessionStorage.removeItem('household_info');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">กำลังโหลด...</p>
      </div>
    );
  }

  const formatDateThai = (value: string | null | undefined) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('th-TH', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe,_#eef2ff_45%,_#f8fafc_100%)] py-6 px-4 sm:py-10">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 rounded-3xl shadow-xl shadow-indigo-200 p-6 sm:p-8 mb-5 text-white">
          <div className="absolute -right-12 -top-14 h-44 w-44 rounded-full bg-white/10" />
          <div className="absolute -left-12 -bottom-16 h-48 w-48 rounded-full bg-cyan-300/15" />
          <div className="flex items-start justify-between">
            <div className="relative">
              <p className="text-xs font-semibold tracking-[0.18em] text-indigo-100">ONLINE VOTING</p>
              <h1 className="mt-2 text-xl font-bold leading-relaxed sm:text-2xl">
                {config?.vote_title ?? 'การลงมติออนไลน์'}
              </h1>
              {config?.village_name && (
                <p className="text-sm text-indigo-100 mt-1">{config.village_name}</p>
              )}
            </div>
            <button onClick={handleLogout} className="relative rounded-full bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20 transition-colors">
              ออกจากระบบ
            </button>
          </div>
          {household && (
            <div className="relative mt-5 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 text-sm backdrop-blur-sm">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-lg">⌂</span>
              <div>
                <span className="font-semibold">บ้านเลขที่ {household.house_no}</span>
              {household.owner_name && (
                  <span className="ml-2 text-indigo-100">{household.owner_name}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Vote Form */}
        <div className="bg-white/95 rounded-3xl shadow-xl shadow-indigo-100/70 p-5 sm:p-8 border border-white">
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/80 p-4 text-sm">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-600 text-lg text-white">◷</span>
            <div>
              <p className="font-semibold text-indigo-900">ช่วงเวลาลงมติ</p>
              <p className="mt-1 text-indigo-700">
              {formatDateThai(config?.starts_at)} - {formatDateThai(config?.ends_at)}
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Representative decisions */}
            <div>
              <div className="mb-4">
                <label className="block text-base font-bold text-slate-800">
                รายชื่อตัวแทนเพื่อเจรจากับทางที่ดิน <span className="text-red-500">*</span>
                </label>
                <p className="mt-1 text-sm text-slate-500">โปรดเลือกความเห็นของท่านต่อรายชื่อตัวแทนให้ครบทุกท่าน</p>
              </div>
              <div className="space-y-3">
                {REPRESENTATIVES.map((representative) => {
                  const selectedDecision = representativeDecisions[representative];

                  return (
                    <div key={representative} className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-4 transition-shadow hover:shadow-md">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700">
                          {representative.replace('คุณ', '').charAt(0)}
                        </span>
                        <p className="font-bold text-slate-800">{representative}</p>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        {[
                          { value: 'approve', label: '✓ เห็นชอบ', activeClass: 'border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-200' },
                          { value: 'reject', label: '✕ ไม่เห็นชอบ', activeClass: 'border-rose-500 bg-rose-500 text-white shadow-sm shadow-rose-200' },
                        ].map((option) => (
                          <label
                            key={option.value}
                            className={`flex cursor-pointer items-center justify-center rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                              selectedDecision === option.value
                                ? option.activeClass
                                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`representative-${representative}`}
                              value={option.value}
                              checked={selectedDecision === option.value}
                              onChange={() => setRepresentativeDecisions((prev) => ({
                                ...prev,
                                [representative]: option.value as RepresentativeDecision,
                              }))}
                              className="sr-only"
                            />
                <a
                  href="/proxy-letter.pdf"
                  download
                              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:from-indigo-300 disabled:to-indigo-300 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 disabled:shadow-none disabled:translate-y-0"
                >
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  ดาวน์โหลดแบบฟอร์มหนังสือมอบฉันทะ (PDF)
                </a>
                <p className="text-xs text-amber-700 leading-relaxed">
                  ดาวน์โหลดหนังสือมอบฉันทะ กรอกข้อมูล ลงลายมือชื่อ แล้วส่งเอกสารตัวจริง<br />
                  1. หนังสือมอบฉันทะ<br />
                  2. สำเนาบัตรประชาชน ลงชื่อพร้อมขีดคร่อม &ldquo;เอกสารใช้สำหรับการประชุมจัดตั้งนิติบุคคลเท่านั้น&rdquo;<br />
                  ตามที่อยู่ด้านล่าง
                </p>
                <div className="p-3 bg-white border border-amber-300 rounded-lg text-xs text-amber-900 leading-relaxed">
                  <p className="font-semibold mb-1">📮 ส่งเอกสารตัวจริงมาที่จิตอาสา</p>
                  <p>คุณอัญชลี อุดร โทรศัพท์ 094-824-3082</p>
                  <p>บ้านเลขที่ 900/401 ซอย 8 หมู่ 9 หมู่บ้านดีญ่า วาเลย์ (หางดง)</p>
                  <p>ตำบลหางดง อำเภอหางดง จังหวัดเชียงใหม่ 50230</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || beforeStart || afterEnd}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold rounded-xl transition-colors"
            >
              {submitting ? 'กำลังส่งมติ...' : beforeStart ? 'ยังไม่ถึงเวลาเริ่มลงมติ' : afterEnd ? 'หมดเวลาลงมติแล้ว' : 'ยืนยันและส่งมติ'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
