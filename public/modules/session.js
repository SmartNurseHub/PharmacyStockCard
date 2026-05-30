import { state } from "../core/state.js";

export async function closeSession() {

  await fetch("/api/count", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(state.items)
  });

  await fetch("/api/close", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      session_id: state.session_id
    })
  });

  state.items = [];
}