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

  // 🔊 ฟังก์ชันเสียง beep
  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(900, ctx.currentTime); // ความถี่เสียง
      gain.gain.setValueAtTime(0.1, ctx.currentTime); // ความดัง

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.12); // ระยะเวลาเสียงสั้นๆ
    } catch (err) {
      console.warn("Audio error:", err);
    }
  }

let lastScan = 0;

function onScan(result) {
  const now = Date.now();
  if (now - lastScan < 1000) return; // กันสแกนซ้ำใน 1 วิ

  lastScan = now;

  playBeep();
  renderList(result);
}

  startScanner(onScan);
}