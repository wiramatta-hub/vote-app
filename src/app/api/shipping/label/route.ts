import { NextRequest, NextResponse } from 'next/server';
import { getVoterSession } from '@/lib/session';

const VOLUNTEER_RECEIVER = {
  name: 'คุณอัญชลี อุดร',
  phone: '0948243082',
  address_line1: 'บ้านเลขที่ 900/401 ซอย 8 หมู่ 9 หมู่บ้านดีญ่า วาเลย์ (หางดง)',
  sub_district: 'หางดง',
  district: 'หางดง',
  province: 'เชียงใหม่',
  postal_code: '50230',
};

function extractPrintUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;

  const direct = [p.print_url, p.label_url, p.url]
    .find((v) => typeof v === 'string' && v.length > 0);
  if (typeof direct === 'string') return direct;

  const data = (p.data && typeof p.data === 'object') ? (p.data as Record<string, unknown>) : null;
  const nested = data ? [data.print_url, data.label_url, data.url]
    .find((v) => typeof v === 'string' && v.length > 0) : null;

  return typeof nested === 'string' ? nested : null;
}

export async function POST(req: NextRequest) {
  const session = await getVoterSession();
  if (!session) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
  }

  const body = (await req.json()) as { sender_name?: string; house_no?: string | null };
  const senderName = body.sender_name?.trim();
  if (!senderName) {
    return NextResponse.json({ error: 'กรุณาระบุชื่อผู้ส่ง' }, { status: 400 });
  }

  const endpoint = process.env.ISHIP_CREATE_LABEL_URL;
  if (!endpoint) {
    return NextResponse.json(
      { error: 'ยังไม่ได้ตั้งค่า ISHIP_CREATE_LABEL_URL ในระบบ' },
      { status: 500 }
    );
  }

  const token = process.env.ISHIP_API_TOKEN;
  const apiKey = process.env.ISHIP_API_KEY;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (apiKey) headers['x-api-key'] = apiKey;

  const payload = {
    sender: {
      name: senderName,
      house_no: body.house_no ?? session.houseNo ?? null,
    },
    receiver: VOLUNTEER_RECEIVER,
    reference: {
      source: 'vote-app',
      house_no: body.house_no ?? session.houseNo,
      sender_name: senderName,
    },
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        (data as { message?: string; error?: string }).message ||
        (data as { message?: string; error?: string }).error ||
        'iShip ไม่สามารถสร้างใบปะหน้าได้';
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const printUrl = extractPrintUrl(data);
    if (!printUrl) {
      return NextResponse.json(
        { error: 'iShip ตอบกลับสำเร็จ แต่ไม่พบลิงก์ใบปะหน้า' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, print_url: printUrl });
  } catch {
    return NextResponse.json(
      { error: 'เชื่อมต่อ iShip ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' },
      { status: 502 }
    );
  }
}
