import { NextRequest, NextResponse } from 'next/server';
import { getVoterSession } from '@/lib/session';

type RatesRequestBody = {
  origin_postcode?: string;
  destination_postcode?: string;
  weight?: number;
  parcel_type?: string;
};

export async function POST(request: NextRequest) {
  const session = await getVoterSession();
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const token = process.env.ISHIP_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า ISHIP_API_TOKEN ในระบบ' }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as RatesRequestBody;
  const originPostcode = body.origin_postcode?.trim() || process.env.ISHIP_RATES_ORIGIN_POSTCODE || '10110';
  const destinationPostcode =
    body.destination_postcode?.trim() || process.env.ISHIP_RATES_DESTINATION_POSTCODE || '50230';
  const weight = typeof body.weight === 'number' && body.weight > 0 ? body.weight : 0.3;
  const parcelType = (body.parcel_type?.trim() || process.env.ISHIP_RATES_PARCEL_TYPE || 'box').toLowerCase();

  const endpoint = process.env.ISHIP_RATES_URL ?? 'https://api.iship.in.th/v1/rates';
  const payload = {
    origin_postcode: originPostcode,
    destination_postcode: destinationPostcode,
    weight,
    parcel_type: parcelType,
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const data = (await response.json().catch(() => ({}))) as {
      message?: string;
      error?: string;
      rates?: Array<{
        service_code?: string;
        name?: string;
        price?: number;
        days?: string;
      }>;
    };

    if (!response.ok) {
      const message = data.message || data.error || 'iShip ไม่สามารถคำนวณค่าจัดส่งได้';
      return NextResponse.json({ error: message }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      rates: Array.isArray(data.rates) ? data.rates : [],
      request_payload: payload,
      raw: data,
    });
  } catch {
    return NextResponse.json(
      { error: 'เชื่อมต่อ iShip ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' },
      { status: 502 }
    );
  }
}
