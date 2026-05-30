import { state } from "../core/state.js";
import { startScanner } from "../modules/scanner.js";
import { closeSession } from "../modules/session.js";

window.addEventListener("DOMContentLoaded", () => {

  const params = new URLSearchParams(location.search);

  state.session_id = params.get("sid");
  state.user = params.get("user");

  renderInfo();
  startScanner(renderList);

});

function renderInfo() {
  document.getElementById("info").innerHTML =
    `Session: ${state.session_id}<br>User: ${state.user}`;
}

function renderList(items) {

  const el = document.getElementById("list");

  el.innerHTML = items.map(i => `
    <div class="item">
      <div>
        <b>${i.CODE}</b><br/>
        ${i.NAME}
      </div>
      <div>${i.qty}</div>
    </div>
  `).join("");
}

window.closeSession = closeSession;