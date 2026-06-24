'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function SuccessContent() {
  const params = useSearchParams();
  const status = params.get('status');

  const isAlreadyVerified = status === 'already_verified';
  const isAlreadySubmitted = status === 'already_submitted';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${
            isAlreadyVerified ? 'bg-green-100' : 'bg-indigo-100'
          }`}>
            {isAlreadyVerified ? (
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            )}
          </div>

          {isAlreadyVerified ? (
            <>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">ลงมติเรียบร้อยแล้ว</h2>
              <p className="text-gray-500">บ้านเลขที่ของท่านได้รับการยืนยันมติแล้ว ขอบคุณที่ร่วมลงมติ</p>
            </>
          ) : isAlreadySubmitted ? (
            <>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">อยู่ระหว่างรอตรวจสอบ</h2>
              <p className="text-gray-500">ท่านได้ส่งมติแล้ว กำลังรอเจ้าหน้าที่ตรวจสอบเอกสาร</p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">ลงมติสำเร็จ!</h2>
              <p className="text-gray-500">ระบบได้รับมติท่านแล้ว กำลังรอเอกสารของท่าน</p>
            </>
          )}

          <div className="mt-6 p-4 bg-gray-50 rounded-xl text-sm text-gray-600 text-left space-y-2">
            <div className="flex gap-2">
              <span>1.</span>
              <span>เจ้าหน้าที่จะตรวจสอบเอกสารของท่าน</span>
            </div>
            <div className="flex gap-2">
              <span>2.</span>
              <span>มติจะถูกนับเมื่อเอกสารผ่านการตรวจสอบ</span>
            </div>
            <div className="flex gap-2">
              <span>3.</span>
              <span>ผลการลงมติจะประกาศเมื่อปิดรับมติ</span>
            </div>
          </div>

          <Link
            href="/admin/results"
            className="mt-6 inline-block w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors text-sm"
          >
            ดูผลโหวตปัจจุบัน
          </Link>

          <Link
            href="/login"
            className="mt-3 inline-block w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors text-sm"
          >
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
