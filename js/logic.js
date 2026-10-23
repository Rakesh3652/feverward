/* FeverWard – logic.js
   Calculations: fever-free streak, eligibility, free rooms, outcomes, audit log. */

const active = () =>
  S.patients.filter(
    (p) => p.status === "admitted" || p.status === "discharge_pending",
  );
const staffName = (id) =>
  [...STAFF.nurse, ...STAFF.doctor, ...STAFF.admin].find((s) => s.id === id)
    ?.name || id;
const isFever = (t) => t >= FEVER_C;
function dateOf(d) {
  const x = new Date(BASE_DATE);
  x.setDate(x.getDate() + d);
  return x;
}
function fmtDate(d) {
  return dateOf(d).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
function nowTime() {
  const x = new Date();
  return (
    String(x.getHours()).padStart(2, "0") +
    ":" +
    String(x.getMinutes()).padStart(2, "0")
  );
}
/* Consecutive fever-free reported days, counted back from today (or yesterday if today not yet taken). A missing day breaks the streak. */
function streak(p) {
  let d = p.readings[S.day] ? S.day : S.day - 1,
    n = 0;
  while (d >= p.admitDay) {
    const rd = p.readings[d];
    if (!rd || isFever(rd.t)) break;
    n++;
    d--;
  }
  return n;
}
const eligible = (p) => streak(p) >= CURE_DAYS;
const tempToday = (p) => p.readings[S.day];
const visitToday = (p) => p.visits[S.day];
const missedDays = (p) => {
  let m = 0;
  for (let d = p.admitDay; d < S.day; d++) if (!p.readings[d]) m++;
  return m;
};
const daysIn = (p) => S.day - p.admitDay + 1;
function lastTemp(p) {
  for (let d = S.day; d >= p.admitDay; d--)
    if (p.readings[d]) return { d, ...p.readings[d] };
  return null;
}
function freeRooms() {
  const used = new Set(active().map((p) => p.room));
  const f = [];
  for (let i = 1; i <= ROOMS; i++) if (!used.has(i)) f.push(i);
  return f;
}
function outcomes() {
  const rec =
    S.closed.recovered +
    S.patients.filter((p) => p.status === "discharged").length;
  const dec =
    S.closed.deceased +
    S.patients.filter((p) => p.status === "deceased").length;
  const tot = rec + dec;
  const mort = tot ? (dec / tot) * 100 : 0;
  return { rec, dec, tot, mort, success: tot ? (rec / tot) * 100 : 0 };
}
function audit(msg) {
  S.log.unshift({
    day: S.day,
    at: nowTime(),
    by: S.user?.name || "system",
    msg,
  });
  S.log = S.log.slice(0, 200);
}
