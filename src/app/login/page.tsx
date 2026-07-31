'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

function formatThaiDateTime(iso: string) {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('day')} ${THAI_MONTHS[Number(get('month')) - 1]} ${Number(get('year')) + 543} เวลา ${hour}:${get('minute')} น.`;
}

function formatRemaining(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(seconds / 86400),
    hours: String(Math.floor((seconds % 86400) / 3600)).padStart(2, '0'),
    minutes: String(Math.floor((seconds % 3600) / 60)).padStart(2, '0'),
    seconds: String(seconds % 60).padStart(2, '0'),
  };
}

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ house_no: '', owner_name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [configActive, setConfigActive] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    fetch('/api/config')
      .then((response) => (response.ok ? response.json() : null))
      .then((config) => {
        if (!config) return;
        setStartsAt(config.starts_at ?? null);
        setEndsAt(config.ends_at ?? null);
        setConfigActive(Boolean(config.is_active));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
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

  const startMs = startsAt ? new Date(startsAt).getTime() : null;
  const endMs = endsAt ? new Date(endsAt).getTime() : null;
  const notStarted = startMs !== null && now < startMs;
  const isClosed = !configActive || (endMs !== null && now > endMs);
  const remaining = formatRemaining(endMs !== null ? Math.max(0, endMs - now) : 0);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 sm:flex sm:items-center sm:justify-center sm:py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-indigo-500/35 blur-3xl" />
        <div className="absolute -bottom-28 -right-16 h-96 w-96 rounded-full bg-cyan-400/25 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:38px_38px]" />
      </div>

      <main className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/15 bg-white/95 shadow-2xl shadow-black/30 backdrop-blur">
        <section className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 px-6 pb-14 pt-8 text-center text-white sm:px-10">
          <div className="absolute -right-14 -top-16 h-44 w-44 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-cyan-300/15" />
          <div className="relative">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-white/20 bg-white/15 shadow-lg backdrop-blur">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <p className="mt-4 text-xs font-bold tracking-[0.2em] text-indigo-100">ONLINE VOTING</p>
            <h1 className="mt-2 text-xl font-extrabold leading-relaxed sm:text-2xl">
              รับรองรายชื่อจิตอาสาตัวแทนสมาชิกหมู่บ้านเพื่อ
              <br />
              ยื่นคําขอจดทะเบียนจัดตั้งนิติบุคคลหมู่บ้านจัดสรร
            </h1>
            <p className="mt-3 text-xs leading-relaxed text-indigo-100/95 sm:text-sm">
              📣 ขอความอนุเคราะห์ ร่วมลงชื่อรับรอง“ตัวแทนหมู่บ้าน”เพื่อดำเนินการจัดตั้งนิติบุคคลฯ
            </p>
          </div>
        </section>

        <section className="relative -mt-6 rounded-t-[2rem] bg-white px-6 pb-7 pt-6 sm:px-10 sm:pb-8">
          <div className="mb-6 text-center">
            <p className="text-sm font-semibold text-slate-700">ยืนยันตัวตนเพื่อลงชื่อรับรองตัวแทน</p>
            <p className="mt-1 text-sm text-slate-500">กรอกบ้านเลขที่หรือชื่อ-นามสกุลอย่างใดอย่างหนึ่ง</p>
            <div className="mt-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 px-4 py-3">
              {endsAt && <p className="text-xs font-bold text-indigo-700">เปิดให้ลงชื่อรับรอง ถึง {formatThaiDateTime(endsAt)}</p>}
              {isClosed ? (
                <p className="mt-1 text-sm font-bold text-rose-600">หมดเวลาให้ลงชื่อรับรองแล้ว</p>
              ) : notStarted ? (
                <p className="mt-1 text-sm font-bold text-indigo-900">เปิดลงชื่อรับรอง {startsAt ? formatThaiDateTime(startsAt) : ''}</p>
              ) : (
                <p className="mt-1 text-sm font-bold text-indigo-900">เวลาคงเหลือให้ลงชื่อรับรอง {remaining.days} วัน {remaining.hours}:{remaining.minutes}:{remaining.seconds}</p>
              )}
            </div>
          </div>

          {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">บ้านเลขที่</label>
              <input type="text" placeholder="เช่น 1/1, 25, 100/5" value={form.house_no} onChange={(event) => setForm({ ...form, house_no: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">ชื่อ-นามสกุลเจ้าบ้าน</label>
              <input type="text" placeholder="ชื่อ-นามสกุลตามบัตรประชาชน" value={form.owner_name} onChange={(event) => setForm({ ...form, owner_name: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100" />
              <p className="mt-1.5 text-xs text-slate-400">กรอกช่องใดช่องหนึ่งเพื่อค้นหาสิทธิ์ลงมติของท่าน</p>
            </div>
            <button type="submit" disabled={loading} className="mt-2 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3.5 font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:from-indigo-700 hover:to-violet-700 disabled:translate-y-0 disabled:from-indigo-300 disabled:to-indigo-300 disabled:shadow-none">
              {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <div className="mt-7 border-t border-slate-100 pt-5 text-center">
            <a href="/admin/login" className="text-xs text-slate-400 transition-colors hover:text-indigo-600">เข้าสู่ระบบสำหรับผู้ดูแล →</a>
          </div>
        </section>
      </main>
    </div>
  );
}
