'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type Candidate = {
  id: string;
  candidate_no: number;
  candidate_name: string;
};

type DetailResponse = {
  ok: boolean;
  error?: string;
  hint?: string;
  account?: {
    slug: string;
    name: string;
    account_type: 'village' | 'school' | 'organization';
  };
  election?: {
    id: string;
    title: string;
    description: string | null;
    starts_at: string | null;
    ends_at: string | null;
  } | null;
  candidates?: Candidate[];
};

function formatDateThai(value: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  return d.toLocaleString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function V2AccountPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    let alive = true;
    setLoading(true);

    fetch(`/api/v2/accounts/${slug}`)
      .then((r) => r.json())
      .then((json: DetailResponse) => {
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
  }, [slug]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <a href="/v2" className="inline-flex items-center text-sm font-medium text-blue-700 hover:text-blue-900">
          ← กลับหน้ารวมบัญชี V2
        </a>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {loading ? (
            <p className="text-slate-600">กำลังโหลดข้อมูลบัญชี...</p>
          ) : !data?.ok ? (
            <div className="space-y-2">
              <p className="text-lg font-bold text-red-700">ไม่สามารถเปิดข้อมูลบัญชีได้</p>
              <p className="text-sm text-slate-600">{data?.error ?? 'เกิดข้อผิดพลาด'}</p>
              {data?.hint && <p className="text-sm text-amber-700">{data.hint}</p>}
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Account</p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900">{data.account?.name}</h1>
                <p className="mt-1 text-sm text-slate-500">slug: {data.account?.slug} | ประเภท: {data.account?.account_type}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">การเลือกตั้งที่เปิดใช้งาน</p>
                {data.election ? (
                  <div className="mt-2 space-y-1 text-sm text-slate-700">
                    <p className="font-medium">{data.election.title}</p>
                    {data.election.description && <p>{data.election.description}</p>}
                    <p>เริ่ม: {formatDateThai(data.election.starts_at)}</p>
                    <p>สิ้นสุด: {formatDateThai(data.election.ends_at)}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-amber-700">ยังไม่มีการเลือกตั้งที่เปิดใช้งาน</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-800">ผู้สมัคร</p>
                {!data.candidates || data.candidates.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">ยังไม่มีผู้สมัครในรายการ</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {data.candidates.map((candidate) => (
                      <div key={candidate.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                        <span className="text-sm font-semibold text-slate-900">หมายเลข {candidate.candidate_no}</span>
                        <span className="text-sm text-slate-700">{candidate.candidate_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
