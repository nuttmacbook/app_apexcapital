# APEX CAPITAL — dApp แผน 1 แตก 2 ชั้นเดียวรีรัน (BNB Smart Chain, USDT)

เว็บสมัครสมาชิก + ดูผัง 1 แตก 2 + แผนการตลาด ที่ทุกตัวเลขอ่านจาก smart contract
Vite + JavaScript ธรรมดา + Tailwind v4 + kitbox, contract Solidity 0.8.37 อยู่หลัง proxy (`BaseProxyUsed`) อัปเกรดได้

## แผนที่ contract ทำ (จาก PDF)

| | |
| --- | --- |
| สมัคร | 10 USDT → 3 USDT (30%) ผู้แนะนำ, 7 USDT เข้าผังด้านบน |
| ผัง R1 | วางตามลิงก์ผู้แนะนำ: ซ้ายก่อนขวา เต็มแล้วล้นลงสายงานของผู้แนะนำ (ช่องว่างที่ตื้นที่สุด ซ้ายไปขวา) |
| ผัง R2+ | ออโต้รันทั้งระบบ: ID เข้าตามลำดับที่มาถึง (อัพแร้งอัตโนมัติหรือซื้อ) ID ที่ n อยู่ใต้ ID ที่ (n−1)/2 |
| หลายจุด | 1 สมาชิกมีได้หลาย ID ใน Rank เดียว (รีรัน/เกิดใหม่) เว็บแสดงที่มา Joined / ↑ ขึ้นมาจาก / ↻ เกิดใหม่จาก |
| ID เกิดใหม่ใน R1 | `R1_REBIRTH_UNDER=SPONSOR` (ใต้ผู้แนะนำ) หรือ `SELF` (ใต้ ID แรกของตัวเอง) |
| ช่องที่ 1 เต็ม | จ่ายเจ้าของผัง % ตาม Rank (R2, R4–R14 = 50%, R15 = 100%, R1/R3 = 0) |
| เงินที่เหลือ | เงินทุกช่องที่ไม่ได้จ่ายช่องแรก เข้า "กองอัพแร้ง" ของสมาชิก 1 กองต่อ Rank (รวมทุก ID ของคนนั้นใน Rank นั้น) |
| ราคาอัพแร้ง | = ราคา Rank ถัดไป + ID เกิดใหม่ของขั้นนั้น (R3→R1, R6→R1, R9→R7, R12→R10, R15→2×R13 + 11×R1) + เศษเข้าบริษัท: R1 14, R2 21, R3 40, … R15 1,057.5 |
| อัพอัตโนมัติ | กองถึงราคาอัพแร้ง → ได้ ID ใน Rank ถัดไป + ID เกิดใหม่ + เศษเข้าบริษัท ส่วนที่เกินเก็บไว้รอบหน้า |
| ซื้อเอง `buyRank(rank, count)` | ซื้อ Rank ถัดไปได้ทันทีกี่ ID ก็ได้ (1–50 ต่อครั้ง) ต้องมี ID ใน Rank ก่อนหน้าอย่างน้อย 1 จุด (ข้ามไม่ได้) จ่าย = ราคาอัพแร้ง × จำนวน − กองของ Rank ก่อนหน้า (กองเหลือ 0) รวมส่วนรีเบิร์ธและเศษบริษัทแล้ว |
| ย้ายกระเป๋า `transferWallet(newWallet)` | สมาชิกย้ายบัญชีทั้งหมด (รหัสสมาชิก, ทุก ID, กองอัพแร้ง, ผู้แนะนำ, ทีม, ประวัติรายได้, ลิงก์แนะนำเดิม) ไปกระเป๋าใหม่ที่ยังไม่เคยสมัคร เรียกได้จากกระเป๋าเดิมเท่านั้น เงินที่อยู่ในกระเป๋าเดิมไม่ย้าย (หน้าแรกส่วน "Change wallet") |
| เข้ากระเป๋าบริษัท | R2 1, R6 1.25, R9 13.75, R12 5, R15 7.5 USDT |

ราคา: 10, 14, 20 · 30, 45, 67.5 · 90, 135, 202.5 · 200, 300, 450 · 470, 705, 1057.5 (Bronze / Silver / Emerald / Gold / Diamond)
ทุกค่าอยู่ใน `dev/settings/contracts/ApexMatrix.env` contract คำนวณเศษเข้ากระเป๋าบริษัทเองและไม่ยอม deploy ถ้าแผนจ่ายเกินที่รับ

## หน้าเว็บ (1 RPC call ต่อหน้า)

| หน้า | view | ทำอะไร |
| --- | --- | --- |
| `#/` Dashboard | `getHomeView` | สมัคร (รับ `?ref=ID`), ยอดรายได้, ลิงก์แนะนำ, ID ต่อ Rank, กองอัพแร้งต่อ Rank + ซื้อ Rank ถัดไป (Move up a rank) |
| `#/plan` | `getPlanView` | ตารางแผน 5 ระดับ 15 Rank จาก contract + คำเตือนความเสี่ยง |
| `#/board?rank=&pos=` | `getBoardView` | ผัง 1 แตก 2 สี่ชั้น กดที่ ID เพื่อเลื่อนลง, ขึ้นชั้นบน, ไปที่ # |
| `#/team?page=` | `getTeamView` | ผู้แนะนำของเรา + รายชื่อคนที่เราแนะนำ (แบ่งหน้า) |
| `#/multi-transfer` (ลิงก์ "Multi transfer" ที่ footer) | `getHomeView` | ใส่รายชื่อกระเป๋า + ยอดรวม → approve แล้วเรียก `dividend` หารเท่าๆ กัน |

## เริ่มใช้งานในเครื่อง

```bash
cp settings/.env.example settings/.env
npm install && (cd dev && npm install)
cd dev && npm run dev        # เชนในเครื่อง + deploy + สมาชิกตัวอย่าง 60 คน + เว็บพร้อมแผงทดสอบ
cd dev && npm test           # เทสทั้งหมด (-- --count 400 เพิ่มจำนวนคน)
```

แผงทดสอบ: Demo wallet, +BNB, +USDT, เลื่อนเวลา และปุ่มของโปรเจกต์ "2 people join under me", "10 people join", "Process waiting placements"

## โหมด production / dev (การแสดงเลขสมาชิกและเลข ID)

ตั้งใน `settings/.env` (และบน Vercel)

| ค่า | ผล |
| --- | --- |
| `VITE_APP_MODE=production` | เลขสมาชิก (#1, #2, …) และเลข ID ในผังแสดงเป็นโค้ด 7 ตัวที่ดูสุ่ม (เช่น `FVV38AR`) ทุกหน้า รวมถึงลิงก์แนะนำ `?ref=FVV38AR` และลิงก์ผัง; ลิงก์ที่ใช้เลขตรง ๆ (`?ref=12`) ใช้ไม่ได้ |
| `VITE_APP_MODE=dev` | แสดงเลขจริง และมีปุ่มมุมซ้ายล่าง "IDs: real numbers / codes" สลับดูแบบ production ได้ (จำไว้เฉพาะเบราว์เซอร์นั้น) รับได้ทั้งเลขและโค้ด |
| `VITE_ID_KEY` | ข้อความที่ใช้สร้างโค้ด ตั้งครั้งเดียวก่อนเปิดใช้ **ห้ามเปลี่ยน** เปลี่ยนแล้วโค้ดทุกคนเปลี่ยนและลิงก์แนะนำที่แชร์ไปแล้วใช้ไม่ได้ |

- contract ไม่เปลี่ยน ยังทำงานด้วยเลขจริง หน้าเว็บแปลงโค้ด ↔ เลขในเบราว์เซอร์ (`src/project/ui/componants/ids.js`)
- โค้ดสมาชิกกับโค้ด ID ของแต่ละแร้งเป็นคนละชุด มีตัวตรวจพิมพ์ผิด 1 ตัว (พิมพ์ผิดตัวเดียวจะไม่ไปตกที่คนอื่น)
- ซ่อนลำดับจากผู้ใช้ทั่วไปเท่านั้น ไม่ใช่ความลับ: เลขจริงยังดูได้บน BscScan และ key อยู่ในโค้ดเว็บ; จำนวนสมาชิก/จำนวน ID ต่อแร้งยังแสดงอยู่

## ค่าตั้ง

| อยากเปลี่ยน | ไฟล์ |
| --- | --- |
| project id, network, ชื่อ, คำโปรย, โดเมน, โหมด production/dev, key ของโค้ด | `settings/.env` (บน Vercel ใส่ใน Environment Variables) |
| token, ROOT_WALLET (รายได้รหัส #1), COMPANY_WALLET (รายได้บริษัท), % แนะนำ, ราคา/จ่าย/รีเบิร์ธต่อ Rank, R1_REBIRTH_UNDER, ชื่อระดับ, STEPS_PER_TX | `dev/settings/contracts/ApexMatrix.env` |
| key / RPC / owner ตอน deploy | `dev/settings/deploy.env` (ความลับ, คัดลอกจาก `.example`) |

### กระเป๋า 3 ใบ (ต้องเป็นคนละแอดเดรส)

| กระเป๋า | ได้อะไร | เปลี่ยนทีหลัง (owner) |
| --- | --- | --- |
| `ROOT_WALLET` | ทุกอย่างที่รหัส #1 ได้: ค่าผัง (ช่องแรก) + ค่าแนะนำของคนที่สมัครใต้ #1 | `setRootWallet(address)` (ห้ามเป็นสมาชิกอยู่แล้ว) |
| `COMPANY_WALLET` | เศษที่เกินจากผัง (R2 1, R6 1.25, R9 13.75, R12 5, R15 7.5) + ค่าแนะนำของ ID รีเบิร์ธของรหัส #1 | `setCompanyWallet(address)` |
| owner (`DEPLOY_OWNER`) | ไม่ได้รับเงินจากแผน ใช้ตั้งค่าเท่านั้น | `transferOwnership(address)` |

ค่าใน `ApexMatrix.env` ตอนนี้เป็นแอดเดรสทดสอบของ hardhat (ใช้ได้แค่เครื่อง local) **ต้องเปลี่ยนเป็นกระเป๋าจริงก่อน deploy** ถ้าลืม `deploy:live` จะไม่ยอมทำต่อ

### ปันผลผลประกอบการ

- `dividend(address[] wallets, uint256 amount)` ใครเรียกก็ได้ (ตั้งใจให้กระเป๋าบริษัทใช้) ตัด USDT จากกระเป๋าผู้เรียกตรงไปหาแต่ละกระเป๋าเท่าๆ กัน (`amount / จำนวนกระเป๋า`) เศษที่หารไม่ลงตัวอยู่ในกระเป๋าผู้เรียก เงินไม่ผ่าน/ไม่ค้างใน contract ต้อง approve ก่อน (หน้าเว็บทำให้)
- ประมาณ 126k gas ต่อ 3 กระเป๋า และราว +30k ต่อกระเป๋าที่เพิ่ม ถ้ารายชื่อยาวมาก (หลายร้อย) แบ่งเป็นหลายรอบ
- `sendOutETH(address[] wallets)` เฉพาะ owner: หาร BNB ที่ค้างใน contract (จากการส่ง BNB มากับฟังชั่น payable) ให้ทุกกระเป๋าเท่าๆ กัน
- ทุกฟังชั่นที่เรียกจากภายนอกได้เป็น `payable` BNB ที่แนบมาจะค้างใน contract จนกว่า owner จะเรียก `sendOutETH`

## Deploy จริง

```bash
cd dev
cp settings/deploy.env.example settings/deploy.env   # กรอก key, RPC, DEPLOY_OWNER
npm run deploy:live            # dry run
npm run deploy:live -- --send  # deploy
npm run verify                 # ไฟล์สำหรับ BscScan: ApexMatrixImplementation ก่อน แล้ว proxy ApexMatrix, v0.8.37+commit.f401782d
```
แล้วตั้ง `VITE_CHAIN=bsc` และ commit `src/generated/addresses.json` + `dev/generated/deployments/bsc.json`

## ข้อควรรู้

- สมาชิก #1 (ROOT_WALLET) นั่งบนสุดของทุก Rank ช่วงแรกจึงได้ส่วนใหญ่ของการจ่าย
- เงินที่จ่ายทั้งหมดมาจากคนที่สมัครทีหลัง ถ้าคนสมัครหยุด ผังจะไม่เต็ม (หน้าเว็บแจ้งไว้ในหน้า Plan)
- owner ถอน USDT ออกจาก contract ไม่ได้ แต่ admin ของ proxy อัปเกรด logic ได้ → ใช้ hardware wallet/multisig
- แต่ละการสมัครวาง ID ได้สูงสุด `STEPS_PER_TX` ตัว ที่เหลือรอในคิว ใครกด `processQueue` ก็ได้ (`buyRank` ก็วางให้ด้วย)
- contract แจ้งเหตุผลที่ไม่ผ่านเป็น custom error (เช่น `NeedsAnIDInTheRankBelow`) เพื่อให้ขนาดไม่เกิน 24 KB หน้าเว็บแปลงเป็นประโยคใน `src/project/chain/revertText.js`
- เงินใน contract = กองอัพแร้งของทุกคน + ราคาของ ID ที่รอวาง (เทสเช็กทุกครั้ง)

## ฟอนต์

ใช้ Plus Jakarta Sans (SIL Open Font License, ไฟล์เดียวแบบ variable ใน `public/fonts/` พร้อม `PlusJakartaSans-OFL.txt`) โหลดจากโดเมนตัวเอง ไม่พึ่ง Google Fonts
