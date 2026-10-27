# Calorie&Check

ถ่ายรูปอาหารแล้วให้ AI แยกแคลอรี่ทีละรายการ บันทึกเป็นมื้อรายวันเทียบกับเป้า
เป็น PWA (Next.js + TypeScript) รันบนคอมพิวเตอร์ในบ้าน หรือขึ้น Vercel + Supabase เพื่อใช้ได้ทุกที่และเก็บข้อมูลบน cloud

- การออกแบบ: [../design.md](../design.md) · งาน: [../tasks.md](../tasks.md) · คำศัพท์: [../GLOSSARY.md](../GLOSSARY.md) · แผน: [../plan.md](../plan.md)
- ต้นแบบหน้าตา (จาก Claude Design): [templates/calorie-check/](templates/calorie-check/) — แหล่งอ้างอิงของสี ฟอนต์ และโครงหน้า

ใช้ AI ได้ 2 แบบ เลือกด้วย `AI_PROVIDER` ใน `.env.local`

| | OpenRouter (ค่าเริ่มต้น) | Ollama |
|---|---|---|
| ติดตั้ง | แค่สมัคร API key | ลงโปรแกรม + โมเดล ~3 GB |
| ค่าใช้จ่าย | ใช้โมเดล `:free` ได้ฟรี (มีโควตาต่อวัน) | ฟรี |
| ความเร็ว | ไม่กี่วินาที | 10–40 วินาที บน GPU 4 GB |
| ความเป็นส่วนตัว | รูปถูกส่งออกไปอินเทอร์เน็ต | อยู่ในเครื่องทั้งหมด |

## ติดตั้ง

1. ติดตั้ง [Node.js](https://nodejs.org) 20 ขึ้นไป
2. ติดตั้งแพ็กเกจและสร้างไฟล์ตั้งค่า

   ```powershell
   npm install
   copy .env.example .env.local
   ```

### แบบ A: OpenRouter (ฟรี)

1. สมัครที่ https://openrouter.ai แล้วสร้าง key ที่ https://openrouter.ai/keys (ไม่ต้องใส่บัตรเครดิต)
2. ใส่ใน `.env.local`

   ```
   AI_PROVIDER=openrouter
   OPENROUTER_API_KEY=sk-or-xxxxxxxx
   OPENROUTER_MODEL=google/gemma-4-31b-it:free
   ```

- โมเดลฟรีที่ดูรูปได้จะแสดงให้เลือกในหน้าตั้งค่า (ดึงรายชื่อสดจาก OpenRouter เพราะเปลี่ยนบ่อย)
- โมเดลฟรีมีโควตาจำกัดต่อนาทีและต่อวัน ถ้าแอปแจ้ง “เกินโควตาฟรีชั่วคราว” ให้รอ หรือเลือกโมเดลฟรีตัวอื่น
- ผู้ให้บริการโมเดลฟรีบางรายอาจเก็บข้อมูลที่ส่งไป ไม่ควรถ่ายรูปที่มีข้อมูลส่วนตัว
- **ห้ามแชร์ไฟล์ `.env.local`** เพราะมี API key อยู่ (ไฟล์นี้อยู่ใน `.gitignore` แล้ว)

### แบบ B: Ollama (บนเครื่อง)

```powershell
winget install Ollama.Ollama
ollama pull qwen2.5vl:3b
```

แล้วตั้ง `AI_PROVIDER=ollama` ใน `.env.local`

## รัน

```powershell
npm run dev        # โหมดพัฒนา
# หรือ
npm run build
npm run start      # เร็วกว่า เหมาะสำหรับใช้งานจริงบนมือถือ
```

เปิดบนคอมพิวเตอร์ที่ `http://localhost:3000`
หรือบนมือถือที่ `http://<IP ของคอมพิวเตอร์>:3000` (ดู IP ด้วย `ipconfig` ช่อง IPv4 Address)

> ถ้า Windows Firewall ถาม ให้อนุญาต Node.js บนเครือข่าย Private

### ใช้นอกบ้านผ่าน Tailscale (ครอบครัว)

Tailscale สร้างเครือข่ายส่วนตัวระหว่างเครื่องของคุณ เข้าได้เฉพาะเครื่องที่อนุญาต ไม่เปิดแอปสู่อินเทอร์เน็ตสาธารณะ

1. **คอมพิวเตอร์ที่รันแอป:** ติดตั้ง `winget install Tailscale.Tailscale` แล้วล็อกอิน
2. **มือถือของทุกคน:** ติดตั้งแอป Tailscale จาก App Store / Play Store แล้วเข้าร่วมเครือข่ายเดียวกัน
   - ล็อกอินบัญชีเดียวกัน หรือเชิญสมาชิกครอบครัวเข้า tailnet / แชร์เฉพาะเครื่องคอมพิวเตอร์ให้ (Share node) จากหน้า admin ของ Tailscale
   - แผนฟรีมีจำนวนผู้ใช้จำกัด ตรวจที่ https://tailscale.com/pricing
3. **เปิด HTTPS ให้แอป** (บนคอมพิวเตอร์ หลังรัน `npm run start`)

   ```powershell
   tailscale serve --bg 3000
   ```

   จะได้ลิงก์แบบ `https://<ชื่อเครื่อง>.<ชื่อ tailnet>.ts.net` ให้ทุกคนเปิดลิงก์นี้บนมือถือ แล้วกด “เพิ่มลงหน้าจอโฮม”
   (ต้องเปิด MagicDNS และ HTTPS Certificates ในหน้า DNS ของ Tailscale admin ก่อน ถ้ายังไม่เปิด)

- คอมพิวเตอร์ต้องเปิดอยู่และรันแอปไว้ มือถือจึงจะสแกนได้
- เพราะเป็น HTTPS แอปจึงติดตั้งแบบออฟไลน์ได้ (ดูประวัติได้แม้เน็ตไม่ดี แต่การสแกนต้องต่อถึงคอมพิวเตอร์)
- ทุกคนใช้ API key เดียวกัน จึงใช้โควตาโมเดลฟรีร่วมกัน

### ใช้ได้โดยไม่ต้องเปิดคอมพิวเตอร์ (Vercel + Supabase)

เซิร์ฟเวอร์อยู่บน Vercel ข้อมูลอยู่บน Supabase แต่ละคนล็อกอินด้วยรหัสที่ส่งไปทางอีเมล เปลี่ยนมือถือก็ล็อกอินแล้วเห็นข้อมูลเดิม
ใช้แผนฟรีของทั้งสองได้ และใช้ AI ได้เฉพาะ **OpenRouter** (Ollama รันบนคลาวด์ไม่ได้)

**1. Supabase (ฐานข้อมูล)**

1. สมัคร https://supabase.com → **New project** (Region เลือก Singapore จะเร็วที่สุด)
2. เมนู **SQL Editor** → วางเนื้อหาทั้งไฟล์ [`supabase/schema.sql`](supabase/schema.sql) → **Run**
3. จดค่า **Project URL** และ **Publishable key** (Project Settings → API Keys / Data API)

**2. ล็อกอินด้วยรหัสทางอีเมล**

Supabase เปิดการล็อกอินด้วยอีเมลไว้ให้แล้ว เหลือแค่ให้อีเมลส่ง **รหัสตัวเลข** แทนลิงก์

1. Supabase → **Authentication → Emails → Templates**
2. แก้ทั้งแม่แบบ **Magic Link** (คนที่เคยล็อกอินแล้ว) และ **Confirm signup** (คนที่ล็อกอินครั้งแรก) ให้มีรหัส เช่น

   ```html
   <h2>รหัสเข้าสู่ระบบ Calorie&Check</h2>
   <p>รหัสของคุณคือ <strong>{{ .Token }}</strong> (ใช้ได้ภายในไม่กี่นาที)</p>
   ```

   และตั้งหัวเรื่องอีเมลเป็น เช่น `รหัสเข้าสู่ระบบ Calorie&Check`

- อีเมลในตัวของ Supabase ส่งได้ไม่กี่ฉบับต่อชั่วโมง พอสำหรับครอบครัว (ล็อกอินครั้งเดียวอยู่ได้นาน) ถ้าไม่พอ ตั้ง SMTP ของตัวเองได้ที่ Authentication → Emails → SMTP Settings

**3. Vercel (เซิร์ฟเวอร์)**

1. สมัคร https://vercel.com ด้วยบัญชี GitHub → **Add New → Project** → เลือก repo ของแอปนี้
2. ก่อนกด Deploy เปิด **Environment Variables** แล้วใส่

   | ชื่อ | ค่า |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL จาก Supabase |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key จาก Supabase |
   | `ALLOWED_EMAILS` | อีเมลของคนในครอบครัว คั่นด้วย `,` |
   | `AI_PROVIDER` | `openrouter` |
   | `OPENROUTER_API_KEY` | key จาก https://openrouter.ai/keys |
   | `OPENROUTER_MODEL` | `google/gemma-4-31b-it:free` |

3. กด **Deploy** → เปิด `https://<ชื่อโปรเจกต์>.vercel.app` บนมือถือ → กรอกอีเมล → กรอกรหัสจากอีเมล → กด “เพิ่มลงหน้าจอโฮม”
4. ต่อจากนี้ทุกครั้งที่ `git push` ขึ้น GitHub Vercel จะ deploy ให้อัตโนมัติ

- **เพิ่ม/ลบคนในครอบครัว**: แก้ `ALLOWED_EMAILS` ใน Vercel → Settings → Environment Variables แล้ว Redeploy
- คนที่อีเมลไม่อยู่ในรายชื่อ ยืนยันรหัสได้แต่จะเห็นข้อความว่า “ยังไม่ได้รับอนุญาต” และเรียก AI ไม่ได้

## ข้อมูลของแต่ละคนและการสำรอง

- **ตั้งค่า Supabase แล้ว**: ประวัติ น้ำหนัก เป้าแคลอรี่ และโมเดลที่เลือก เก็บบน cloud แยกตามอีเมลที่ล็อกอิน (Row Level Security ทำให้เห็นเฉพาะของตัวเอง)
  - มือถือเก็บสำเนาไว้ด้วย **เน็ตหลุดยังเปิดดูได้** แต่การบันทึก/แก้/ลบ ต้องต่อเน็ต (แอปจะแจ้งถ้าบันทึกไม่สำเร็จ)
  - **ออกจากระบบ** (ตั้งค่า → บัญชี) จะลบสำเนาในเครื่องนั้นด้วย
- **ไม่ได้ตั้งค่า Supabase**: ข้อมูลอยู่ในเบราว์เซอร์ของเครื่องนั้นเท่านั้น ถ้าล้างข้อมูลเบราว์เซอร์ ลบแอป หรือเปลี่ยนเครื่อง **ข้อมูลจะหาย** แนะนำส่งออกสัปดาห์ละครั้ง
- ธีมที่เลือก จำไว้ในแต่ละเครื่องเสมอ
- หน้า **ตั้งค่า → สำรองข้อมูล**
  - **ส่งออก**: ได้ไฟล์ `calorie-check-backup-ปี-เดือน-วัน.json` (บนมือถือจะเปิดเมนูแชร์ให้บันทึกลง Files / Google Drive / LINE Keep)
  - **นำเข้า**: เลือกไฟล์สำรอง แอปจะสรุปจำนวนการสแกนให้ยืนยันก่อน แล้วรวมกับข้อมูลเดิม (การสแกนเดียวกันใช้ของในไฟล์) และใช้เป้าแคลอรี่จากไฟล์
- **ย้ายข้อมูลจากแอปเดิม (ที่รันบนคอมพิวเตอร์) ขึ้น cloud**: เปิดแอปเดิม → ส่งออก → เปิดแอปบน Vercel แล้วล็อกอิน → นำเข้า (ทำครั้งเดียวต่อคน)
- ไฟล์สำรองมีรูปย่ออาหารและประวัติการกิน ควรเก็บเป็นส่วนตัว

## หน้าตาและธีม

- โทนเขียวตามต้นแบบใน `templates/calorie-check/` ค่าสีทั้งหมดอยู่ใน `src/app/globals.css`
- ฟอนต์จาก Google Fonts ผ่าน `next/font`: Figtree + Anuphan (เนื้อหา), Caprasimo + Mitr (หัวข้อและตัวเลข)
- หน้า **ตั้งค่า → ธีม**: อัตโนมัติ (ตามระบบ) / สว่าง / มืด มีผลทันทีและจำไว้ในเบราว์เซอร์เครื่องนั้น (ไม่รวมในไฟล์สำรอง)

### ลองแอปโดยไม่เรียก AI จริง

ตั้ง `AI_MOCK=1` แอปจะตอบผลการสแกนตัวอย่าง (กะเพราหมูสับ ข้าวสวย ไข่ดาว ชาไทยปั่น) ทุกครั้ง

## ตัวแปรใน `.env.local`

| ตัวแปร | ค่าเริ่มต้น | ความหมาย |
|---|---|---|
| `AI_PROVIDER` | `openrouter` ถ้ามี key, ไม่งั้น `ollama` | ผู้ให้บริการ AI |
| `OPENROUTER_API_KEY` | – | API key ของ OpenRouter |
| `OPENROUTER_MODEL` | `google/gemma-4-31b-it:free` | โมเดลเริ่มต้นของ OpenRouter |
| `OLLAMA_URL` | `http://localhost:11434` | ที่อยู่ของ Ollama |
| `OLLAMA_MODEL` | `qwen2.5vl:3b` | โมเดลเริ่มต้นของ Ollama |
| `AI_MOCK` | `0` | `1` = ใช้ผลจำลอง |
| `NEXT_PUBLIC_SUPABASE_URL` | – | Project URL ของ Supabase (ว่าง = เก็บข้อมูลในเครื่องอย่างเดียว ไม่ต้องล็อกอิน) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | – | Publishable key ของ Supabase |
| `ALLOWED_EMAILS` | – | อีเมลที่ใช้แอปได้ คั่นด้วย `,` (ว่าง = ไม่มีใครเข้าได้) |

หลังแก้ `.env.local` ต้องปิดแล้วรันแอปใหม่

## ตรวจสอบโค้ด

```powershell
npm test           # unit test (vitest)
npm run typecheck  # TypeScript
npm run build
```

## ข้อควรรู้

- ค่าแคลอรี่เป็น **ค่าประมาณ** (คลาด ±20–30% ได้) รายการที่จับคู่กับตารางเมนูอ้างอิง (`src/data/thai-foods.json`) ได้จะใช้ตัวเลขจากตาราง ส่วนรายการที่ไม่ตรงจะมีป้าย “ประมาณการ” และใช้ตัวเลขที่ AI เดา
- ข้อมูลเก็บบน Supabase (ตั้งค่าแล้ว) พร้อมสำเนาใน IndexedDB ไว้ดูตอนออฟไลน์ หรือเก็บใน IndexedDB อย่างเดียว (ไม่ได้ตั้งค่า) — โค้ดอยู่ที่ `src/lib/db.ts` → `store.ts` (cloud + สำเนา), `cloudStore.ts` (Supabase), `localCache.ts` (IndexedDB)
- ล็อกอินและสิทธิ์: `src/proxy.ts` ตรวจ session ของ Supabase และ `ALLOWED_EMAILS` ทุกคำขอ ส่วนตารางใน Supabase ใช้ Row Level Security
- API key อยู่ฝั่งเซิร์ฟเวอร์เท่านั้น มือถือเรียกผ่าน `/api/analyze` จึงไม่เห็น key
- การติดตั้งเป็นแอปแบบออฟไลน์ (service worker) ใช้ได้บน `localhost` หรือ HTTPS เท่านั้น เมื่อเปิดผ่าน `http://<IP>` แอปยังใช้งานได้ตามปกติ
- npm scripts เรียก `node node_modules/...` โดยตรง เพราะเครื่องหมาย `&` ในชื่อโฟลเดอร์ทำให้ไฟล์ `.cmd` ของ npm บน Windows ทำงานผิด
- เพิ่มผู้ให้บริการใหม่ได้โดยเขียน `FoodAnalyzer` (ดู `src/lib/aiCore.ts`, `ollama.ts`, `openrouter.ts`) แล้วเลือกใน `src/lib/analyzer.ts`
