'use client';

import { useEffect, useState } from 'react';

type Account = {
  slug: string;
  name: string;
  account_type: 'village' | 'school' | 'organization';
};

type AccountsResponse = {
  ok: boolean;
  error?: string;
  hint?: string;
  accounts?: Account[];
};

export default function V2LandingPage() {
  const [data, setData] = useState<AccountsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    fetch('/api/v2/accounts')
      .then((r) => r.json())
      .then((json: AccountsResponse) => {
        if (!alive) return;
        setData(json);
      })
      .catch(() => {
        if (!alive) return;
        setData({ ok: false, error: 'ไม่สามารถเชื่อมต่อ API V2 ได้' });
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-700">ระบบเลือกตั้งออนไลน์</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">สร้างการเลือกตั้งของหน่วยงานคุณเอง</h1>
            <p className="mt-3 text-slate-600">
              โรงเรียน หมู่บ้าน หรือองค์กร สมัครใช้งานได้เอง ตั้งหมายเลขและชื่อผู้สมัครเอง แล้วแชร์ลิงก์ให้คนมาโหวต
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href="/v2/register"
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            สมัครใช้งาน
          </a>
          <a
            href="/v2/login"
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            เข้าสู่ระบบ
          </a>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          สมัครเสร็จเข้าใช้งานได้ทันที — แต่ละหน่วยงานมีหน้าจัดการและลิงก์โหวตเป็นของตัวเอง
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">หน่วยงานที่เปิดให้โหวตอยู่</p>

          {loading ? (
            <p className="mt-2 text-sm text-slate-600">กำลังโหลดรายการ...</p>
          ) : !data?.ok ? (
            <div className="mt-2 space-y-1">
              <p className="text-sm text-red-700">{data?.error ?? 'เกิดข้อผิดพลาด'}</p>
              {data?.hint && <p className="text-sm text-amber-700">{data.hint}</p>}
            </div>
          ) : !data.accounts || data.accounts.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">ยังไม่มีหน่วยงานในระบบ</p>
          ) : (
            <div className="mt-3 space-y-2">
              {data.accounts.map((account) => (
                <a
                  key={account.slug}
                  href={`/v2/${account.slug}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:border-blue-300 hover:bg-blue-50"
                >
                  <span className="font-medium text-slate-800">{account.name}</span>
                  <span className="text-slate-500">/{account.slug}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 text-center">
          <a href="/v2/admin/login" className="text-xs text-slate-400 hover:text-slate-600">
            สำหรับผู้ดูแลระบบส่วนกลาง
          </a>
        </div>
      </div>
    </div>
  );
}
