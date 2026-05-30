const params = new URLSearchParams(window.location.search);

let session_id = params.get("sid") || "E2026-001";
let user = params.get("user") || "Nurse-A";

let items = [];
let last = "";
let scanning = false;

const beep = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");

/* =========================
   INIT
========================= */
window.addEventListener("DOMContentLoaded", () => {

  const info = document.getElementById("info");

  if (info) {
    info.innerHTML = `Session: ${session_id}<br>User: ${user}`;
  }

  startScanner();
});

/* =========================
   START SCANNER
========================= */
function startScanner() {

  const qr = new Html5Qrcode("reader");

  qr.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 220 },
    scan
  ).catch(err => {
    console.error(err);
    alert("Camera error: " + err);
  });
}

/* =========================
   SCAN
========================= */
function scan(text) {

  if (scanning) return;
  scanning = true;

  setTimeout(() => scanning = false, 500);

  if (text === last) return;
  last = text;

  beep.play();

  fetch(`/api/movement/${text}`)
    .then(async r => {

      if (!r.ok) throw new Error("NOT FOUND");

      return r.json();
    })
    .then(d => {

  console.log("SCAN DATA =", d);

  const found = items.find(
    i => i.movement_id === d.movement_id
  );

  console.log("FOUND =", found);

  if (found) {
    found.qty++;
  } else {

    items.push({
      session_id,
      movement_id: d.movement_id,
      code: d.code,
      name: d.name,
      qty: 1,
      user,
      lot: d.lot || "-",
      exp: d.exp || "-"
    });

    console.log("ITEM ADDED");
  }

  console.log("ITEMS =", items);

  renderList();

})
    .catch(err => {

      console.error(err);

    });
}

/* =========================
   CLOSE SESSION
========================= */
async function closeSession() {

  try {

    Swal.fire({
      title: 'กำลังบันทึก...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    await fetch("/api/count", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(items)
    });

    await fetch("/api/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id })
    });

    items = [];
    renderList();

    Swal.fire({
      icon: 'success',
      title: 'Saved',
      text: 'Session reset complete',
      timer: 1200,
      showConfirmButton: false
    });

  } catch (err) {

    console.error(err);

    Swal.fire({
      icon: 'error',
      title: 'Save Failed',
      text: err.message
    });
  }
}

/* =========================
   RENDER
========================= */
function renderList() {

  const el = document.getElementById("list");

  if (!el) return;

  if (!items.length) {
    el.innerHTML = `
      <div style="text-align:center;color:#94a3b8;padding:20px">
        ยังไม่มีรายการ
      </div>`;
    return;
  }

  el.innerHTML = items.map((i, index) => `
    <div class="item">

      <div>
        <div style="color:#22c55e;font-weight:600">${i.code}</div>
        <div style="font-size:12px;color:#cbd5e1">${i.name}</div>
        <div style="font-size:12px;color:#64748b">${i.lot} | ${i.exp}</div>
      </div>

      <div style="display:flex;align-items:center;gap:8px">

        <button onclick="minus(${index})"
          style="width:30px;height:30px;border-radius:8px;border:none;background:#334155;color:white">-</button>

        <div style="min-width:25px;text-align:center;font-weight:600">
          ${i.qty}
        </div>

        <button onclick="plus(${index})"
          style="width:30px;height:30px;border-radius:8px;background:#22c55e;border:none">+</button>

      </div>

    </div>
  `).join("");
}

/* =========================
   QTY
========================= */
function plus(i){
  items[i].qty++;
  renderList();
}

function minus(i){
  if(items[i].qty > 0){
    items[i].qty--;
    renderList();
  }
}