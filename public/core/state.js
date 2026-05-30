export const state = {
  session_id: null,
  user: null,
  items: []
};

export function setState(key, value) {
  state[key] = value;
}