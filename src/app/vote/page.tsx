'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { VoteConfig } from '@/lib/types';

interface HouseholdInfo {
  house_no: string;
  owner_name: string;
}

export default function VotePage() {
  const router = useRouter();
  const [config, setConfig] = useState<VoteConfig | null>(null);
  const [household, setHousehold] = useState<HouseholdInfo | null>(null);
  const [choice, setChoice] = useState<'juristic' | 'municipality' | ''>('');
  const [voterName, setVoterName] = useState('');
  const [isProxy, setIsProxy] = useState(false);
  const [houseRegFile, setHouseRegFile] = useState<File | null>(null);
  const [proxyFile, setProxyFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const validateFiles = (files: (File | null)[]) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    for (const file of files) {
      if (!file) continue;
      if (!allowed.includes(file.type)) return 'รองรับเฉพาะไฟล์ JPG, PNG, WebP และ PDF';
      if (file.size > 5 * 1024 * 1024) return 'ขนาดไฟล์ต้องไม่เกิน 5MB ต่อไฟล์';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!choice) { setError('กรุณาเลือกมติ'); return; }
    if (!voterName.trim()) { setError('กรุณากรอกชื่อ-นามสกุลผู้ลงมติ'); return; }
    if (!houseRegFile) { setError('กรุณาแนบสำเนาบัตรประชาชน (ขีดคร่อมบัตร)'); return; }
    if (isProxy && !proxyFile) { setError('กรุณาแนบใบมอบฉันทะ'); return; }

    const fileError = validateFiles([houseRegFile, proxyFile]);
    if (fileError) { setError(fileError); return; }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('choice', choice);
      formData.append('voter_name', voterName.trim());
      formData.append('is_proxy', String(isProxy));
      if (isProxy) {
        formData.append('proxy_letter', proxyFile!);
      }
      formData.append('house_registration', houseRegFile);

      const res = await fetch('/api/vote', { method: 'POST', body: formData });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-6 px-4">
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
                      onChange={() => setChoice(opt.value as 'juristic' | 'municipality')}
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
                <a
                  href="/proxy-letter.pdf"
                  download
                  className="flex items-center gap-2 p-3 bg-white border border-amber-300 rounded-lg text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors"
                >
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  ดาวน์โหลดแบบฟอร์มหนังสือมอบฉันทะ (PDF)
                </a>
                <p className="text-xs text-amber-700">ดาวน์โหลด กรอกข้อมูล ลงลายมือชื่อ แล้วถ่ายรูปหรือสแกนเพื่ออัปโหลดด้านล่าง</p>
                <div className="p-3 bg-white border border-amber-300 rounded-lg text-xs text-amber-900 leading-relaxed">
                  <p className="font-semibold mb-1">📮 ส่งเอกสารตัวจริงมาที่</p>
                  <p>คุณอัญชลี อุดร โทรศัพท์ 094-824-3082</p>
                  <p>บ้านเลขที่ 900/401 ซอย 8 หมู่ 9 หมู่บ้านดีญ่า วาเลย์ (หางดง)</p>
                  <p>ตำบลหางดง อำเภอหางดง จังหวัดเชียงใหม่ 50230</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ใบมอบฉันทะ <span className="text-red-500">*</span>
                  </label>
                  <FileInput
                    file={proxyFile}
                    onChange={setProxyFile}
                    placeholder="อัปโหลดใบมอบฉันทะ (JPG, PNG, PDF)"
                  />
                </div>
              </div>
            )}

            {/* ID Card */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                สำเนาบัตรประชาชน (ขีดคร่อมบัตร) <span className="text-red-500">*</span>
              </label>
              <FileInput
                file={houseRegFile}
                onChange={setHouseRegFile}
                placeholder="อัปโหลดสำเนาบัตรประชาชน (JPG, PNG, PDF)"
              />
              <p className="text-xs text-gray-400 mt-1">กรุณาขีดคร่อมบัตรพร้อมเขียนกำกับว่า “ใช้สำหรับการประชุมจัดตั้งนิติบุคคลเท่านั้น” • ขนาดไฟล์ไม่เกิน 5MB</p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold rounded-xl transition-colors"
            >
              {submitting ? 'กำลังส่งมติ...' : 'ยืนยันและส่งมติ'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function FileInput({
  file,
  onChange,
  placeholder,
}: {
  file: File | null;
  onChange: (f: File | null) => void;
  placeholder: string;
}) {
  return (
    <label className="block cursor-pointer">
      <div className={`flex items-center gap-3 p-3 border-2 border-dashed rounded-lg transition-colors ${
        file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
      }`}>
        <svg className={`w-5 h-5 ${file ? 'text-green-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d={file
              ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              : "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"}
          />
        </svg>
        <span className={`text-sm ${file ? 'text-green-700 font-medium' : 'text-gray-500'}`}>
          {file ? file.name : placeholder}
        </span>
        {file && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onChange(null); }}
            className="ml-auto text-gray-400 hover:text-red-500"
          >
            ✕
          </button>
        )}
      </div>
      <input
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
