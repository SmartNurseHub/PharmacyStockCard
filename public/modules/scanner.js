import { getMovement } from "../core/api.js";
import { state } from "../core/state.js";

let last = "";
let lock = false;

const beep = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");

export function startScanner(onUpdate) {

  const qr = new Html5Qrcode("reader");

  qr.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 220 },
    async (text) => {

      if (lock) return;
      lock = true;
      setTimeout(() => lock = false, 500);

      if (text === last) return;
      last = text;

      const res = await getMovement(text);

      if (!res?.ok) return;

      const d = res.data;

      const found = state.items.find(i => i.MOVEMENT_ID === d.MOVEMENT_ID);

      if (found) {
        found.qty++;
      } else {
        state.items.push({
          ...d,
          qty: 1
        });
      }

      beep.play();

      onUpdate(state.items);
    }
  );
}