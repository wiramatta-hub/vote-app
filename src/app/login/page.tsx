'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ house_no: '', owner_name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
        return;
      }

      if (data.household) {
        sessionStorage.setItem('household_info', JSON.stringify(data.household));
      }

      if (data.hasVoted && data.voteStatus === 'verified') {
        router.push('/vote/success?status=already_verified');
      } else if (data.hasVoted) {
        router.push('/vote/success?status=already_submitted');
      } else {
        router.push('/vote');
      }
    } catch {
      setError('ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองอีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-indigo-700">ระบบลงมติออนไลน์</p>
            <h1 className="text-2xl font-bold text-gray-800 mt-1">ลงมติเลือกรูปแบบการบริหารหมู่บ้าน</h1>
            <p className="text-gray-500 mt-1 text-sm">กรอกบ้านเลขที่หรือชื่อของท่านเพื่อเริ่มลงมติ</p>
            <p className="mt-3 inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-800 text-sm font-bold">
              กรอกอย่างใดอย่างหนึ่ง: บ้านเลขที่ หรือ ชื่อ-นามสกุล
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                บ้านเลขที่
              </label>
              <input
                type="text"
                placeholder="เช่น 1/1, 25, 100/5"
                value={form.house_no}
                onChange={(e) => setForm({ ...form, house_no: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ชื่อ-นามสกุลเจ้าบ้าน
              </label>
              <input
                type="text"
                placeholder="ชื่อ-นามสกุลตามบัตรประชาชน"
                value={form.owner_name}
                onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-800"
              />
              <p className="text-xs text-gray-400 mt-1">เจ้าหน้าที่จะตรวจสอบตัวตนจากสำเนาบัตรประชาชนที่ท่านส่งเอกสารให้ตัวแทน</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium rounded-lg transition-colors mt-2"
            >
              {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <a href="/admin/login" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              เข้าสู่ระบบสำหรับผู้ดูแล →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
