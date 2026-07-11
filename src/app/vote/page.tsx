'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { VoteConfig, VoteChoice } from '@/lib/types';

interface HouseholdInfo {
  house_no: string;
  owner_name: string;
}

export default function VotePage() {
  const router = useRouter();
  const [config, setConfig] = useState<VoteConfig | null>(null);
  const [household, setHousehold] = useState<HouseholdInfo | null>(null);
  const [choice, setChoice] = useState<VoteChoice | ''>('');
  const [voterName, setVoterName] = useState('');
  const [isProxy, setIsProxy] = useState(false);
  const [proxyName, setProxyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/config').then((r) => r.json()),
      fetch('/api/voter/me').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([cfg, me]) => {
        setConfig(cfg);
        if (me) {
          setHousehold({ house_no: me.house_no, owner_name: me.owner_name });
        } else {
          const stored = sessionStorage.getItem('household_info');
          if (stored) setHousehold(JSON.parse(stored));
        }
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!choice) { setError('กรุณาเลือกมติ'); return; }
    if (!voterName.trim()) { setError('กรุณากรอกชื่อ-นามสกุลผู้ลงมติ'); return; }
    if (isProxy && !proxyName.trim()) { setError('กรุณากรอกชื่อผู้รับมอบฉันทะ'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          choice,
          voter_name: voterName.trim(),
          is_proxy: isProxy,
          proxy_name: isProxy ? proxyName.trim() : '',
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

  const optionA = config?.option_a_label ?? 'จัดตั้งนิติบุคคลหมู่บ้าน';
  const optionB = config?.option_b_label ?? 'ให้เทศบาลรับภารกิจดูแล';

  const now = new Date();
  const startsAt = config?.starts_at ? new Date(config.starts_at) : null;
  const endsAt = config?.ends_at ? new Date(config.ends_at) : null;
  const notActive = config ? config.is_active === false : false;
  const notStarted = !!startsAt && now < startsAt;
  const ended = !!endsAt && now > endsAt;
  const votingClosed = notActive || notStarted || ended;

  const fmtThai = (d: Date) =>
    d.toLocaleString('th-TH', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'Asia/Bangkok',
    });

  const closedMessage = notActive
    ? 'ระบบลงมติปิดอยู่ในขณะนี้'
    : notStarted
    ? `ยังไม่ถึงเวลาเปิดลงมติ จะเปิดในวันที่ ${startsAt ? fmtThai(startsAt) : ''}`
    : `ปิดรับการลงมติแล้ว เมื่อ ${endsAt ? fmtThai(endsAt) : ''}`;

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 py-6 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                {config?.vote_title ?? 'การลงมติออนไลน์'}
              </h1>
              {config?.village_name && (
                <p className="text-sm text-gray-500 mt-0.5">{config.village_name}</p>
              )}
            </div>
            <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-gray-600 underline">
              ออกจากระบบ
            </button>
          </div>
          {household && (
            <div className="mt-3 p-3 bg-indigo-50 rounded-lg text-sm">
              <span className="text-indigo-700 font-medium">บ้านเลขที่ {household.house_no}</span>
              {household.owner_name && (
                <span className="text-gray-600 ml-2">({household.owner_name})</span>
              )}
            </div>
          )}
        </div>

        {/* Vote Form */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {votingClosed ? (
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl text-center">
              <p className="text-3xl mb-2">⏳</p>
              <p className="font-semibold text-amber-800">{closedMessage}</p>
            </div>
          ) : (
          <>
          {endsAt && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm text-center">
              เปิดรับการลงมติถึง {fmtThai(endsAt)}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Choice */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                เลือกมติ <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { value: 'juristic', label: optionA, icon: '🏢', desc: 'จัดตั้งนิติบุคคลดูแลหมู่บ้านเอง' },
                  { value: 'municipality', label: optionB, icon: '🏛️', desc: 'ให้เทศบาลรับหน้าที่ดูแลแทน' },
                  { value: 'abstain', label: 'งดออกเสียง', icon: '🤚', desc: 'ไม่ประสงค์ออกเสียงในมตินี้' },
                  { value: 'follow_majority', label: 'ออกเสียงตามข้างมาก', icon: '🤝', desc: 'ขอลงมติตามผลเสียงข้างมาก' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      choice === opt.value
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="choice"
                      value={opt.value}
                      checked={choice === opt.value}
                      onChange={() => setChoice(opt.value as VoteChoice)}
                      className="sr-only"
                    />
                    <span className="text-2xl">{opt.icon}</span>
                    <div>
                      <p className="font-semibold text-gray-800">{opt.label}</p>
                      <p className="text-xs text-gray-500">{opt.desc}</p>
                    </div>
                    <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      choice === opt.value ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                    }`}>
                      {choice === opt.value && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Voter Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                ชื่อ-นามสกุลผู้ลงมติ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="ชื่อ-นามสกุลตามบัตรประชาชน"
                value={voterName}
                onChange={(e) => setVoterName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-800"
              />
            </div>

            {/* Proxy toggle */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isProxy}
                  onChange={(e) => setIsProxy(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">ลงมติแทน (มอบฉันทะ)</span>
              </label>
            </div>

            {/* Proxy fields */}
            {isProxy && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                <p className="text-sm font-semibold text-amber-800">ข้อมูลการมอบฉันทะ</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ชื่อผู้รับมอบฉันทะ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={isProxy}
                    placeholder="ชื่อ-นามสกุลผู้รับมอบ"
                    value={proxyName}
                    onChange={(e) => setProxyName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-800"
                  />
                </div>
                <div className="p-3 bg-white border border-amber-200 rounded-lg text-sm text-gray-700 leading-relaxed">
                  <p className="font-semibold text-amber-800 mb-1">📮 ส่งเอกสารตัวจริงมาที่ตัวจิตอาสา</p>
                  <p>คุณอัญชลี อุดร โทรศัพท์ 094-824-3082</p>
                  <p>บ้านเลขที่ 900/401 ซอย 8 หมู่ 9 หมู่บ้านบีญา วาเลย์ (หางดง)</p>
                  <p>ตำบลหางดง อำเภอหางดง จังหวัดเชียงใหม่ 50230</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold rounded-xl transition-colors"
            >
              {submitting ? 'กำลังส่งมติ...' : 'ยืนยันและส่งมติ'}
            </button>
          </form>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
