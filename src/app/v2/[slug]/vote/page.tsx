'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Candidate = {
  id: string;
  candidate_no: number;
  candidate_name: string;
};

type DetailResponse = {
  ok: boolean;
  error?: string;
  account?: { slug: string; name: string };
  election?: { id: string; title: string; description: string | null } | null;
  candidates?: Candidate[];
};

export default function V2VotePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const router = useRouter();

  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [voterName, setVoterName] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    setLoading(true);
    fetch(`/api/v2/accounts/${slug}`)
      .then((r) => r.json())
      .then((json: DetailResponse) => {
        if (alive) setData(json);
      })
      .catch(() => {
        if (alive) setData({ ok: false, error: 'ไม่สามารถเชื่อมต่อได้' });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  async function handleSubmit() {
    setError(null);
    if (!voterName.trim()) {
      setError('กรุณากรอกชื่อผู้ลงคะแนน');
      return;
    }
    if (!selected) {
      setError('กรุณาเลือกผู้สมัคร');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v2/accounts/${slug}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: selected, voter_name: voterName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'ไม่สามารถบันทึกคะแนนได้');
        setSubmitting(false);
        return;
      }
      router.push(`/v2/${slug}/results`);
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <a href={`/v2/${slug}`} className="inline-flex items-center text-sm font-medium text-blue-700 hover:text-blue-900">
          ← กลับหน้าบัญชี
        </a>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {loading ? (
            <p className="text-slate-600">กำลังโหลด...</p>
          ) : !data?.ok ? (
            <p className="text-red-700">{data?.error ?? 'เกิดข้อผิดพลาด'}</p>
          ) : !data.election ? (
            <p className="text-amber-700">ยังไม่มีการเลือกตั้งที่เปิดใช้งาน</p>
          ) : (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{data.election.title}</h1>
                <p className="mt-1 text-sm text-slate-500">{data.account?.name}</p>
                {data.election.description && (
                  <p className="mt-2 text-sm text-slate-600">{data.election.description}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-800">ชื่อผู้ลงคะแนน</label>
                <input
                  type="text"
                  value={voterName}
                  onChange={(e) => setVoterName(e.target.value)}
                  placeholder="กรอกชื่อ-นามสกุล"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-800">เลือกผู้สมัคร</p>
                {!data.candidates || data.candidates.length === 0 ? (
                  <p className="text-sm text-slate-500">ยังไม่มีผู้สมัคร</p>
                ) : (
                  data.candidates.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelected(c.id)}
                      className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition ${
                        selected === c.id
                          ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-sm font-semibold text-slate-900">หมายเลข {c.candidate_no}</span>
                      <span className="text-sm text-slate-700">{c.candidate_name}</span>
                    </button>
                  ))
                )}
              </div>

              {error && <p className="text-sm text-red-700">{error}</p>}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? 'กำลังบันทึก...' : 'ยืนยันการลงคะแนน'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
