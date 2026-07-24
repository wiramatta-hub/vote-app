'use client';

    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 sm:flex sm:items-center sm:justify-center sm:py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-indigo-500/35 blur-3xl" />
        <div className="absolute -bottom-28 -right-16 h-96 w-96 rounded-full bg-cyan-400/25 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:38px_38px]" />
      </div>

      <div className="relative w-full max-w-lg">
        <div className="overflow-hidden rounded-[2rem] border border-white/15 bg-white/95 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 px-6 pb-14 pt-8 text-center text-white sm:px-10">
            <div className="absolute -right-14 -top-16 h-44 w-44 rounded-full bg-white/10" />
            <div className="absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-cyan-300/15" />
            <div className="relative">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-white/20 bg-white/15 shadow-lg backdrop-blur">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <p className="mt-4 text-xs font-bold tracking-[0.2em] text-indigo-100">ONLINE VOTING</p>
              <h1 className="mt-2 text-xl font-extrabold leading-relaxed sm:text-2xl">ลงมติเห็นชอบแต่งตั้งตัวแทนเจรจากับทางที่ดิน</h1>
              <p className="mt-2 text-sm text-indigo-100">เพื่อดำเนินการจัดตั้งนิติบุคคลหมู่บ้าน ดีญ่า วาเลย์ หางดง</p>
            </div>
          </div>

          <div className="relative -mt-6 rounded-t-[2rem] bg-white px-6 pb-7 pt-6 sm:px-10 sm:pb-8">

          <div className="mb-6 text-center">
            <p className="text-sm font-semibold text-slate-700">ยืนยันตัวตนเพื่อเริ่มลงมติ</p>
            <p className="mt-1 text-sm text-slate-500">กรอกบ้านเลขที่หรือชื่อ-นามสกุลอย่างใดอย่างหนึ่ง</p>

            <div className="mt-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 px-4 py-3">

                <p className="text-xs font-bold text-indigo-700">
                  เปิดรับลงมติถึง {formatThaiDateTime(endsAt)}
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days,
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
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
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setStartsAt(d.starts_at ?? null);
          setEndsAt(d.ends_at ?? null);
          setConfigActive(Boolean(d.is_active));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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

  const startMs = startsAt ? new Date(startsAt).getTime() : null;
  const endMs = endsAt ? new Date(endsAt).getTime() : null;
  const notStarted = startMs !== null && now < startMs;
  const remainingMs = endMs !== null ? Math.max(0, endMs - now) : 0;
  const isClosed = !configActive || (endMs !== null && now > endMs);
  const remaining = formatRemaining(remainingMs);

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
            <h1 className="text-2xl font-bold text-gray-800 mt-1">ลงมติเห็นชอบ แต่งตั้งบุคคลเป็นตัวแทนในการเจรจากับทางที่ดิน เพื่อดำเนินการจัดตั้งนิติบุคคลหมู่บ้าน ดีญ่า วาเลย์ หางดง</h1>
            <p className="text-gray-500 mt-1 text-sm">กรอกบ้านเลขที่หรือชื่อของท่านเพื่อเริ่มลงมติ</p>
            <p className="mt-3 inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-800 text-sm font-bold">
              กรอกอย่างใดอย่างหนึ่ง: บ้านเลขที่ หรือ ชื่อ-นามสกุล
            </p>

            <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
              {endsAt && (
                <p className="text-xs font-semibold text-indigo-700">
                  เปิดลงมติถึง {formatThaiDateTime(endsAt)}
                </p>
              )}
              {isClosed ? (
                <p className="mt-1 text-sm font-bold text-red-600">หมดเวลาลงมติแล้ว</p>
              ) : notStarted ? (
                <p className="mt-1 text-sm font-bold text-indigo-900">
                  เปิดลงมติ {startsAt ? formatThaiDateTime(startsAt) : ''}
                </p>
              ) : (
                <p className="mt-1 text-sm font-bold text-indigo-900">
                  เวลาคงเหลือ {remaining.days} วัน {remaining.hours}:{remaining.minutes}:{remaining.seconds}
                </p>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                บ้านเลขที่
              </label>
              <input
                type="text"
                placeholder="เช่น 1/1, 25, 100/5"
                value={form.house_no}
                onChange={(e) => setForm({ ...form, house_no: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                ชื่อ-นามสกุลเจ้าบ้าน
              </label>
              <input
                type="text"
                placeholder="ชื่อ-นามสกุลตามบัตรประชาชน"
                value={form.owner_name}
                onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              />
              <p className="mt-1.5 text-xs text-slate-400">กรอกช่องใดช่องหนึ่งเพื่อค้นหาสิทธิ์ลงมติของท่าน</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3.5 font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:from-indigo-700 hover:to-violet-700 disabled:translate-y-0 disabled:from-indigo-300 disabled:to-indigo-300 disabled:shadow-none"
            >
              {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <div className="mt-7 border-t border-slate-100 pt-5 text-center">
            <a href="/admin/login" className="text-xs text-slate-400 transition-colors hover:text-indigo-600">
              เข้าสู่ระบบสำหรับผู้ดูแล →
            </a>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
