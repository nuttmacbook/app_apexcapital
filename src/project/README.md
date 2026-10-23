# src/project/ ✏️ — โค้ดของคุณ (เว็บ)

แยกเป็น 2 ฝั่ง ห้ามปนกัน:

| โฟลเดอร์ | คืออะไร | import อะไรได้ |
| --- | --- | --- |
| `chain/` **on-chain** | คุยกับ contract: `reads.js` (อ่าน 1 ครั้ง/หน้า), `viewParse.js` (แปลงผล), `intereacts/` (ส่ง tx), `index.js` (ประตูเดียวที่ UI ใช้) | `engine/chain`, `generated/` |
| `ui/` **off-chain** | หน้าตา: `main.js` (หน้า + ปุ่ม), `pages/`, `componants/`, `theme.js`, `main.css` | `../chain` (index.js เท่านั้น), `engine/ui`, `engine/settings` |

UI ไม่เคย import ABI, kitbox หรือ engine/chain ตรง ๆ: เปลี่ยน contract ได้โดยไม่แตะหน้าเว็บ และกลับกัน
