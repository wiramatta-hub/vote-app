'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type CandidateResult = {
  id: string;
  candidate_no: number;
  candidate_name: string;
  votes: number;
};

type ResultsResponse = {
  ok: boolean;
  error?: string;
  account?: { name: string };
  election?: { id: string; title: string; description: string | null } | null;
  totalVotes?: number;
  results?: CandidateResult[];
};

export default function V2ResultsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [data, setData] = useState<ResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let alive = true;

    function load() {
      fetch(`/api/v2/accounts/${slug}/results`)
        .then((r) => r.json())
        .then((json: ResultsResponse) => {
          if (alive) setData(json);
        })
        .catch(() => {
          if (alive) setData({ ok: false, error: 'ไม่สามารถเชื่อมต่อได้' });
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }

    load();
    const timer = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [slug]);

  const total = data?.totalVotes ?? 0;
  const sorted = [...(data?.results ?? [])].sort((a, b) => b.votes - a.votes);
  const maxVotes = sorted[0]?.votes ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <a href={`/v2/${slug}`} className="inline-flex items-center text-sm font-medium text-blue-700 hover:text-blue-900">
          ← กลับหน้าบัญชี
        </a>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {loading ? (
            <p className="text-slate-600">กำลังโหลดผลคะแนน...</p>
          ) : !data?.ok ? (
            <p className="text-red-700">{data?.error ?? 'เกิดข้อผิดพลาด'}</p>
          ) : !data.election ? (
            <p className="text-amber-700">ยังไม่มีการเลือกตั้งที่เปิดใช้งาน</p>
          ) : (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{data.election.title}</h1>
                <p className="mt-1 text-sm text-slate-500">{data.account?.name}</p>
                <p className="mt-2 text-sm font-medium text-slate-700">รวมผู้ลงคะแนน: {total} คน</p>
              </div>

              <div className="space-y-3">
                {sorted.length === 0 ? (
                  <p className="text-sm text-slate-500">ยังไม่มีผู้สมัคร</p>
                ) : (
                  sorted.map((c, idx) => {
                    const pct = total > 0 ? Math.round((c.votes / total) * 100) : 0;
                    const isLeader = c.votes > 0 && c.votes === maxVotes;
                    return (
                      <div key={c.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-900">
                            {idx + 1}. หมายเลข {c.candidate_no} {c.candidate_name}
                            {isLeader && (
                              <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                                นำ
                              </span>
                            )}
                          </span>
                          <span className="text-sm font-semibold text-slate-700">
                            {c.votes} ({pct}%)
                          </span>
                        </div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-blue-600"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <p className="text-xs text-slate-400">อัปเดตอัตโนมัติทุก 5 วินาที</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
