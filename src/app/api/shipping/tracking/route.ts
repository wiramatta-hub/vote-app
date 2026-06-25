import { NextRequest, NextResponse } from 'next/server';
import { getVoterSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  const session = await getVoterSession();
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const trackingNo = request.nextUrl.searchParams.get('tracking_no')?.trim();
  if (!trackingNo) {
    return NextResponse.json({ error: 'กรุณาระบุ tracking_no' }, { status: 400 });
  }

  const token = process.env.ISHIP_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า ISHIP_API_TOKEN ในระบบ' }, { status: 500 });
  }

  const endpointBase = process.env.ISHIP_TRACKING_URL_BASE ?? 'https://api.iship.in.th/v1/tracking';
  const endpoint = `${endpointBase.replace(/\/$/, '')}/${encodeURIComponent(trackingNo)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    const data = (await response.json().catch(() => ({}))) as {
      message?: string;
      error?: string;
      tracking_no?: string;
      status?: string;
      events?: Array<{
        datetime?: string;
        status?: string;
        description?: string;
        location?: string;
      }>;
    };

    if (!response.ok) {
      const message = data.message || data.error || 'iShip ไม่สามารถดึงสถานะพัสดุได้';
      return NextResponse.json({ error: message }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      tracking_no: data.tracking_no ?? trackingNo,
      status: data.status ?? null,
      events: Array.isArray(data.events) ? data.events : [],
      raw: data,
    });
  } catch {
    return NextResponse.json(
      { error: 'เชื่อมต่อ iShip ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' },
      { status: 502 }
    );
  }
}
