/* FeverWard – helpers.js
   Small UI helpers: escaping, toast, temperature/streak/status badges, search. */

const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function toast(msg) {
  UI.toast = msg;
  render();
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    UI.toast = null;
    render();
  }, 2600);
}
function tempHTML(r) {
  if (!r) return '<span class="pill grey">Not taken</span>';
  return `<span class="temp ${isFever(r.t) ? "f" : "n"}">${r.t.toFixed(1)}°C</span>`;
}
function streakHTML(p) {
  const s = Math.min(streak(p), CURE_DAYS);
  let h =
    '<span class="streak" title="' +
    streak(p) +
    ' fever-free day(s) in a row">';
  for (let i = 0; i < CURE_DAYS; i++)
    h += `<i class="${i < s ? "on" : ""}"></i>`;
  return (
    h + '</span> <span class="hint">' + streak(p) + "/" + CURE_DAYS + "</span>"
  );
}
function statusPill(p) {
  if (p.status === "discharge_pending")
    return '<span class="pill info">Cleared – awaiting admin</span>';
  if (p.status === "discharged")
    return '<span class="pill ok">Discharged</span>';
  if (p.status === "deceased") return '<span class="pill grey">Deceased</span>';
  if (eligible(p)) return '<span class="pill ok">Eligible for discharge</span>';
  const lt = lastTemp(p);
  if (lt && isFever(lt.t)) return '<span class="pill fever">Febrile</span>';
  return '<span class="pill warn">Recovering</span>';
}
function matchQ(p) {
  const q = UI.q.trim().toLowerCase();
  return (
    !q ||
    p.name.toLowerCase().includes(q) ||
    String(p.room) === q ||
    p.id.toLowerCase().includes(q)
  );
}
