/* FeverWard – actions.js
   Actions that change data. Each one checks the rules, updates data, logs and saves. */

function recordTemp(pid, t) {
  const p = S.patients.find((x) => x.id === pid);
  if (!p || (p.status !== "admitted" && p.status !== "discharge_pending"))
    return "Patient is not currently admitted.";
  if (visitToday(p))
    return "The doctor has already visited this patient today; the reading is locked. Ask the doctor to add a correction note.";
  const existing = tempToday(p);
  if (existing && existing.by !== S.user.id)
    return (
      "Today's reading was taken by " +
      staffName(existing.by) +
      ". Only they can correct it."
    );
  p.readings[S.day] = { t, by: S.user.id, at: nowTime() };
  audit(
    (existing ? "Corrected" : "Recorded") +
      " temperature " +
      t.toFixed(1) +
      " °C for " +
      p.name +
      " (Room " +
      p.room +
      ")",
  );
  save();
  return null;
}
function recordVisit(pid, notes, treatment) {
  const p = S.patients.find((x) => x.id === pid);
  if (!tempToday(p))
    return "Today's temperature hasn't been recorded yet. Ask a nurse to take it first.";
  p.visits[S.day] = { by: S.user.id, notes, treatment, at: nowTime() };
  audit("Visited " + p.name + " (Room " + p.room + ")");
  save();
  return null;
}
function recommendDischarge(pid) {
  const p = S.patients.find((x) => x.id === pid);
  if (!eligible(p))
    return (
      "Patient has not yet reported " +
      CURE_DAYS +
      " consecutive fever-free days."
    );
  p.status = "discharge_pending";
  p.recBy = S.user.id;
  p.recDay = S.day;
  audit("Cleared " + p.name + " for discharge");
  save();
  return null;
}
function cancelDischarge(pid) {
  const p = S.patients.find((x) => x.id === pid);
  p.status = "admitted";
  delete p.recBy;
  audit("Withdrew discharge clearance for " + p.name);
  save();
}
function confirmDischarge(pid) {
  const p = S.patients.find((x) => x.id === pid);
  if (p.status !== "discharge_pending")
    return "Discharge needs a doctor's clearance first.";
  p.status = "discharged";
  p.closedDay = S.day;
  audit("Discharged " + p.name + " – Room " + p.room + " is now free");
  save();
  return null;
}
function recordDeath(pid) {
  const p = S.patients.find((x) => x.id === pid);
  p.status = "deceased";
  p.closedDay = S.day;
  audit("Recorded death of " + p.name + " (Room " + p.room + ")");
  save();
}
function admit(data) {
  if (!data.name.trim()) return "Enter the patient's full name.";
  if (!(data.age >= 0 && data.age <= 120))
    return "Age must be between 0 and 120.";
  const free = freeRooms();
  if (!free.length)
    return (
      "All " +
      ROOMS +
      " rooms are occupied. Discharge a patient before admitting a new one."
    );
  if (!free.includes(+data.room)) return "Room " + data.room + " is not free.";
  const p = {
    id: "P" + S.nextId++,
    name: data.name.trim(),
    age: +data.age,
    sex: data.sex,
    room: +data.room,
    admitDay: S.day,
    status: "admitted",
    readings: {},
    visits: {},
  };
  S.patients.push(p);
  audit("Admitted " + p.name + " to Room " + p.room);
  save();
  return null;
}
function nextDay() {
  S.day++;
  audit("Day advanced to " + fmtDate(S.day));
  save();
}
