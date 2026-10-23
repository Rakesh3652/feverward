/* FeverWard – modals.js
   Popups (temperature, visit, confirm, patient detail), history table and chart. */

function Modal() {
  const m = UI.modal;
  if (!m) return "";
  const p = S.patients.find((x) => x.id === m.pid);
  let body = "";
  if (m.type === "temp") {
    const ex = tempToday(p);
    body = `<h2>${ex ? "Correct" : "Record"} temperature</h2><p class="hint">Room ${p.room} · ${esc(p.name)} · ${fmtDate(S.day)}</p>
    <label class="field"><span>Temperature (°C)</span><input class="big" id="tIn" type="number" inputmode="decimal" step="0.1" min="${MIN_T}" max="${MAX_T}" value="${ex ? ex.t : ""}" placeholder="37.0" autofocus></label>
    <div class="hint">Fever is ${FEVER_C.toFixed(1)}°C or higher. Allowed range ${MIN_T}–${MAX_T}°C.</div>
    <div id="tWarn"></div><div class="err" id="tErr"></div>
    <div class="actions"><button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="saveTemp">Save reading</button></div>`;
  } else if (m.type === "visit") {
    const t = tempToday(p);
    body = `<h2>Record visit</h2><p class="hint">Room ${p.room} · ${esc(p.name)} · today ${t ? t.t.toFixed(1) + "°C" : "—"} · fever-free run ${streak(p)}/${CURE_DAYS}</p>
    ${Hist(p)}
    <label class="field"><span>Clinical notes</span><textarea id="vNotes" rows="3" placeholder="Observations"></textarea></label>
    <label class="field"><span>Treatment given / plan</span><input id="vTx" placeholder="e.g. Paracetamol 500 mg, IV fluids"></label>
    <div class="err" id="vErr"></div>
    <div class="actions"><button class="btn danger" data-act="death">Record death…</button><span class="spacer"></span><button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="saveVisit">Save visit</button></div>`;
  } else if (m.type === "confirm") {
    body = `<h2>${m.title}</h2><p>${m.text}</p><div class="actions"><button class="btn" data-act="close">Cancel</button><button class="btn ${m.danger ? "danger" : "primary"}" data-act="confirmYes">${m.yes}</button></div>`;
  } else if (m.type === "patient") {
    const r = S.user.role;
    body = `<h2>${esc(p.name)}</h2><p class="hint">${p.id} · ${p.age}${p.sex} · Room ${p.room} · admitted ${fmtDate(p.admitDay)} · ${statusPill(p)}</p>
    <p>Fever-free run: ${streakHTML(p)} ${missedDays(p) ? ` · <span class="pill warn">${missedDays(p)} missed reading(s)</span>` : ""}</p>
    ${Chart(p)}${Hist(p)}
    <div class="actions">
      ${r === "nurse" && !tempToday(p) && p.status !== "discharged" && p.status !== "deceased" ? `<button class="btn primary" data-temp="${p.id}">Record temperature</button>` : ""}
      ${r === "doctor" && p.status === "admitted" && tempToday(p) && !visitToday(p) ? `<button class="btn primary" data-visit="${p.id}">Record visit</button>` : ""}
      ${r === "doctor" && p.status === "admitted" && eligible(p) ? `<button class="btn primary" data-clear="${p.id}">Clear for discharge</button>` : ""}
      ${r === "doctor" && p.status === "discharge_pending" ? `<button class="btn" data-uncleard="${p.id}">Withdraw clearance</button>` : ""}
      ${r === "admin" && p.status === "discharge_pending" ? `<button class="btn primary" data-discharge="${p.id}">Complete discharge</button>` : ""}
      <button class="btn" data-act="close">Close</button></div>`;
  }
  return `<div class="scrim" data-scrim><div class="modal" role="dialog" aria-modal="true">${body}</div></div>`;
}
function Hist(p) {
  const rows = [];
  for (let d = S.day; d >= p.admitDay; d--) {
    const r = p.readings[d],
      v = p.visits[d];
    rows.push(
      `<tr><td>${fmtDate(d)}</td><td>${r ? tempHTML(r) : '<span class="pill warn">Missed</span>'}</td><td class="hint">${v ? esc(staffName(v.by)) + ": " + esc(v.notes || "") + (v.treatment ? " · " + esc(v.treatment) : "") : "—"}</td></tr>`,
    );
  }
  return `<div class="tablewrap hist" style="max-height:220px;overflow:auto"><table><thead><tr><th>Day</th><th>Temp</th><th>Doctor visit</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}
function Chart(p) {
  const days = [];
  for (let d = p.admitDay; d <= S.day; d++) days.push(d);
  const W = 520,
    H = 150,
    pad = 28,
    lo = 35.5,
    hi = 41;
  const x = (i) =>
    pad + (days.length < 2 ? 0 : (i * (W - pad * 2)) / (days.length - 1));
  const y = (t) => H - pad - ((t - lo) / (hi - lo)) * (H - pad * 2);
  let path = "",
    dots = "";
  days.forEach((d, i) => {
    const r = p.readings[d];
    if (!r) return;
    path += (path ? "L" : "M") + x(i) + " " + y(r.t) + " ";
    dots += `<circle cx="${x(i)}" cy="${y(r.t)}" r="4" fill="${isFever(r.t) ? "var(--fever)" : "var(--ok)"}"/>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Temperature trend">
    <rect x="${pad}" y="${y(hi)}" width="${W - pad * 2}" height="${y(FEVER_C) - y(hi)}" fill="var(--fever-soft)"/>
    <line x1="${pad}" x2="${W - pad}" y1="${y(FEVER_C)}" y2="${y(FEVER_C)}" stroke="var(--fever)" stroke-dasharray="4 3"/>
    <text x="${W - pad}" y="${y(FEVER_C) - 4}" font-size="11" text-anchor="end" fill="var(--fever)">Fever ${FEVER_C.toFixed(1)}°C</text>
    <path d="${path}" fill="none" stroke="var(--ink)" stroke-width="2"/>${dots}
    <text x="${pad}" y="${H - 8}" font-size="11" fill="var(--muted)">${fmtDate(p.admitDay)}</text><text x="${W - pad}" y="${H - 8}" font-size="11" text-anchor="end" fill="var(--muted)">${fmtDate(S.day)}</text></svg>`;
}
