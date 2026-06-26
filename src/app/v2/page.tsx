'use client';

export default function V2LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="font-bold text-slate-900">Vote System</span>
            </div>
            <div className="flex gap-2">
              <a
                href="/v2/login"
                className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition"
              >
                เข้าสู่ระบบ
              </a>
              <a
                href="/v2/register"
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                สมัครใช้งาน
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center space-y-8 max-w-3xl mx-auto">
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 leading-tight">
              ระบบเลือกตั้ง
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                ออนไลน์ที่ง่าย
              </span>
            </h1>
            <p className="text-xl text-slate-600 leading-loose">
              สำหรับโรงเรียน หมู่บ้าน และองค์กร ที่ต้องการจัดการการลงมติอย่างสมัยใหม่ ปลอดภัย และโปร่งใส
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/v2/register"
              className="px-8 py-4 text-lg font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-500/30 transition transform hover:scale-105"
            >
              เริ่มสมัครใช้งานฟรี
            </a>
            <a
              href="/v2/login"
              className="px-8 py-4 text-lg font-semibold rounded-xl border-2 border-slate-300 text-slate-700 hover:border-blue-600 hover:text-blue-600 bg-white transition"
            >
              เข้าสู่ระบบ
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-2xl bg-white border border-slate-200 hover:border-blue-200 hover:shadow-lg transition">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
              <span className="text-2xl">📝</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">ตั้งค่าได้เอง</h3>
            <p className="text-slate-600 leading-relaxed">
              เพิ่มหมายเลข ชื่อผู้สมัคร และตั้งเวลาการเลือกตั้งโดยไม่ต้องติดต่อใครเลย
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-white border border-slate-200 hover:border-blue-200 hover:shadow-lg transition">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
              <span className="text-2xl">🔒</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">ปลอดภัย</h3>
            <p className="text-slate-600 leading-relaxed">
              ป้องกันการโหวตซ้ำ เก็บข้อมูลแบบเข้ารหัส และมีประวัติการลงคะแนนชัดเจน
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-white border border-slate-200 hover:border-blue-200 hover:shadow-lg transition">
            <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">ผลคะแนนเรียลไทม์</h3>
            <p className="text-slate-600 leading-relaxed">
              ดูผลคะแนนอัปเดตอยู่ตลอด พร้อมกราฟและสถิติแบบ live
            </p>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4 leading-snug">วิธีใช้งาน</h2>
          <p className="text-lg text-slate-600 leading-relaxed">เพียง 3 ขั้นตอนง่ายๆ</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-2xl mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">สมัครใช้งาน</h3>
              <p className="text-slate-600 text-center leading-relaxed">
                สมัครผ่านหน้า Register พร้อมตั้ง username และ password ของตัวเอง
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-2xl mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">ตั้งค่าการเลือกตั้ง</h3>
              <p className="text-slate-600 text-center leading-relaxed">
                เพิ่มหมายเลข ชื่อผู้สมัคร และกำหนดเวลา
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-2xl mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">แชร์และเริ่มโหวต</h3>
              <p className="text-slate-600 text-center leading-relaxed">
                คัดลอกลิงค์และแชร์ให้ผู้มีสิทธิ์ลงคะแนน
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl mb-20 text-white">
        <div className="text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold leading-snug">พร้อมที่จะเริ่มต้นหรือยัง?</h2>
          <p className="text-lg text-blue-100 max-w-xl mx-auto leading-relaxed">
            ไม่มีค่าใช้จ่าย ไม่ต้องลงทะเบียนบัตรเครดิต เพียงแค่สมัครและใช้งานได้เลย
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/v2/register"
              className="px-8 py-3 rounded-lg bg-white text-blue-600 font-semibold hover:bg-blue-50 transition"
            >
              สมัครใช้งาน
            </a>
            <a
              href="/v2/login"
              className="px-8 py-3 rounded-lg border-2 border-white text-white font-semibold hover:bg-white/10 transition"
            >
              เข้าสู่ระบบ
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 text-center text-slate-600 text-sm">
          <p>ระบบเลือกตั้งออนไลน์ © 2026</p>
          <a href="/v2/admin/login" className="text-blue-600 hover:text-blue-700 font-semibold mt-2 inline-block">
            สำหรับผู้ดูแลระบบ
          </a>
        </div>
      </footer>
    </div>
  );
}
