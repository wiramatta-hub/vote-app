import { NextRequest, NextResponse } from 'next/server';
import { getVoterSession } from '@/lib/session';

const VOLUNTEER_RECEIVER = {
  name: 'คุณอัญชลี อุดร',
  phone: '0948243082',
  address: 'บ้านเลขที่ 900/401 ซอย 8 หมู่ 9 หมู่บ้านดีญ่า วาเลย์ (หางดง)',
  district: 'หางดง',
  province: 'เชียงใหม่',
  postcode: '50230',
};

const SHIPPER_DEFAULT = {
  phone: process.env.ISHIP_SHIPPER_PHONE ?? '0000000000',
  district: process.env.ISHIP_SHIPPER_DISTRICT ?? 'หางดง',
  province: process.env.ISHIP_SHIPPER_PROVINCE ?? 'เชียงใหม่',
  postcode: process.env.ISHIP_SHIPPER_POSTCODE ?? '50230',
};

function findUrlDeep(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value)) return value;
    return null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findUrlDeep(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const [, v] of Object.entries(obj)) {
      const found = findUrlDeep(v);
      if (found) return found;
    }
  }
  return null;
}

function extractPrintUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;

  const directCandidates = [
    p.label_url,
    p.print_url,
    p.url,
    p.pdf_url,
    p.awb_url,
  ];

  for (const c of directCandidates) {
    if (typeof c === 'string' && c.length > 0) return c;
  }

  const data = (p.data && typeof p.data === 'object') ? (p.data as Record<string, unknown>) : null;
  if (data) {
    const nestedCandidates = [
      data.label_url,
      data.print_url,
      data.url,
      data.pdf_url,
      data.awb_url,
    ];
    for (const c of nestedCandidates) {
      if (typeof c === 'string' && c.length > 0) return c;
    }
  }

  return findUrlDeep(payload);
}

function buildFallbackLabelUrl(orderId: string | undefined): string | null {
  if (!orderId || orderId.trim().length === 0) return null;
  return `https://api.iship.in.th/labels/${encodeURIComponent(orderId)}.pdf`;
}

function buildReferenceNo(houseNo: string | null, senderName: string): string {
  const base = (houseNo ?? senderName)
    .replace(/\s+/g, '')
    .replace(/[^0-9A-Za-zก-๙\/-]/g, '')
    .slice(0, 20);
  return `VOTE-${base}-${Date.now()}`;
}

function buildOrderPayload(senderName: string, houseNo: string | null) {
  return {
    reference_no: buildReferenceNo(houseNo, senderName),
    shipper: {
      name: senderName,
      phone: SHIPPER_DEFAULT.phone,
      address: houseNo ? `บ้านเลขที่ ${houseNo}` : 'ผู้ส่งเอกสารลงมติ',
      district: SHIPPER_DEFAULT.district,
      province: SHIPPER_DEFAULT.province,
      postcode: SHIPPER_DEFAULT.postcode,
    },
    consignee: {
      name: VOLUNTEER_RECEIVER.name,
      phone: VOLUNTEER_RECEIVER.phone,
      address: VOLUNTEER_RECEIVER.address,
  district: 'หางดง',
  province: 'เชียงใหม่',
      postcode: VOLUNTEER_RECEIVER.postcode,
    },
    parcel: {
      weight: Number(process.env.ISHIP_PARCEL_WEIGHT ?? '0.3'),
      width: Number(process.env.ISHIP_PARCEL_WIDTH ?? '24'),
      length: Number(process.env.ISHIP_PARCEL_LENGTH ?? '34'),
      height: Number(process.env.ISHIP_PARCEL_HEIGHT ?? '3'),
      declared_value: Number(process.env.ISHIP_DECLARED_VALUE ?? '0'),
    },
    service_code: process.env.ISHIP_SERVICE_CODE ?? 'EMS',
    cod_amount: Number(process.env.ISHIP_COD_AMOUNT ?? '0'),
  };
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

  const endpoint = process.env.ISHIP_CREATE_LABEL_URL ?? 'https://api.iship.in.th/v1/orders';
  if (!endpoint) {
    return NextResponse.json(
      { error: 'ยังไม่ได้ตั้งค่า ISHIP_CREATE_LABEL_URL ในระบบ' },
      { status: 500 }
    );
  }

  const token = process.env.ISHIP_API_TOKEN;
  const apiKey = process.env.ISHIP_API_KEY;

  if (!token && !apiKey) {
    return NextResponse.json(
      { error: 'ยังไม่ได้ตั้งค่า ISHIP_API_TOKEN หรือ ISHIP_API_KEY ในระบบ' },
      { status: 500 }
    );
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (apiKey) headers['x-api-key'] = apiKey;

  const houseNo = body.house_no ?? session.houseNo ?? null;
  const payload = buildOrderPayload(senderName, houseNo);

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

    if ((data as { success?: boolean }).success === false) {
      const message =
        (data as { message?: string; error?: string }).message ||
        (data as { message?: string; error?: string }).error ||
        'iShip ไม่สามารถสร้างใบปะหน้าได้';
      return NextResponse.json({ error: message, raw: data }, { status: 400 });
    }

    const orderId = (data as { order_id?: string }).order_id;
    const printUrl = extractPrintUrl(data) || buildFallbackLabelUrl(orderId);
    if (!printUrl) {
      return NextResponse.json(
        { error: 'iShip ตอบกลับสำเร็จ แต่ไม่พบลิงก์ใบปะหน้า', raw: data },
        { status: 502 }
      );
    }

    const summary = data as {
      order_id?: string;
      tracking_no?: string;
      reference_no?: string;
      service_code?: string;
      shipping_cost?: number;
      cod_fee?: number;
      total_cost?: number;
      status?: string;
      created_at?: string;
    };

    return NextResponse.json({
      success: true,
      print_url: printUrl,
      order_id: summary.order_id ?? null,
      tracking_no: summary.tracking_no ?? null,
      reference_no: summary.reference_no ?? null,
      service_code: summary.service_code ?? null,
      shipping_cost: summary.shipping_cost ?? null,
      cod_fee: summary.cod_fee ?? null,
      total_cost: summary.total_cost ?? null,
      status: summary.status ?? null,
      created_at: summary.created_at ?? null,
      raw: data,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown error';
    console.error('iShip create label failed:', detail);
    return NextResponse.json(
      { error: 'เชื่อมต่อ iShip ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', detail },
      { status: 502 }
    );
  }
}
