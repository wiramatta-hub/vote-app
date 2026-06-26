'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function V2RegisterPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState('');
  const [accountType, setAccountType] = useState('school');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!orgName.trim() || !username.trim() || !password) {
      setError('กรุณากรอกชื่อหน่วยงาน ชื่อผู้ใช้ และรหัสผ่าน');
      return;
    }
    if (password.length < 6) {
      setError('รหัสผ่านต้องยาวอย่างน้อย 6 ตัว');
      return;
    }
    if (password !== confirm) {
      setError('รหัสผ่านยืนยันไม่ตรงกัน');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/v2/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_name: orgName.trim(),
          account_type: accountType,
          display_name: displayName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          username: username.trim(),
          password,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'สมัครสมาชิกไม่สำเร็จ');
        setSubmitting(false);
        return;
      }
      // auto-login
      const loginRes = await fetch('/api/v2/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (loginRes.ok) {
        router.push('/v2/app');
      } else {
        router.push('/v2/login');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">สมัครใช้งานระบบเลือกตั้ง</h1>
        <p className="mt-1 text-sm text-slate-500">
          ลงทะเบียนหน่วยงานของคุณ แล้วเข้าใช้งานได้ทันที
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-800">ชื่อหน่วยงาน / โรงเรียน *</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="เช่น โรงเรียนบ้านหนองไผ่"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-800">ประเภท</label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="school">โรงเรียน</option>
              <option value="village">หมู่บ้าน</option>
              <option value="organization">องค์กร</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-800">ชื่อผู้ดูแล</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="ชื่อ-นามสกุล"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-800">เบอร์โทร</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08x-xxx-xxxx"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-800">อีเมล (Gmail)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@gmail.com"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className="text-sm font-semibold text-slate-800">ชื่อผู้ใช้ (สำหรับเข้าสู่ระบบ) *</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="a-z, 0-9, _ . - (4-32 ตัว)"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-800">รหัสผ่าน *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="อย่างน้อย 6 ตัว"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-800">ยืนยันรหัสผ่าน *</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? 'กำลังสมัคร...' : 'สมัครและเข้าใช้งาน'}
          </button>

          <p className="text-center text-sm text-slate-500">
            มีบัญชีอยู่แล้ว?{' '}
            <a href="/v2/login" className="font-semibold text-blue-700 hover:text-blue-900">
              เข้าสู่ระบบ
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
