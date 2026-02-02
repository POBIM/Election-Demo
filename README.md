# ระบบเลือกตั้งไทย (Thai Election System)

ระบบสาธิตการเลือกตั้งออนไลน์ที่รองรับการลงคะแนนแบบบัญชีรายชื่อ, แบ่งเขต และประชามติ พร้อมระบบจัดการสำหรับเจ้าหน้าที่ตามสิทธิ์การเข้าถึง (RBAC)

## สารบัญ

- [การติดตั้ง](#การติดตั้ง)
- [การเริ่มต้นใช้งาน](#การเริ่มต้นใช้งาน)
- [สำหรับผู้ใช้สิทธิ์ (ผู้ลงคะแนน)](#สำหรับผู้ใช้สิทธิ์-ผู้ลงคะแนน)
- [สำหรับเจ้าหน้าที่](#สำหรับเจ้าหน้าที่)
- [ระบบสิทธิ์การเข้าถึง (RBAC)](#ระบบสิทธิ์การเข้าถึง-rbac)
- [API Reference](#api-reference)
- [โครงสร้างโปรเจค](#โครงสร้างโปรเจค)

---

## การติดตั้ง

### ความต้องการของระบบ
- Node.js 18+
- npm 9+

### ขั้นตอนการติดตั้ง

```bash
# 1. Clone หรือเข้าไปที่โฟลเดอร์โปรเจค
cd "/home/pobimgroup/Election Demo"

# 2. ติดตั้ง dependencies
npm install

# 3. สร้างฐานข้อมูลและ seed ข้อมูลตัวอย่าง
npm run db:seed

# 4. เริ่มต้นระบบ
npm run dev
```

### URL ที่ใช้งาน
| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |

---

## การเริ่มต้นใช้งาน

### คำสั่งที่ใช้บ่อย

```bash
# เริ่มต้นระบบ (Frontend + Backend)
npm run dev

# Seed ข้อมูลใหม่
npm run db:seed

# เปิด Prisma Studio (ดูฐานข้อมูล)
npm run db:studio

# Build สำหรับ Production
npm run build
```

### หากพบปัญหา Port ถูกใช้งานอยู่

```bash
# ปิด process ที่ใช้ port 3000 และ 3001
kill $(lsof -t -i:3000) 2>/dev/null
kill $(lsof -t -i:3001) 2>/dev/null

# ลบ lock file
rm -f frontend/.next/dev/lock

# เริ่มใหม่
npm run dev
```

---

## สำหรับผู้ใช้สิทธิ์ (ผู้ลงคะแนน)

### ขั้นตอนการลงคะแนน

1. **เข้าสู่ระบบ** - ไปที่ http://localhost:3000/vote
2. **ยืนยันตัวตน** - กรอกเลขบัตรประชาชน 13 หลัก (เช่น `1234567890123`)
3. **เลือกการเลือกตั้ง** - เลือกรายการที่เปิดให้ลงคะแนน
4. **ลงคะแนน**
   - บัตรบัญชีรายชื่อ: เลือก 1 พรรค
   - บัตรแบ่งเขต: เลือก 1 ผู้สมัครในเขตของท่าน
   - ประชามติ: เลือก เห็นชอบ/ไม่เห็นชอบ/งดออกเสียง
5. **ยืนยัน** - ตรวจสอบและยืนยันการลงคะแนน
6. **รับใบเสร็จ** - รับรหัสยืนยันการลงคะแนน

### ดูผลคะแนน
- เข้าที่ http://localhost:3000/results
- ดูผลคะแนนแบบ Real-time พร้อมกราฟ

---

## สำหรับเจ้าหน้าที่

### บัญชีทดสอบ

| บทบาท | อีเมล | รหัสผ่าน |
|-------|-------|----------|
| ผู้ดูแลระบบ (Super Admin) | admin@election.go.th | admin123 |
| ผู้ดูแลภาค (Regional Admin) | regional.bkk@election.go.th | regional123 |
| ผู้ดูแลจังหวัด (Province Admin) | province.bkk@election.go.th | province123 |
| เจ้าหน้าที่เขต (District Official) | district1.bkk@election.go.th | district123 |

### การเข้าสู่ระบบเจ้าหน้าที่

1. ไปที่ http://localhost:3000/login
2. กรอกอีเมลและรหัสผ่าน
3. ระบบจะนำไปยังหน้า Admin Dashboard

---

### การจัดการการเลือกตั้ง

#### สร้างการเลือกตั้งใหม่ (Super Admin เท่านั้น)

```bash
curl -X POST http://localhost:3001/elections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "name": "General Election 2028",
    "nameTh": "การเลือกตั้งทั่วไป พ.ศ. 2571",
    "description": "การเลือกตั้งสมาชิกสภาผู้แทนราษฎร",
    "startDate": "2028-05-01",
    "endDate": "2028-05-01",
    "hasPartyList": true,
    "hasConstituency": true,
    "hasReferendum": false
  }'
```

#### เปลี่ยนสถานะการเลือกตั้ง

| สถานะ | คำอธิบาย |
|-------|----------|
| DRAFT | ร่าง - กำลังเตรียมข้อมูล |
| OPEN | เปิด - เปิดให้ลงคะแนน |
| CLOSED | ปิด - ปิดการลงคะแนน |

```bash
# เปิดการเลือกตั้ง
curl -X PATCH http://localhost:3001/elections/<ELECTION_ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"status": "OPEN"}'

# ปิดการเลือกตั้ง
curl -X PATCH http://localhost:3001/elections/<ELECTION_ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"status": "CLOSED"}'
```

---

### การจัดการพรรคการเมือง

#### เพิ่มพรรคการเมืองใหม่ (Super Admin)

```bash
curl -X POST http://localhost:3001/parties \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "electionId": "demo-election-2027",
    "partyNumber": 9,
    "name": "New Party",
    "nameTh": "พรรคใหม่",
    "abbreviation": "NP",
    "color": "#FF5733"
  }'
```

#### ดูรายชื่อพรรคการเมือง

```bash
curl http://localhost:3001/parties?electionId=demo-election-2027
```

#### แก้ไขข้อมูลพรรค

```bash
curl -X PATCH http://localhost:3001/parties/<PARTY_ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "nameTh": "พรรคใหม่ (แก้ไข)",
    "color": "#00FF00"
  }'
```

---

### การจัดการผู้สมัคร ส.ส.

#### เพิ่มผู้สมัครใหม่

**หมายเหตุ:** ผู้ดูแลแต่ละระดับสามารถเพิ่ม/แก้ไขผู้สมัครได้ตามขอบเขตสิทธิ์

```bash
curl -X POST http://localhost:3001/candidates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "electionId": "demo-election-2027",
    "districtId": "<DISTRICT_ID>",
    "partyId": "<PARTY_ID>",
    "candidateNumber": 6,
    "titleTh": "นาย",
    "firstNameTh": "สมศักดิ์",
    "lastNameTh": "รักชาติ",
    "titleEn": "Mr.",
    "firstNameEn": "Somsak",
    "lastNameEn": "Rakchat"
  }'
```

#### ดูรายชื่อผู้สมัครในเขต

```bash
curl "http://localhost:3001/candidates?electionId=demo-election-2027&districtId=<DISTRICT_ID>"
```

#### แก้ไขข้อมูลผู้สมัคร

```bash
curl -X PATCH http://localhost:3001/candidates/<CANDIDATE_ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "firstNameTh": "สมศักดิ์ (แก้ไข)"
  }'
```

---

### การจัดการคำถามประชามติ

#### เพิ่มคำถามประชามติ (Super Admin)

```bash
curl -X POST http://localhost:3001/elections/<ELECTION_ID>/referendum \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "questionNumber": 2,
    "questionTh": "ท่านเห็นชอบหรือไม่กับการแก้ไขกฎหมาย...",
    "questionEn": "Do you approve...",
    "descriptionTh": "รายละเอียดเพิ่มเติม..."
  }'
```

---

## ระบบสิทธิ์การเข้าถึง (RBAC)

### ตารางสิทธิ์ตามบทบาท

| การดำเนินการ | Super Admin | Regional Admin | Province Admin | District Official |
|-------------|:-----------:|:--------------:|:--------------:|:-----------------:|
| **การเลือกตั้ง** |
| สร้างการเลือกตั้ง | ✅ | ❌ | ❌ | ❌ |
| ดูการเลือกตั้ง | ✅ | ✅ | ✅ | ✅ |
| แก้ไขการเลือกตั้ง | ✅ | ❌ | ❌ | ❌ |
| เปลี่ยนสถานะ | ✅ | ❌ | ❌ | ❌ |
| **พรรคการเมือง** |
| เพิ่มพรรค | ✅ | ❌ | ❌ | ❌ |
| ดูพรรค | ✅ | ✅ | ✅ | ✅ |
| แก้ไขพรรค | ✅ | ❌ | ❌ | ❌ |
| **ผู้สมัคร** |
| เพิ่มผู้สมัคร | ✅ | ✅ (ในภาค) | ✅ (ในจังหวัด) | ❌ |
| ดูผู้สมัคร | ✅ | ✅ | ✅ | ✅ |
| แก้ไขผู้สมัคร | ✅ | ✅ (ในภาค) | ✅ (ในจังหวัด) | ❌ |
| **ผลคะแนน** |
| ดูผลคะแนน | ✅ | ✅ | ✅ | ✅ |
| อัปโหลด Batch | ✅ | ❌ | ❌ | ✅ (ในเขต) |
| อนุมัติ Batch | ✅ | ✅ (ในภาค) | ✅ (ในจังหวัด) | ❌ |

### ขอบเขตการเข้าถึง (Scope)

- **Super Admin**: เข้าถึงได้ทั้งระบบ
- **Regional Admin**: เข้าถึงได้เฉพาะจังหวัดในภาคของตน
- **Province Admin**: เข้าถึงได้เฉพาะเขตในจังหวัดของตน
- **District Official**: เข้าถึงได้เฉพาะเขตของตน

---

## API Reference

### Authentication

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| POST | /auth/voter/login | เข้าสู่ระบบผู้ใช้สิทธิ์ |
| POST | /auth/official/login | เข้าสู่ระบบเจ้าหน้าที่ |
| GET | /auth/me | ดูข้อมูลผู้ใช้ปัจจุบัน |
| POST | /auth/logout | ออกจากระบบ |

### Elections

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | /elections | รายการการเลือกตั้งทั้งหมด |
| GET | /elections/:id | รายละเอียดการเลือกตั้ง |
| POST | /elections | สร้างการเลือกตั้งใหม่ |
| PATCH | /elections/:id | แก้ไขการเลือกตั้ง |

### Parties

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | /parties?electionId=X | รายการพรรคการเมือง |
| POST | /parties | เพิ่มพรรคการเมือง |
| PATCH | /parties/:id | แก้ไขพรรคการเมือง |

### Candidates

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | /candidates?electionId=X&districtId=Y | รายการผู้สมัคร |
| POST | /candidates | เพิ่มผู้สมัคร |
| PATCH | /candidates/:id | แก้ไขผู้สมัคร |

### Votes

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| POST | /votes/cast | ลงคะแนนเสียง |
| GET | /votes/status/:electionId | ตรวจสอบสถานะการลงคะแนน |

### Results

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | /results?electionId=X | ผลคะแนนการเลือกตั้ง |
| GET | /stream/results/:electionId | ผลคะแนนแบบ Real-time (SSE) |

### Geography

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | /geo/regions | รายการภาค |
| GET | /geo/provinces?regionId=X | รายการจังหวัด |
| GET | /geo/districts?provinceId=X | รายการเขตเลือกตั้ง |

---

## โครงสร้างโปรเจค

```
Election Demo/
├── frontend/                 # Next.js 14 Frontend
│   ├── src/
│   │   ├── app/             # App Router Pages
│   │   │   ├── (public)/    # หน้าสาธารณะ
│   │   │   │   ├── vote/    # หน้าลงคะแนน
│   │   │   │   └── results/ # หน้าผลคะแนน
│   │   │   ├── (auth)/      # หน้า Authentication
│   │   │   │   └── login/   # หน้าเข้าสู่ระบบเจ้าหน้าที่
│   │   │   └── (admin)/     # หน้าจัดการ
│   │   │       └── admin/   # Admin Dashboard
│   │   ├── components/      # React Components
│   │   ├── lib/            # Utilities & Context
│   │   └── hooks/          # Custom Hooks
│   └── package.json
│
├── backend/                  # Express.js Backend
│   ├── src/
│   │   ├── routes/          # API Routes
│   │   ├── middleware/      # Auth & RBAC Middleware
│   │   ├── services/        # Business Logic
│   │   └── db/             # Prisma Client
│   ├── prisma/
│   │   ├── schema.prisma   # Database Schema
│   │   └── seed.ts         # Seed Data
│   └── package.json
│
├── shared/                   # Shared TypeScript Types
│   └── src/types/
│       ├── auth.ts         # Authentication Types
│       ├── election.ts     # Election Types
│       ├── vote.ts         # Vote Types
│       └── rbac.ts         # RBAC Types
│
└── package.json             # Root Package (Workspaces)
```

---

## ข้อมูลตัวอย่าง (Demo Data)

หลังจากรัน `npm run db:seed` จะมีข้อมูลดังนี้:

| รายการ | จำนวน |
|--------|-------|
| ภาค | 5 |
| จังหวัด | 77 |
| เขตเลือกตั้ง | 400 |
| พรรคการเมือง | 8 |
| ผู้สมัคร ส.ส. | 2,000 (5 คน/เขต) |
| คำถามประชามติ | 1 |
| บัญชีเจ้าหน้าที่ | 4 |

### พรรคการเมืองตัวอย่าง

| หมายเลข | ชื่อพรรค | ตัวย่อ | สี |
|---------|----------|--------|-----|
| 1 | พรรคเพื่อไทย | PTP | แดง |
| 2 | พรรคก้าวไกล | MFP | ส้ม |
| 3 | พรรคภูมิใจไทย | BJT | น้ำเงิน |
| 4 | พรรคพลังประชารัฐ | PPRP | กรมท่า |
| 5 | พรรคประชาธิปัตย์ | DP | ฟ้า |
| 6 | พรรครวมไทยสร้างชาติ | UTN | ชมพู |
| 7 | พรรคชาติไทยพัฒนา | CTP | ม่วง |
| 8 | พรรคไทยสร้างไทย | TST | เขียว |

---

## License

MIT License - สำหรับการศึกษาและสาธิตเท่านั้น
