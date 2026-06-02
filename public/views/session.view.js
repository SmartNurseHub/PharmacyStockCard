
import { startScanner } from "../modules/scanner.js";
export function initSessionView() {

  console.log("📷 INIT SESSION VIEW");

  const info = document.getElementById("info");
  const reader = document.getElementById("reader");

  if (!info || !reader) {
    console.error("DOM not ready: info or reader missing");
    return;
  }

  info.innerText = "🔄 กำลังเปิดกล้อง...";

  startScanner(renderList); // 👈 ส่ง element ไปเลย (ดีที่สุด)
}