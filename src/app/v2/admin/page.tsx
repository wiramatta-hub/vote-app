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
  account_id: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  candidates: Candidate[];
};

type Account = {
  id: string;
  slug: string;
  name: string;
  account_type: string;
  is_active: boolean;
  elections: Election[];
};

const TYPE_LABELS: Record<string, string> = {
  village: 'หมู่บ้าน',
  school: 'โรงเรียน',
  organization: 'องค์กร',
};

async function adminFetch(url: string, init?: RequestInit): Promise<Response | null> {
  const res = await fetch(url, init);
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      window.location.href = '/v2/admin/login';
    }
    return null;
  }
  return res;
}

export default function V2AdminDashboard() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // new account form
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState('school');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/v2/admin/overview');
      if (res.status === 401) {
        router.push('/v2/admin/login');
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'ไม่สามารถโหลดข้อมูลได้');
        return;
      }
      setAccounts(json.accounts ?? []);
      setError(null);
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function logout() {
    await fetch('/api/v2/admin/logout', { method: 'POST' });
    router.push('/v2/admin/login');
  }

  async function createAccount() {
    if (!newAccountName.trim()) return;
    const res = await adminFetch('/api/v2/admin/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newAccountName.trim(), account_type: newAccountType }),
    });
    if (!res) return;
    const json = await res.json();
    if (!res.ok) {
      alert(json.error ?? 'สร้างบัญชีไม่สำเร็จ');
      return;
    }
    setNewAccountName('');
    load();
  }

  async function deleteAccount(id: string) {
    if (!confirm('ลบบัญชีนี้พร้อมการเลือกตั้งและผู้สมัครทั้งหมด?')) return;
    const res = await adminFetch(`/api/v2/admin/accounts/${id}`, { method: 'DELETE' });
    if (!res) return;
    if (!res.ok) {
      const json = await res.json();
      alert(json.error ?? 'ลบไม่สำเร็จ');
      return;
    }
    load();
  }

  async function toggleAccount(acc: Account) {
    const res = await adminFetch(`/api/v2/admin/accounts/${acc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: acc.name, is_active: !acc.is_active }),
    });
    if (res && res.ok) load();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">ผู้ดูแลระบบ V2</h1>
            <p className="text-sm text-slate-500">จัดการบัญชี การเลือกตั้ง และผู้สมัคร</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ออกจากระบบ
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {/* create account */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-800">เพิ่มบัญชีใหม่</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              type="text"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              placeholder="ชื่อบัญชี เช่น โรงเรียนบ้านหนองไผ่"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <select
              value={newAccountType}
              onChange={(e) => setNewAccountType(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="school">โรงเรียน</option>
              <option value="village">หมู่บ้าน</option>
              <option value="organization">องค์กร</option>
            </select>
            <button
              type="button"
              onClick={createAccount}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              เพิ่มบัญชี
            </button>
          </div>
        </div>

        {accounts.length === 0 ? (
          <p className="text-sm text-slate-500">ยังไม่มีบัญชี</p>
        ) : (
          accounts.map((acc) => (
            <AccountCard
              key={acc.id}
              account={acc}
              onChanged={load}
              onDelete={() => deleteAccount(acc.id)}
              onToggle={() => toggleAccount(acc)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function AccountCard({
  account,
  onChanged,
  onDelete,
  onToggle,
}: {
  account: Account;
  onChanged: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const [electionTitle, setElectionTitle] = useState('');

  async function createElection() {
    if (!electionTitle.trim()) return;
    const res = await adminFetch('/api/v2/admin/elections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: account.id, title: electionTitle.trim(), is_active: true }),
    });
    if (!res) return;
    const json = await res.json();
    if (!res.ok) {
      alert(json.error ?? 'สร้างการเลือกตั้งไม่สำเร็จ');
      return;
    }
    setElectionTitle('');
    onChanged();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{account.name}</h2>
          <p className="text-xs text-slate-500">
            slug: {account.slug} | {TYPE_LABELS[account.account_type] ?? account.account_type} |{' '}
            {account.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/v2/${account.slug}`}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            เปิดหน้าบัญชี
          </a>
          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {account.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
          >
            ลบ
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {account.elections.map((el) => (
          <ElectionBlock key={el.id} election={el} onChanged={onChanged} />
        ))}
      </div>

      <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
        <input
          type="text"
          value={electionTitle}
          onChange={(e) => setElectionTitle(e.target.value)}
          placeholder="ชื่อการเลือกตั้งใหม่"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={createElection}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
        >
          เพิ่มการเลือกตั้ง
        </button>
      </div>
    </div>
  );
}

function ElectionBlock({ election, onChanged }: { election: Election; onChanged: () => void }) {
  const [candNo, setCandNo] = useState('');
  const [candName, setCandName] = useState('');

  async function toggleElection() {
    const res = await adminFetch(`/api/v2/admin/elections/${election.id}`, {
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
    if (!res) return;
    onChanged();
  }

  async function deleteElection() {
    if (!confirm('ลบการเลือกตั้งนี้พร้อมผู้สมัครทั้งหมด?')) return;
    const res = await adminFetch(`/api/v2/admin/elections/${election.id}`, { method: 'DELETE' });
    if (!res) return;
    onChanged();
  }

  async function addCandidate() {
    const no = Number(candNo);
    if (!Number.isFinite(no) || !candName.trim()) {
      alert('กรอกหมายเลขและชื่อผู้สมัคร');
      return;
    }
    const res = await adminFetch('/api/v2/admin/candidates', {
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
      alert(json.error ?? 'เพิ่มผู้สมัครไม่สำเร็จ');
      return;
    }
    setCandNo('');
    setCandName('');
    onChanged();
  }

  async function deleteCandidate(id: string) {
    if (!confirm('ลบผู้สมัครคนนี้?')) return;
    const res = await adminFetch(`/api/v2/admin/candidates/${id}`, { method: 'DELETE' });
    if (!res) return;
    onChanged();
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">
          {election.title}{' '}
          <span className={`ml-1 text-xs ${election.is_active ? 'text-green-700' : 'text-slate-400'}`}>
            ({election.is_active ? 'เปิด' : 'ปิด'})
          </span>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleElection}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            {election.is_active ? 'ปิด' : 'เปิด'}
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
              className="flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-1.5"
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
