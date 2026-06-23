# ระบบลงมติออนไลน์ - Village Vote System

ระบบลงมติออนไลน์สำหรับลูกบ้านเพื่อเลือกรูปแบบการบริหารหมู่บ้าน พร้อมระบบอัปโหลดเอกสารและการตรวจสอบโดยผู้ดูแล

---

## การตั้งค่าก่อนใช้งาน

### 1. สร้างโปรเจกต์ Supabase

1. ไปที่ [supabase.com](https://supabase.com) → สร้าง account → New Project
2. บันทึก **Project URL** และ **API Keys** ไว้

### 2. สร้างฐานข้อมูล

เปิด **SQL Editor** ใน Supabase แล้วรันไฟล์นี้ตามลำดับ:

```
supabase/schema.sql   ← สร้างตารางทั้งหมด
supabase/seed.sql     ← สร้าง admin user เริ่มต้น
```

### 3. สร้าง Storage Bucket

ใน Supabase → **Storage** → New Bucket:
- ชื่อ: `documents`
- Public: **ปิด** (Private)

### 4. ตั้งค่า Environment Variables

คัดลอก `.env.local.example` เป็น `.env.local` แล้วใส่ค่า:

```bash
cp .env.local.example .env.local
```

แก้ไข `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=your-random-secret-at-least-32-characters-long
```

### 5. รันระบบ Local

```bash
npm install
npm run dev
```

เปิด http://localhost:3000

---

## การ Deploy บน Vercel

### ขั้นตอน

1. Push โค้ดขึ้น GitHub
2. ไปที่ [vercel.com](https://vercel.com) → Import Repository
3. เพิ่ม Environment Variables ทั้ง 4 ตัวใน Vercel Project Settings
4. กด Deploy

---

## วิธีใช้งาน

### ผู้ดูแลระบบ (Admin)

1. เข้าที่ `/admin/login`
   - username: `admin`
   - password: `Admin@1234` (**เปลี่ยนทันทีหลังใช้ครั้งแรก**)

2. **จัดการบ้านเลขที่** (`/admin/households`)
   - นำเข้าข้อมูลบ้านเลขที่ด้วย JSON format:
   ```json
   [
     { "house_no": "1/1", "owner_name": "สมชาย ใจดี", "id_card_last4": "1234" },
     { "house_no": "1/2", "owner_name": "สมหญิง ดีใจ", "id_card_last4": "5678" }
   ]
   ```
   - Export CSV เพื่อแจกรหัสเชิญให้ลูกบ้าน

3. **ตรวจสอบเอกสาร** (`/admin/review`) — อนุมัติหรือปฏิเสธมติ

4. **ดูผลโหวต** (`/admin/results`) — ดูรายงานและพิมพ์ผล

### ลูกบ้าน

1. เข้าที่ `/login` กรอก:
   - บ้านเลขที่
   - รหัสเชิญ (รับจากผู้ดูแล)
   - เลขบัตรประชาชน 4 ตัวท้าย

2. เลือกมติ → กรอกชื่อ → แนบสำเนาทะเบียนบ้าน
3. ถ้าลงมติแทน ให้เปิด "ลงมติแทน" และแนบใบมอบฉันทะ

---

## โครงสร้างไฟล์

```
src/
├── app/
│   ├── login/          ← หน้าเข้าระบบลูกบ้าน
│   ├── vote/           ← หน้าลงมติและอัปโหลดเอกสาร
│   ├── admin/
│   │   ├── login/      ← หน้าเข้าระบบผู้ดูแล
│   │   ├── page.tsx    ← Dashboard
│   │   ├── review/     ← ตรวจสอบเอกสาร
│   │   ├── results/    ← ผลโหวต
│   │   └── households/ ← จัดการบ้านเลขที่
│   └── api/            ← Backend API routes
├── lib/
│   ├── session.ts      ← JWT session management
│   ├── types.ts        ← TypeScript types
│   └── supabase/       ← Supabase clients
└── middleware.ts       ← Route protection
supabase/
├── schema.sql          ← Database schema
└── seed.sql            ← Initial data
```

---

## Security Notes

- ไฟล์เอกสารเก็บใน Private Supabase Storage เข้าถึงได้เฉพาะผ่าน Signed URL (2 นาที)
- API ทุกตัวใช้ Service Role Key ที่รันเฉพาะ server-side
- Session JWT มีอายุ 24 ชั่วโมง (voter) / 8 ชั่วโมง (admin)
- RLS ปิดการเข้าถึงโดยตรงจาก anon key ทุก table
- Audit log บันทึกทุก action ของผู้ใช้และผู้ดูแล

---

## การเปลี่ยน Admin Password

รันใน Supabase SQL Editor:

```sql
-- ติดตั้ง pgcrypto ก่อน (รันครั้งเดียว)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- เปลี่ยนรหัสผ่าน (แทนที่ 'NewPassword@123' ด้วยรหัสใหม่)
UPDATE admin_users
SET password_hash = crypt('NewPassword@123', gen_salt('bf', 12))
WHERE username = 'admin';
```

หรือสร้าง hash ด้วย Node.js:
```js
const bcrypt = require('bcryptjs');
console.log(await bcrypt.hash('YourNewPassword', 12));
```
แล้ว UPDATE โดยตรงใน Supabase Table Editor
