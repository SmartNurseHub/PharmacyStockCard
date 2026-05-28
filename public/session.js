const params = new URLSearchParams(window.location.search);
let session_id = params.get("sid") || "S2026-001";
let user = params.get("user") || "Nurse-A";
let sessionItems = [];

/* =========================
   LOAD SESSION
========================= */
async function load() {

  try {

    const res = await fetch(`/api/session/${sid}`);

    if (!res.ok) throw new Error("load failed");

    const data = await res.json();

    sessionItems = data;

    const el = document.getElementById("list");

    if (!data.length) {
      el.innerHTML = `<div style="text-align:center;color:#94a3b8">ไม่มีข้อมูล</div>`;
      return;
    }

    el.innerHTML = data
      .map(i => `
        <div style="padding:6px;border-bottom:1px solid #334155">
          ${i.code} | <b>${i.qty}</b>
        </div>
      `)
      .join("");

  } catch (err) {
    console.error(err);
  }
}

/* =========================
   CLOSE SESSION
========================= */
async function closeSession() {

  await fetch("/api/count", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(items)
  });

  await fetch("/api/close", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ session_id })
  });

  // ✅ RESET ระบบทั้งหมด
  items = [];
  last = "";
  renderList();

  Swal.fire({
    icon: 'success',
    title: 'บันทึกสำเร็จ',
    text: 'รีเซ็ตข้อมูลแล้ว พร้อมเริ่มรอบใหม่',
    timer: 1500,
    showConfirmButton: false
  });
}

/* =========================
   INIT
========================= */
load();

/* FIX: อย่ารัวเกิน */
setInterval(load, 10000); // 10 วินาทีพอ