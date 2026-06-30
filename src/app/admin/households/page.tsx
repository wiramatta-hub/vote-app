'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Household } from '@/lib/types';

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  verified: { label: 'โหวตแล้ว ✓', class: 'bg-green-100 text-green-800' },
  offline: { label: 'โหวตแล้ว (ออฟไลน์)', class: 'bg-blue-100 text-blue-800' },
  submitted: { label: 'รอตรวจเอกสาร', class: 'bg-yellow-100 text-yellow-800' },
  rejected: { label: 'ไม่ผ่าน', class: 'bg-red-100 text-red-800' },
  none: { label: 'ยังไม่โหวต', class: 'bg-gray-100 text-gray-600' },
};

const CHOICE_OPTIONS: { value: string; label: string }[] = [
  { value: 'juristic', label: 'จัดตั้งนิติบุคคลหมู่บ้าน' },
  { value: 'municipality', label: 'ให้เทศบาลรับภารกิจดูแล' },
  { value: 'follow_majority', label: 'ออกเสียงตามข้างมาก' },
  { value: 'abstain', label: 'งดออกเสียง' },
];

function getVoteStatus(h: Household): string {
  if (!h.ballots || h.ballots.length === 0) return 'none';
  if (h.ballots.some((b) => b.is_offline)) return 'offline';
  if (h.ballots.some((b) => b.status === 'verified')) return 'verified';
  if (h.ballots.some((b) => b.status === 'submitted')) return 'submitted';
  if (h.ballots.some((b) => b.status === 'rejected')) return 'rejected';
  return 'none';
}

function splitHouseNo(houseNo: string): number[] {
  return houseNo
    .split('/')
    .map((part) => Number(part))
    .filter((part) => Number.isFinite(part));
}

function compareHouseNo(a: string, b: string): number {
  const aParts = splitHouseNo(a);
  const bParts = splitHouseNo(b);
  const len = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < len; i++) {
    const av = aParts[i] ?? 0;
    const bv = bParts[i] ?? 0;
    if (av !== bv) return av - bv;
  }

  return a.localeCompare(b, 'th', { numeric: true });
}

export default function HouseholdsPage() {
  const router = useRouter();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingOpen, setVotingOpen] = useState<boolean>(false);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ house_no: '', owner_name: '' });
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Household | null>(null);
  const [editForm, setEditForm] = useState({ house_no: '', owner_name: '', is_active: true, voteStatus: 'none', voteChoice: '' });
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchHouseholds = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/households');
    if (res.status === 401) { router.push('/admin/login'); return; }
    const data = await res.json();
    const rows = Array.isArray(data) ? data : [];
    rows.sort((a, b) => compareHouseNo(a.house_no, b.house_no));
    setHouseholds(rows);
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchHouseholds(); }, [fetchHouseholds]);

  useEffect(() => {
    fetch('/api/admin/results')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setVotingOpen(Boolean(d.votingOpen)); })
      .catch(() => {});
  }, []);

  const handleImport = async () => {
    setImportError('');
    let parsed;
    try {
      parsed = JSON.parse(importJson);
    } catch {
      setImportError('รูปแบบ JSON ไม่ถูกต้อง');
      return;
    }
    if (!Array.isArray(parsed)) {
      setImportError('ต้องเป็น JSON array [ {...}, {...} ]');
      return;
    }

    setImportLoading(true);
    try {
      const res = await fetch('/api/admin/households', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ households: parsed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error ?? 'เกิดข้อผิดพลาด');
        return;
      }
      setShowImport(false);
      setImportJson('');
      fetchHouseholds();
    } catch {
      setImportError('ไม่สามารถเชื่อมต่อได้');
    } finally {
      setImportLoading(false);
    }
  };

  const openEdit = (h: Household) => {
    setEditError('');
    setConfirmDelete(false);
    setEditing(h);
    const derived = getVoteStatus(h);
    const status = derived === 'verified' ? 'voted' : derived === 'submitted' ? 'pending' : derived === 'offline' ? 'offline' : 'none';
    const existingChoice = h.ballots?.find((b) => b.choice)?.choice ?? '';
    setEditForm({
      house_no: h.house_no,
      owner_name: h.owner_name,
      is_active: h.is_active,
      voteStatus: status,
      voteChoice: existingChoice,
    });
  };

  const handleCreate = async () => {
    setCreateError('');
    if (!createForm.house_no.trim() || !createForm.owner_name.trim()) {
      setCreateError('กรุณากรอกบ้านเลขที่และชื่อเจ้าบ้าน');
      return;
    }
    setCreateLoading(true);
    try {
      const res = await fetch('/api/admin/households', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ households: [{ house_no: createForm.house_no.trim(), owner_name: createForm.owner_name.trim() }] }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? 'เกิดข้อผิดพลาด');
        return;
      }
      setShowCreate(false);
      setCreateForm({ house_no: '', owner_name: '' });
      fetchHouseholds();
    } catch {
      setCreateError('ไม่สามารถเชื่อมต่อได้');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!editing) return;
    setEditError('');
    if (!editForm.house_no.trim() || !editForm.owner_name.trim()) {
      setEditError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    if (editForm.voteStatus !== 'none' && !editForm.voteChoice) {
      setEditError('กรุณาเลือกตัวเลือกการลงมติ');
      return;
    }
    setEditLoading(true);
    try {
      const derived = getVoteStatus(editing);
      const origStatus = derived === 'verified' ? 'voted' : derived === 'submitted' ? 'pending' : derived === 'offline' ? 'offline' : 'none';
      const origChoice = editing.ballots?.find((b) => b.choice)?.choice ?? '';
      const statusChanged = editForm.voteStatus !== origStatus || editForm.voteChoice !== origChoice;

      const payload: Record<string, unknown> = {
        house_no: editForm.house_no,
        owner_name: editForm.owner_name,
        is_active: editForm.is_active,
      };
      if (statusChanged) {
        payload.voteStatus = editForm.voteStatus;
        payload.voteChoice = editForm.voteChoice;
      }

      const res = await fetch(`/api/admin/households/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error ?? 'เกิดข้อผิดพลาด');
        return;
      }
      setEditing(null);
      fetchHouseholds();
    } catch {
      setEditError('ไม่สามารถเชื่อมต่อได้');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    setEditError('');
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/households/${editing.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error ?? 'เกิดข้อผิดพลาด');
        return;
      }
      setEditing(null);
      setConfirmDelete(false);
      fetchHouseholds();
    } catch {
      setEditError('ไม่สามารถเชื่อมต่อได้');
    } finally {
      setDeleteLoading(false);
    }
  };

  const exportCSV = () => {
    const rows = [['บ้านเลขที่', 'ชื่อเจ้าบ้าน', 'สถานะ']];
    households.forEach((h) => {
      rows.push([h.house_no, h.owner_name, getVoteStatus(h)]);
    });
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'households.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = households.filter(
    (h) =>
      h.house_no.toLowerCase().includes(search.toLowerCase()) ||
      h.owner_name.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: households.length,
    voted: households.filter((h) => getVoteStatus(h) === 'verified').length,
    offline: households.filter((h) => getVoteStatus(h) === 'offline').length,
    pending: households.filter((h) => getVoteStatus(h) === 'submitted').length,
    notVoted: households.filter((h) => getVoteStatus(h) === 'none').length,
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gray-800 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="font-bold text-lg">⚙️ ระบบผู้ดูแล</Link>
          <div className="hidden sm:flex gap-4 text-sm">
            <Link href="/admin" className="hover:text-indigo-300">ภาพรวม</Link>
            <Link href="/admin/review" className="hover:text-indigo-300">ตรวจเอกสาร</Link>
            <Link href="/admin/results" className="hover:text-indigo-300">ผลโหวต</Link>
            <Link href="/admin/households" className="hover:text-indigo-300 font-medium text-indigo-300">จัดการบ้าน</Link>
          </div>
        </div>
        <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/admin/login'); }}
          className="text-sm text-gray-300 hover:text-white">ออกจากระบบ</button>
      </nav>

      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">จัดการบ้านเลขที่</h2>
          <div className="flex gap-2">
            <button
              onClick={exportCSV}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              📥 Export CSV
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
            >
              + สร้างบ้านใหม่
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
            >
              + นำเข้าข้อมูล
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'ทั้งหมด', value: stats.total, color: 'text-gray-800' },
            { label: 'โหวตแล้ว', value: stats.voted, color: 'text-green-700' },
            { label: 'ออฟไลน์', value: stats.offline, color: 'text-blue-700' },
            { label: 'รอตรวจเอกสาร', value: stats.pending, color: 'text-yellow-700' },
            { label: 'ยังไม่โหวต', value: stats.notVoted, color: 'text-gray-500' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl shadow-sm p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="ค้นหาบ้านเลขที่ หรือชื่อเจ้าบ้าน..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-800"
          />
        </div>

        {loading ? (
          <p className="text-gray-500">กำลังโหลด...</p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold">บ้านเลขที่</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold">ชื่อเจ้าบ้าน</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold">สถานะ</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-semibold">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((h) => {
                    const vstatus = getVoteStatus(h);
                    const badge = STATUS_MAP[vstatus];
                    return (
                      <tr key={h.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono font-medium text-gray-800">{h.house_no}</td>
                        <td className="px-4 py-3 text-gray-700">{h.owner_name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.class}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => openEdit(h)}
                            className="px-3 py-1 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                          >
                            ✏️ แก้ไข
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                        {search ? 'ไม่พบรายการที่ค้นหา' : 'ยังไม่มีข้อมูลบ้านเลขที่'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-gray-800 mb-1">แก้ไขข้อมูลลูกบ้าน</h3>
            <p className="text-sm text-gray-500 mb-4">
              บ้านเลขที่ <code className="font-mono text-indigo-700">{editing.house_no}</code>
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">บ้านเลขที่ <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editForm.house_no}
                  onChange={(e) => setEditForm({ ...editForm, house_no: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อเจ้าบ้าน <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editForm.owner_name}
                  onChange={(e) => setEditForm({ ...editForm, owner_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-800"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm text-gray-700">เปิดใช้งาน (อนุญาตให้เข้าสู่ระบบและลงมติ)</span>
              </label>

              <div className="border-t border-gray-100 pt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">สถานะการโหวต</label>
                {(() => {
                  const hasOnlineBallot = editing?.ballots?.some((b) => !b.is_offline) ?? false;
                  const manualLocked = votingOpen || hasOnlineBallot;
                  if (manualLocked) {
                    return (
                      <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-3 text-sm">
                        {votingOpen ? (
                          <p className="text-gray-600">⏳ ลงมติด้วยมือได้หลังปิดการลงมติออนไลน์เท่านั้น</p>
                        ) : (
                          <p className="text-gray-600">🔒 บ้านนี้ลงมติออนไลน์แล้ว ไม่สามารถแก้ไขด้วยมือ</p>
                        )}
                      </div>
                    );
                  }
                  return (
                    <>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'none', label: 'ยังไม่โหวต' },
                    { value: 'voted', label: 'โหวตแล้ว' },
                    { value: 'offline', label: 'โหวตแล้ว (ออฟไลน์)' },
                    { value: 'pending', label: 'รอตรวจเอกสาร' },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                        editForm.voteStatus === opt.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="voteStatus"
                        checked={editForm.voteStatus === opt.value}
                        onChange={() => setEditForm({ ...editForm, voteStatus: opt.value })}
                        className="w-4 h-4 text-indigo-600"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
                {editForm.voteStatus !== 'none' && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">ตัวเลือกที่ลงมติ <span className="text-red-500">*</span></label>
                    <select
                      value={editForm.voteChoice}
                      onChange={(e) => setEditForm({ ...editForm, voteChoice: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-800"
                    >
                      <option value="">— เลือกตัวเลือก —</option>
                      {CHOICE_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      {editForm.voteStatus === 'pending'
                        ? 'บันทึกเป็นมติที่รอตรวจเอกสาร (ยังไม่นับ)'
                        : editForm.voteStatus === 'offline'
                        ? 'บันทึกเป็นมติออฟไลน์ (นับแยกหมวดออฟไลน์)'
                        : 'บันทึกเป็นมติที่ผ่านการตรวจแล้ว (นับในผลทางการ)'}
                    </p>
                  </div>
                )}
                <p className="text-xs text-amber-600 mt-2">
                  ⚠️ การเปลี่ยนสถานะจะแทนที่มติเดิมของบ้านนี้ทั้งหมด
                </p>
                    </>
                  );
                })()}
              </div>
            </div>
            {editError && <p className="text-red-600 text-sm mt-3">{editError}</p>}
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleEditSave}
                disabled={editLoading}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium rounded-lg text-sm transition-colors"
              >
                {editLoading ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
              <button
                onClick={() => { setEditing(null); setEditError(''); setConfirmDelete(false); }}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-sm transition-colors"
              >
                ยกเลิก
              </button>
            </div>

            {/* Delete section */}
            <div className="mt-5 pt-4 border-t border-gray-100">
              {!confirmDelete ? (
                <button
                  onClick={() => { setConfirmDelete(true); setEditError(''); }}
                  className="w-full py-2.5 bg-white border border-red-200 text-red-600 font-medium rounded-lg text-sm hover:bg-red-50 transition-colors"
                >
                  🗑️ ลบบ้านเลขที่นี้
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-red-700">
                    ยืนยันการลบบ้านเลขที่ <span className="font-mono font-semibold">{editing.house_no}</span>?
                    การลบจะลบมติและประวัติทั้งหมดของบ้านนี้ และไม่สามารถย้อนคืนได้
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDelete}
                      disabled={deleteLoading}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium rounded-lg text-sm transition-colors"
                    >
                      {deleteLoading ? 'กำลังลบ...' : 'ยืนยันลบถาวร'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleteLoading}
                      className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-sm transition-colors"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-gray-800 mb-1">สร้างบ้านเลขที่ใหม่</h3>
            <p className="text-sm text-gray-500 mb-4">เพิ่มบ้านทีละหลัง ระบบจะสร้างรหัสเชิญให้อัตโนมัติ</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">บ้านเลขที่ <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={createForm.house_no}
                  onChange={(e) => setCreateForm({ ...createForm, house_no: e.target.value })}
                  placeholder="เช่น 99/123"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อเจ้าบ้าน <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={createForm.owner_name}
                  onChange={(e) => setCreateForm({ ...createForm, owner_name: e.target.value })}
                  placeholder="เช่น สมชาย ใจดี"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-800"
                />
              </div>
            </div>
            {createError && <p className="text-red-600 text-sm mt-3">{createError}</p>}
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleCreate}
                disabled={createLoading || !createForm.house_no.trim() || !createForm.owner_name.trim()}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium rounded-lg text-sm transition-colors"
              >
                {createLoading ? 'กำลังสร้าง...' : 'สร้างบ้าน'}
              </button>
              <button
                onClick={() => { setShowCreate(false); setCreateError(''); setCreateForm({ house_no: '', owner_name: '' }); }}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-sm transition-colors"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg">
            <h3 className="font-bold text-gray-800 mb-1">นำเข้าข้อมูลบ้านเลขที่</h3>
            <p className="text-sm text-gray-500 mb-4">
              วาง JSON array ในรูปแบบด้านล่าง ระบบจะสร้างรหัสเชิญให้อัตโนมัติ
            </p>
            <div className="mb-3 p-3 bg-gray-50 rounded-lg text-xs font-mono text-gray-600">
              {`[\n  { "house_no": "1/1", "owner_name": "สมชาย ใจดี" },\n  { "house_no": "1/2", "owner_name": "สมหญิง ดีใจ" }\n]`}
            </div>
            <textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              rows={8}
              placeholder="วาง JSON ที่นี่..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none font-mono text-gray-800"
            />
            {importError && (
              <p className="text-red-600 text-sm mt-2">{importError}</p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleImport}
                disabled={importLoading || !importJson.trim()}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium rounded-lg text-sm transition-colors"
              >
                {importLoading ? 'กำลังนำเข้า...' : 'นำเข้า'}
              </button>
              <button
                onClick={() => { setShowImport(false); setImportError(''); setImportJson(''); }}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-sm transition-colors"
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
