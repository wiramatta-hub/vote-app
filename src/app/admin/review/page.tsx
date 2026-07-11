'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Ballot } from '@/lib/types';

const CHOICE_LABEL: Record<string, string> = {
  juristic: 'จัดตั้งนิติบุคคลหมู่บ้าน',
  municipality: 'ให้เทศบาลรับภารกิจดูแล',
  abstain: 'งดออกเสียง',
  follow_majority: 'ออกเสียงตามข้างมาก',
};

const DOC_LABEL: Record<string, string> = {
  house_registration: 'สำเนาทะเบียนบ้าน',
  proxy_letter: 'ใบมอบฉันทะ',
  id_card_owner: 'บัตรประชาชนเจ้าบ้าน',
  id_card_proxy: 'บัตรประชาชนผู้รับมอบ',
};

export default function AdminReviewPage() {
  const router = useRouter();
  const [ballots, setBallots] = useState<Ballot[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVoter, setEditVoter] = useState('');
  const [editProxy, setEditProxy] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? ballots.filter((b) =>
        [
          b.household?.house_no,
          b.household?.owner_name,
          b.voter_name,
          b.proxy_name,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
    : ballots;

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/ballots?status=submitted')
      .then((r) => {
        if (r.status === 401) { router.push('/admin/login'); return null; }
        return r.json();
      })
      .then((d) => { if (d) setBallots(d); })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const startEdit = (b: Ballot) => {
    setEditingId(b.id);
    setEditVoter(b.voter_name);
    setEditProxy(b.proxy_name ?? '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditVoter('');
    setEditProxy('');
  };

  const saveEdit = async (b: Ballot) => {
    if (!editVoter.trim()) { alert('กรุณากรอกชื่อผู้ลงมติ'); return; }
    if (b.is_proxy && !editProxy.trim()) { alert('กรุณากรอกชื่อผู้รับมอบฉันทะ'); return; }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/ballots/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter_name: editVoter.trim(), proxy_name: editProxy.trim() }),
      });
      const d = await res.json();
      if (!res.ok) { alert(d.error ?? 'เกิดข้อผิดพลาด'); return; }
      setBallots((prev) =>
        prev.map((x) =>
          x.id === b.id ? { ...x, voter_name: d.voter_name, proxy_name: d.proxy_name } : x
        )
      );
      cancelEdit();
    } finally {
      setSavingEdit(false);
    }
  };

  const review = async (id: string, action: 'verify' | 'reject') => {
    let reason = '';
    if (action === 'reject') {
      reason = window.prompt('ระบุเหตุผลการปฏิเสธ') ?? '';
      if (!reason.trim()) return;
    }
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/ballots/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      if (res.ok) setBallots((prev) => prev.filter((b) => b.id !== id));
      else {
        const d = await res.json();
        alert(d.error ?? 'เกิดข้อผิดพลาด');
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gray-800 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-lg">⚙️ ระบบผู้ดูแล</span>
          <div className="hidden sm:flex gap-4 text-sm">
            <Link href="/admin" className="hover:text-indigo-300">ภาพรวม</Link>
            <Link href="/admin/review" className="hover:text-indigo-300 font-medium text-indigo-300">ตรวจเอกสาร</Link>
            <Link href="/admin/results" className="hover:text-indigo-300">ผลโหวต</Link>
            <Link href="/admin/households" className="hover:text-indigo-300">จัดการบ้าน</Link>
          </div>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-300 hover:text-white">ออกจากระบบ</button>
      </nav>

      <div className="p-6 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          ตรวจสอบมติ {!loading && `(${filtered.length} รายการ)`}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          📝 กด “ผ่านการตรวจ” หลังได้รับเอกสารตัวจริงและตรวจสอบความถูกต้องแล้วเท่านั้น
        </p>

        {!loading && ballots.length > 0 && (
          <div className="relative mb-6">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา บ้านเลขที่ / ชื่อเจ้าบ้าน / ผู้ลงมติ / ผู้รับมอบฉันทะ"
              className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-800 bg-white"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="ล้างคำค้นหา"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">กำลังโหลด...</p>
        ) : ballots.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
            ไม่มีรายการรอตรวจสอบ
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
            ไม่พบรายการที่ตรงกับ “{search}”
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((b) => (
              <div key={b.id} className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-800">
                      บ้านเลขที่ {b.household?.house_no}
                      {b.household?.owner_name && (
                        <span className="text-gray-500 font-normal ml-2">({b.household.owner_name})</span>
                      )}
                    </p>
                    {editingId === b.id ? (
                      <div className="mt-2 space-y-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">ชื่อผู้ลงมติ</label>
                          <input
                            type="text"
                            value={editVoter}
                            onChange={(e) => setEditVoter(e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800"
                          />
                        </div>
                        {b.is_proxy && (
                          <div>
                            <label className="block text-xs text-amber-600 mb-1">ชื่อผู้รับมอบฉันทะ</label>
                            <input
                              type="text"
                              value={editProxy}
                              onChange={(e) => setEditProxy(e.target.value)}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800"
                            />
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => saveEdit(b)}
                            disabled={savingEdit}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs rounded-lg"
                          >
                            {savingEdit ? 'กำลังบันทึก...' : 'บันทึก'}
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={savingEdit}
                            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          ผู้ลงมติ: {b.voter_name}
                          <button
                            onClick={() => startEdit(b)}
                            aria-label="แก้ไขชื่อผู้ลงมติ"
                            className="text-indigo-500 hover:text-indigo-700 text-xs underline"
                          >
                            ✏️ แก้ไข
                          </button>
                        </p>
                        {b.is_proxy && (
                          <p className="text-sm text-amber-600">มอบฉันทะให้: {b.proxy_name}</p>
                        )}
                      </>
                    )}
                  </div>
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-full whitespace-nowrap">
                    {CHOICE_LABEL[b.choice] ?? b.choice}
                  </span>
                </div>

                {b.documents && b.documents.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {b.documents.map((d) => (
                      <a
                        key={d.id}
                        href={`/api/documents/${d.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700"
                      >
                        📎 {DOC_LABEL[d.doc_type] ?? d.doc_type}
                      </a>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => review(b.id, 'verify')}
                    disabled={busyId === b.id}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium rounded-lg transition-colors text-sm"
                  >
                    ✓ ผ่านการตรวจ
                  </button>
                  <button
                    onClick={() => review(b.id, 'reject')}
                    disabled={busyId === b.id}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium rounded-lg transition-colors text-sm"
                  >
                    ✕ ปฏิเสธ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
