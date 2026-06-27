'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Candidate = {
  id: string;
  candidate_no: number;
  candidate_name: string;
  candidate_image_url: string | null;
};

type DetailResponse = {
  ok: boolean;
  error?: string;
  account?: {
    slug: string;
    name: string;
    account_type: 'village' | 'school' | 'organization';
  };
  election?: { id: string; title: string; description: string | null } | null;
  candidates?: Candidate[];
};

function getVoterFieldMeta(accountType?: 'village' | 'school' | 'organization') {
  if (accountType === 'school') {
    return {
      label: 'ผู้ลงคะแนน (ชื่อ-นามสกุล หรือ รหัสประจำตัวนักเรียน)',
      placeholder: 'เช่น สมชาย ใจดี หรือ 65123456',
      help: 'กรอกได้ทั้งชื่อ-นามสกุล หรือรหัสประจำตัวนักเรียน',
      requiredText: 'ข้อมูลผู้ลงคะแนน',
    };
  }
  if (accountType === 'organization') {
    return {
      label: 'ผู้ลงคะแนน (ชื่อ-นามสกุล หรือ รหัสพนักงาน)',
      placeholder: 'เช่น สมชาย ใจดี หรือ EMP-1024',
      help: 'กรอกได้ทั้งชื่อ-นามสกุล หรือรหัสพนักงาน',
      requiredText: 'ข้อมูลผู้ลงคะแนน',
    };
  }
  if (accountType === 'village') {
    return {
      label: 'ผู้ลงคะแนน (ชื่อ-นามสกุล หรือ เลขที่บ้าน)',
      placeholder: 'เช่น สมชาย ใจดี หรือ 99/12',
      help: 'กรอกได้ทั้งชื่อ-นามสกุล หรือเลขที่บ้าน',
      requiredText: 'ข้อมูลผู้ลงคะแนน',
    };
  }

  return {
    label: 'ผู้ลงคะแนน (ชื่อ-นามสกุล หรือ รหัส)',
    placeholder: 'เช่น สมชาย ใจดี หรือ รหัสผู้ลงคะแนน',
    help: 'กรอกได้ทั้งชื่อ-นามสกุล หรือรหัสผู้ลงคะแนน',
    requiredText: 'ข้อมูลผู้ลงคะแนน',
  };
}

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
  const voterField = getVoterFieldMeta(data?.account?.account_type);

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
      setError(`กรุณากรอก${voterField.requiredText}`);
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
                <label className="text-sm font-semibold text-slate-800">{voterField.label}</label>
                <input
                  type="text"
                  value={voterName}
                  onChange={(e) => setVoterName(e.target.value)}
                  placeholder={voterField.placeholder}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <p className="mt-1 text-xs text-slate-500">{voterField.help}</p>
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
                      <span className="flex items-center gap-3">
                        {c.candidate_image_url ? (
                          <img
                            src={c.candidate_image_url}
                            alt={c.candidate_name}
                            className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                          />
                        ) : (
                          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-bold text-slate-500">
                            {c.candidate_no}
                          </span>
                        )}
                        <span className="text-sm font-semibold text-slate-900">หมายเลข {c.candidate_no}</span>
                      </span>
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
