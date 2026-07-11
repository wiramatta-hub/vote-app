'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Ballot } from '@/lib/types';

type TabStatus = 'submitted' | 'verified' | 'rejected' | 'all';

const TAB_LABELS: Record<TabStatus, string> = {
  submitted: 'รอรับเอกสาร',
  rejected: 'ไม่ผ่าน',
  verified: 'ผ่านแล้ว',
  all: 'ทั้งหมด',
};

const STATUS_BADGE: Record<string, string> = {
  submitted: 'bg-yellow-100 text-yellow-800',
  verified: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const CHOICE_LABEL: Record<string, string> = {
  juristic: '🏢 นิติบุคคล',
  municipality: '🏛️ เทศบาล',
  abstain: '⚪ งดออกเสียง',
  follow_majority: '🤝 ตามข้างมาก',
};

export default function ReviewPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabStatus>('submitted');
  const [ballots, setBallots] = useState<Ballot[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [docChecks, setDocChecks] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVoter, setEditVoter] = useState('');
  const [editProxy, setEditProxy] = useState('');
  const [editIsProxy, setEditIsProxy] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const q = search.trim().toLowerCase();
  const visibleBallots = q
    ? ballots.filter((b) =>
        [b.household?.house_no, b.household?.owner_name, b.voter_name, b.proxy_name]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
    : ballots;

  const startEdit = (ballot: Ballot) => {
    setEditingId(ballot.id);
    setEditVoter(ballot.voter_name);
    setEditProxy(ballot.proxy_name ?? '');
    setEditIsProxy(ballot.is_proxy);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditVoter('');
    setEditProxy('');
    setEditIsProxy(false);
  };

  const saveEdit = async (ballot: Ballot) => {
    if (!editVoter.trim()) { alert('กรุณากรอกชื่อผู้ลงมติ'); return; }
    if (editIsProxy && !editProxy.trim()) { alert('กรุณากรอกชื่อผู้รับมอบฉันทะ'); return; }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/ballots/${ballot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter_name: editVoter.trim(), is_proxy: editIsProxy, proxy_name: editProxy.trim() }),
      });
      const d = await res.json();
      if (!res.ok) { alert(d.error ?? 'เกิดข้อผิดพลาด'); return; }
      setBallots((prev) =>
        prev.map((x) =>
          x.id === ballot.id ? { ...x, voter_name: d.voter_name, is_proxy: d.is_proxy, proxy_name: d.proxy_name } : x
        )
      );
      cancelEdit();
    } finally {
      setSavingEdit(false);
    }
  };

  const handleVerifyOther = async (id: string) => {
    const reason = window.prompt('ระบุเหตุผล/วิธีการตรวจสอบเอกสาร (เช่น ยืนยันทางโทรศัพท์, ตรวจด้วยตนเอง)') ?? '';
    if (!reason.trim()) return;
    setActionLoading(id);
    await fetch(`/api/admin/ballots/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify_other', reason: reason.trim() }),
    });
    setActionLoading(null);
    fetchBallots();
  };

  const toggleDocCheck = (key: string) => {
    setDocChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const missingDocs = (ballot: Ballot) => {
    const m: string[] = [];
    if (ballot.is_proxy && !docChecks[`${ballot.id}-proxy`]) m.push('หนังสือมอบฉันทะ');
    const hasIdCard = !!docChecks[`${ballot.id}-idcard`];
    const hasChatProof = !!docChecks[`${ballot.id}-chat`];
    if (!hasIdCard && !hasChatProof) m.push('สำเนาบัตรประชาชนหรือหลักฐานทางแชท');
    return m;
  };

  const allDocsChecked = (ballot: Ballot) => missingDocs(ballot).length === 0;

  const openReject = (ballot: Ballot) => {
    const missing = missingDocs(ballot);
    setRejectReason(missing.length ? `เอกสารไม่ครบ ขาดเอกสาร: ${missing.join(', ')}` : '');
    setRejectModal({ id: ballot.id });
  };

  const fetchBallots = useCallback(async () => {
    setLoading(true);
    const url = tab === 'all' ? '/api/admin/ballots' : `/api/admin/ballots?status=${tab}`;
    const res = await fetch(url);
    if (res.status === 401) { router.push('/admin/login'); return; }
    const data = await res.json();
    setBallots(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [tab, router]);

  useEffect(() => { fetchBallots(); }, [fetchBallots]);

  const handleVerify = async (id: string) => {
    setActionLoading(id);
    await fetch(`/api/admin/ballots/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify' }),
    });
    setActionLoading(null);
    fetchBallots();
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setActionLoading(rejectModal.id);
    await fetch(`/api/admin/ballots/${rejectModal.id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', reason: rejectReason.trim() }),
    });
    setActionLoading(null);
    setRejectModal(null);
    setRejectReason('');
    fetchBallots();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gray-800 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="font-bold text-lg">⚙️ ระบบผู้ดูแล</Link>
          <div className="hidden sm:flex gap-4 text-sm">
            <Link href="/admin" className="hover:text-indigo-300">ภาพรวม</Link>
            <Link href="/admin/review" className="hover:text-indigo-300 font-medium text-indigo-300">ตรวจเอกสาร</Link>
            <Link href="/admin/results" className="hover:text-indigo-300">ผลโหวต</Link>
            <Link href="/admin/households" className="hover:text-indigo-300">จัดการบ้าน</Link>
          </div>
        </div>
        <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/admin/login'); }}
          className="text-sm text-gray-300 hover:text-white">ออกจากระบบ</button>
      </nav>

      <div className="p-6 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">ตรวจสอบเอกสาร</h2>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl shadow-sm p-1 mb-6 w-fit">
          {(Object.keys(TAB_LABELS) as TabStatus[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
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

        {loading ? (
          <p className="text-gray-500">กำลังโหลด...</p>
        ) : visibleBallots.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center text-gray-400 shadow-sm">
            {search ? `ไม่พบรายการที่ตรงกับ “${search}”` : 'ไม่มีรายการในสถานะนี้'}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleBallots.map((ballot) => (
              <div key={ballot.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpanded(expanded === ballot.id ? null : ballot.id)}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-semibold text-gray-800">
                        บ้านเลขที่ {ballot.household?.house_no ?? '—'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {ballot.voter_name}
                        {ballot.is_proxy && (
                          <span className="ml-2 text-amber-600">(แทน: {ballot.proxy_name})</span>
                        )}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[ballot.status]}`}>
                      {TAB_LABELS[ballot.status as TabStatus]}
                    </span>
                    <span className="text-sm text-gray-600">{CHOICE_LABEL[ballot.choice]}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                      {new Date(ballot.submitted_at).toLocaleDateString('th-TH', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded === ballot.id ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {expanded === ballot.id && (
                  <div className="border-t border-gray-100 p-4 space-y-4">
                    {/* Edit voter name */}
                    <div>
                      {editingId === ballot.id ? (
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">ชื่อผู้ลงมติ</label>
                            <input
                              type="text"
                              value={editVoter}
                              onChange={(e) => setEditVoter(e.target.value)}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800"
                            />
                          </div>
                          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editIsProxy}
                              onChange={(e) => setEditIsProxy(e.target.checked)}
                              className="w-4 h-4 text-indigo-600 rounded"
                            />
                            ลงมติแทน (มอบฉันทะ)
                          </label>
                          {editIsProxy && (
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
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEdit(ballot)}
                              disabled={savingEdit}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs rounded-lg"
                            >
                              {savingEdit ? 'กำลังบันทึก...' : 'บันทึกชื่อ'}
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
                        <button
                          onClick={() => startEdit(ballot)}
                          className="text-indigo-500 hover:text-indigo-700 text-xs underline"
                        >
                          ✏️ แก้ไขชื่อผู้ลงมติ / การมอบฉันทะ
                        </button>
                      )}
                    </div>

                    {/* Documents check */}
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">เอกสารแนบ (เจ้าหน้าที่ตรวจรับ)</p>
                      <div className="flex flex-col gap-2">
                        {ballot.is_proxy && (
                          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={ballot.status === 'verified' || !!docChecks[`${ballot.id}-proxy`]}
                              disabled={ballot.status === 'verified'}
                              onChange={() => toggleDocCheck(`${ballot.id}-proxy`)}
                              className="w-4 h-4 text-indigo-600 rounded"
                            />
                            หนังสือมอบฉันทะ
                          </label>
                        )}
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ballot.status === 'verified' || !!docChecks[`${ballot.id}-idcard`]}
                            disabled={ballot.status === 'verified'}
                            onChange={() => toggleDocCheck(`${ballot.id}-idcard`)}
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          สำเนาบัตรประชาชน
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ballot.status === 'verified' || !!docChecks[`${ballot.id}-chat`]}
                            disabled={ballot.status === 'verified'}
                            onChange={() => toggleDocCheck(`${ballot.id}-chat`)}
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          หลักฐานทางแชท
                        </label>
                      </div>
                    </div>

                    {/* Reject reason */}
                    {ballot.status === 'rejected' && ballot.reject_reason && (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
                        <span className="font-medium">เหตุผลที่ปฏิเสธ: </span>{ballot.reject_reason}
                      </div>
                    )}

                    {/* Verified by other means note */}
                    {ballot.status === 'verified' && ballot.verify_note && (
                      <div className="p-3 bg-teal-50 border border-teal-100 rounded-lg text-sm text-teal-700">
                        <span className="font-medium">ผ่านด้วยวิธีอื่น: </span>{ballot.verify_note}
                      </div>
                    )}

                    {/* Actions */}
                    {ballot.status === 'submitted' && (
                      <div className="space-y-2">
                        {!allDocsChecked(ballot) && (
                          <p className="text-xs text-amber-600">
                            ⚠️ ยังตรวจรับเอกสารไม่ครบ — หากเอกสารไม่ครบให้กดปฏิเสธ และเมื่อได้รับเอกสารครบค่อยกลับมายืนยัน
                          </p>
                        )}
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleVerify(ballot.id)}
                            disabled={actionLoading === ballot.id || !allDocsChecked(ballot)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            {actionLoading === ballot.id ? 'กำลังบันทึก...' : '✓ อนุมัติ'}
                          </button>
                          <button
                            onClick={() => openReject(ballot)}
                            disabled={actionLoading === ballot.id}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            ✕ ปฏิเสธ
                          </button>
                        </div>
                        <button
                          onClick={() => handleVerifyOther(ballot.id)}
                          disabled={actionLoading === ballot.id}
                          className="w-full px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          ✓ ผ่านการตรวจด้วยวิธีอื่น ๆ (ระบุเหตุผล)
                        </button>
                      </div>
                    )}

                    {/* Re-verify after rejection when documents complete */}
                    {ballot.status === 'rejected' && (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500">
                          เมื่อได้รับเอกสารครบแล้ว ให้ติ๊กเอกสารด้านบนแล้วกดยืนยันอีกครั้ง
                        </p>
                        <button
                          onClick={() => handleVerify(ballot.id)}
                          disabled={actionLoading === ballot.id || !allDocsChecked(ballot)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          {actionLoading === ballot.id ? 'กำลังบันทึก...' : '✓ ยืนยันอีกครั้ง'}
                        </button>
                      </div>
                    )}

                    {ballot.reviewed_by && (
                      <p className="text-xs text-gray-400">
                        ตรวจโดย {ballot.reviewed_by} เมื่อ{' '}
                        {new Date(ballot.reviewed_at!).toLocaleDateString('th-TH', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-800 mb-3">ระบุเหตุผลที่ปฏิเสธ</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="เช่น เอกสารไม่ชัดเจน, ไม่ตรงกับบ้านเลขที่"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 outline-none text-sm resize-none text-gray-800"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || !!actionLoading}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium rounded-lg text-sm transition-colors"
              >
                ยืนยันปฏิเสธ
              </button>
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-sm transition-colors"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
