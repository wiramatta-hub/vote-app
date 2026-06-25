export default function V2LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-blue-700">V2 Workspace</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">ระบบ Multi-User (แยกจากระบบเดิม)</h1>
        <p className="mt-3 text-slate-600">
          หน้านี้เป็น namespace ใหม่สาหรับพัฒนาระบบหลายบัญชี โดยแยก URL ออกจากระบบเดิมอย่างชัดเจน
          เพื่อลดความเสี่ยงต่อการใช้งาน production ปัจจุบัน
        </p>

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          เส้นทางเดิมยังคงใช้งานเหมือนเดิม: /login, /vote, /admin
        </div>

        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          เส้นทางระบบใหม่: /v2/* และ API ใต้ /api/v2/*
        </div>
      </div>
    </div>
  );
}
