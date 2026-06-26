'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Candidate = {
  id: string;
  election_id: string;
  candidate_no: number;
  candidate_name: string;
  display_order: number;
  is_active: boolean;
};

type Election = {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  candidates: Candidate[];
};

type Account = {
  id: string;
  slug: string;
  name: string;
  account_type: string;
  is_active: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  village: 'หมู่บ้าน',
  school: 'โรงเรียน',
  organization: 'องค์กร',
};

async function appFetch(url: string, init?: RequestInit): Promise<Response | null> {
  const res = await fetch(url, init);
  if (res.status === 401) {
    if (typeof window !== 'undefined') window.location.href = '/v2/login';
    return null;
  }
  return res;
}

export default function V2AppDashboard() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [newElection, setNewElection] = useState('');
  const [origin, setOrigin] = useState('');

  const load = useCallback(async () => {
    const res = await appFetch('/api/v2/app/overview');
    if (!res) return;
    const json = await res.json();
    if (res.ok) {
      setAccount(json.account);
      setElections(json.elections ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
    load();
  }, [load]);

  async function logout() {
    await fetch('/api/v2/auth/logout', { method: 'POST' });
    router.push('/v2/login');
  }

  async function createElection() {
    if (!newElection.trim()) return;
    const res = await appFetch('/api/v2/app/elections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newElection.trim(), is_active: true }),
    });
    if (!res) return;
    const json = await res.json();
    if (!res.ok) {
      alert(json.error ?? 'สร้างไม่สำเร็จ');
      return;
    }
    setNewElection('');
    load();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">กำลังโหลด...</p>
      </div>
    );
  }

  const publicUrl = account ? `${origin}/v2/${account.slug}` : '';

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{account?.name}</h1>
            <p className="text-sm text-slate-500">
              {TYPE_LABELS[account?.account_type ?? ''] ?? account?.account_type} | /{account?.slug}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ออกจากระบบ
          </button>
        </div>

        {account && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="font-semibold">ลิงก์สำหรับผู้ลงคะแนน</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="rounded bg-white px-2 py-1 text-xs text-emerald-900">{publicUrl}</code>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(publicUrl)}
                className="rounded border border-emerald-300 bg-white px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                คัดลอก
              </button>
              <a
                href={`/v2/${account.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border border-emerald-300 bg-white px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                เปิดหน้าโหวต
              </a>
            </div>
          </div>
        )}

        {account && <AccountNameEditor account={account} onChanged={load} />}

        <div className="space-y-3">
          {elections.length === 0 ? (
            <p className="text-sm text-slate-500">ยังไม่มีการเลือกตั้ง</p>
          ) : (
            elections.map((el) => <ElectionBlock key={el.id} election={el} onChanged={load} />)
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-800">เพิ่มการเลือกตั้งใหม่</p>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={newElection}
              onChange={(e) => setNewElection(e.target.value)}
              placeholder="เช่น เลือกตั้งประธานนักเรียน ปี 2569"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={createElection}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              เพิ่ม
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountNameEditor({ account, onChanged }: { account: Account; onChanged: () => void }) {
  const [name, setName] = useState(account.name);
  const [editing, setEditing] = useState(false);

  async function save() {
    const res = await appFetch('/api/v2/app/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (!res) return;
    if (res.ok) {
      setEditing(false);
      onChanged();
    } else {
      const json = await res.json();
      alert(json.error ?? 'บันทึกไม่สำเร็จ');
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">ชื่อหน่วยงาน</p>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900"
          >
            แก้ไข
          </button>
        )}
      </div>
      {editing ? (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={save}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            บันทึก
          </button>
          <button
            type="button"
            onClick={() => {
              setName(account.name);
              setEditing(false);
            }}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ยกเลิก
          </button>
        </div>
      ) : (
        <p className="mt-1 text-sm text-slate-700">{account.name}</p>
      )}
    </div>
  );
}

function ElectionBlock({ election, onChanged }: { election: Election; onChanged: () => void }) {
  const [candNo, setCandNo] = useState('');
  const [candName, setCandName] = useState('');

  async function toggleElection() {
    const res = await appFetch(`/api/v2/app/elections/${election.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: election.title,
        description: election.description,
        starts_at: election.starts_at,
        ends_at: election.ends_at,
        is_active: !election.is_active,
      }),
    });
    if (res) onChanged();
  }

  async function deleteElection() {
    if (!confirm('ลบการเลือกตั้งนี้พร้อมผู้สมัครทั้งหมด?')) return;
    const res = await appFetch(`/api/v2/app/elections/${election.id}`, { method: 'DELETE' });
    if (res) onChanged();
  }

  async function addCandidate() {
    const no = Number(candNo);
    if (!Number.isFinite(no) || !candName.trim()) {
      alert('กรอกหมายเลขและชื่อผู้สมัคร');
      return;
    }
    const res = await appFetch('/api/v2/app/candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        election_id: election.id,
        candidate_no: no,
        candidate_name: candName.trim(),
        display_order: no,
      }),
    });
    if (!res) return;
    const json = await res.json();
    if (!res.ok) {
      alert(json.error ?? 'เพิ่มไม่สำเร็จ');
      return;
    }
    setCandNo('');
    setCandName('');
    onChanged();
  }

  async function deleteCandidate(id: string) {
    if (!confirm('ลบผู้สมัครคนนี้?')) return;
    const res = await appFetch(`/api/v2/app/candidates/${id}`, { method: 'DELETE' });
    if (res) onChanged();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold text-slate-900">
          {election.title}{' '}
          <span className={`ml-1 text-xs ${election.is_active ? 'text-green-700' : 'text-slate-400'}`}>
            ({election.is_active ? 'เปิดโหวต' : 'ปิด'})
          </span>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleElection}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            {election.is_active ? 'ปิดโหวต' : 'เปิดโหวต'}
          </button>
          <button
            type="button"
            onClick={deleteElection}
            className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
          >
            ลบ
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-1">
        {election.candidates.length === 0 ? (
          <p className="text-xs text-slate-500">ยังไม่มีผู้สมัคร</p>
        ) : (
          election.candidates.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-3 py-1.5"
            >
              <span className="text-sm text-slate-800">
                หมายเลข {c.candidate_no} — {c.candidate_name}
              </span>
              <button
                type="button"
                onClick={() => deleteCandidate(c.id)}
                className="text-xs font-semibold text-red-600 hover:text-red-800"
              >
                ลบ
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="number"
          value={candNo}
          onChange={(e) => setCandNo(e.target.value)}
          placeholder="หมายเลข"
          className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
        <input
          type="text"
          value={candName}
          onChange={(e) => setCandName(e.target.value)}
          placeholder="ชื่อผู้สมัคร"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={addCandidate}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          เพิ่ม
        </button>
      </div>
    </div>
  );
}
