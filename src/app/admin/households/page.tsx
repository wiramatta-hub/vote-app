'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Household } from '@/lib/types';

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  verified: { label: 'โหวตแล้ว ✓', class: 'bg-green-100 text-green-800' },
  submitted: { label: 'รอตรวจ', class: 'bg-yellow-100 text-yellow-800' },
  rejected: { label: 'ไม่ผ่าน', class: 'bg-red-100 text-red-800' },
  none: { label: 'ยังไม่โหวต', class: 'bg-gray-100 text-gray-600' },
};

function getVoteStatus(h: Household): string {
  if (!h.ballots || h.ballots.length === 0) return 'none';
  if (h.ballots.some((b) => b.status === 'verified')) return 'verified';
  if (h.ballots.some((b) => b.status === 'submitted')) return 'submitted';
  if (h.ballots.some((b) => b.status === 'rejected')) return 'rejected';
  return 'none';
}

export default function HouseholdsPage() {
  const router = useRouter();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [editing, setEditing] = useState<Household | null>(null);
  const [editForm, setEditForm] = useState({ house_no: '', owner_name: '', id_card_last4: '', is_active: true });
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const fetchHouseholds = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/households');
    if (res.status === 401) { router.push('/admin/login'); return; }
    const data = await res.json();
    setHouseholds(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchHouseholds(); }, [fetchHouseholds]);

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

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  const openEdit = (h: Household) => {
    setEditError('');
    setEditing(h);
    setEditForm({
      house_no: h.house_no,
      owner_name: h.owner_name,
      id_card_last4: h.id_card_last4,
      is_active: h.is_active,
    });
  };

  const handleEditSave = async () => {
    if (!editing) return;
    setEditError('');
    if (!editForm.house_no.trim() || !editForm.owner_name.trim() || !editForm.id_card_last4.trim()) {
      setEditError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    if (!/^\d{4}$/.test(editForm.id_card_last4.trim())) {
      setEditError('เลขบัตรประชาชน 4 ตัวท้ายต้องเป็นตัวเลข 4 หลัก');
      return;
    }
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/households/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
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

  const exportCSV = () => {
    const rows = [['บ้านเลขที่', 'ชื่อเจ้าบ้าน', 'รหัสเชิญ', 'สถานะ']];
    households.forEach((h) => {
      rows.push([h.house_no, h.owner_name, h.invite_code, getVoteStatus(h)]);
    });
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invite_codes.csv';
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
              onClick={() => setShowImport(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
            >
              + นำเข้าข้อมูล
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'ทั้งหมด', value: stats.total, color: 'text-gray-800' },
            { label: 'โหวตแล้ว', value: stats.voted, color: 'text-green-700' },
            { label: 'รอตรวจ', value: stats.pending, color: 'text-yellow-700' },
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
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold">รหัสเชิญ</th>
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
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded tracking-widest">
                              {h.invite_code}
                            </code>
                            <button
                              onClick={() => copyCode(h.invite_code)}
                              className="text-gray-400 hover:text-gray-600 text-xs"
                              title="คัดลอก"
                            >
                              {copied === h.invite_code ? '✓' : '📋'}
                            </button>
                          </div>
                        </td>
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
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
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
              รหัสเชิญ: <code className="font-mono text-indigo-700">{editing.invite_code}</code>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เลขบัตรประชาชน 4 ตัวท้าย <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={editForm.id_card_last4}
                  onChange={(e) => setEditForm({ ...editForm, id_card_last4: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-800 font-mono tracking-widest"
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
                onClick={() => { setEditing(null); setEditError(''); }}
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
              {`[\n  { "house_no": "1/1", "owner_name": "สมชาย ใจดี", "id_card_last4": "1234" },\n  { "house_no": "1/2", "owner_name": "สมหญิง ดีใจ", "id_card_last4": "5678" }\n]`}
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
