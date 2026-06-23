import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getVoterSession } from '@/lib/session';
import { uploadFile } from '@/lib/storage';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  const session = await getVoterSession();
  if (!session) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
  }

  const formData = await req.formData();
  const choice = formData.get('choice') as string;
  const voterName = (formData.get('voter_name') as string)?.trim();
  const isProxy = formData.get('is_proxy') === 'true';
  const proxyName = (formData.get('proxy_name') as string)?.trim() || null;
  const houseRegistration = formData.get('house_registration') as File | null;
  const proxyLetter = formData.get('proxy_letter') as File | null;

  if (!choice || !voterName || !houseRegistration) {
    return NextResponse.json(
      { error: 'กรุณากรอกข้อมูลและแนบสำเนาบัตรประชาชน (ขีดคร่อมบัตร) ให้ครบถ้วน' },
      { status: 400 }
    );
  }

  if (!['juristic', 'municipality'].includes(choice)) {
    return NextResponse.json({ error: 'ตัวเลือกไม่ถูกต้อง' }, { status: 400 });
  }

  if (isProxy && !proxyLetter) {
    return NextResponse.json(
      { error: 'กรณีมอบฉันทะต้องแนบใบมอบฉันทะ' },
      { status: 400 }
    );
  }

  const filesToCheck = [houseRegistration, ...(proxyLetter ? [proxyLetter] : [])];
  for (const file of filesToCheck) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'รองรับเฉพาะไฟล์ JPG, PNG, WebP และ PDF เท่านั้น' },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: 'ขนาดไฟล์ต้องไม่เกิน 5MB ต่อไฟล์' },
        { status: 400 }
      );
    }
  }

  // Prevent double voting
  const existing = await sql`
    SELECT id FROM ballots
    WHERE household_id = ${session.householdId}
      AND status IN ('submitted', 'verified')
    LIMIT 1
  `;
  if (existing[0]) {
    return NextResponse.json(
      { error: 'บ้านเลขที่นี้ได้ส่งมติแล้ว ไม่สามารถส่งซ้ำได้' },
      { status: 409 }
    );
  }

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip');

  const ballots = await sql`
    INSERT INTO ballots (household_id, voter_name, is_proxy, proxy_name, choice, status, ip_address)
    VALUES (
      ${session.householdId}, ${voterName}, ${isProxy},
      ${isProxy ? proxyName : null}, ${choice}, 'submitted', ${ip}
    )
    RETURNING id
  `;
  const ballot = ballots[0];

  if (!ballot) {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง' }, { status: 500 });
  }

  const storeFile = async (file: File, docType: string) => {
    const ext = file.name.split('.').pop() ?? 'bin';
    const path = `ballots/${ballot.id}/${docType}.${ext}`;
    const buffer = await file.arrayBuffer();
    await uploadFile(path, buffer, file.type);
    await sql`
      INSERT INTO documents (ballot_id, doc_type, file_path, file_name)
      VALUES (${ballot.id}, ${docType}, ${path}, ${file.name})
    `;
  };

  try {
    await storeFile(houseRegistration, 'id_card_owner');
    if (isProxy && proxyLetter) {
      await storeFile(proxyLetter, 'proxy_letter');
    }
  } catch {
    // Rollback ballot if upload fails
    await sql`DELETE FROM documents WHERE ballot_id = ${ballot.id}`;
    await sql`DELETE FROM ballots WHERE id = ${ballot.id}`;
    return NextResponse.json(
      { error: 'อัปโหลดเอกสารไม่สำเร็จ กรุณาตรวจสอบขนาดและประเภทไฟล์แล้วลองอีกครั้ง' },
      { status: 500 }
    );
  }

  await sql`
    INSERT INTO audit_logs (actor, action, target_id, metadata, ip_address)
    VALUES (
      ${session.houseNo}, 'vote_submitted', ${ballot.id},
      ${JSON.stringify({ choice, is_proxy: isProxy })}, ${ip}
    )
  `;

  return NextResponse.json({ success: true, ballotId: ballot.id });
}
