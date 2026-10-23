/* FeverWard – screens.js
   One function per screen. Each returns an HTML string. */

function Login() {
  const role = (r, title, desc) =>
    `<div class="role"><b>${title}</b><small>${desc}</small><div style="margin-top:12px;display:grid;gap:6px">${STAFF[r].map((s) => `<button class="btn" data-login="${r}:${s.id}">${esc(s.name)}</button>`).join("")}</div></div>`;
  return `<div class="login"><div class="card panel">
    <div class="brand"><span class="dot"></span>FeverWard</div>
    <h1>Sign in to today's ward</h1>
    <p class="sub">${fmtDate(S.day)} · ${active().length} of ${ROOMS} rooms occupied. Prototype: pick a staff account to sign in.</p>
    <div class="roles">
      ${role("nurse", "Nurse", "Record each patient's daily temperature.")}
      ${role("doctor", "Doctor", "Visit patients after their temperature is in, record treatment, clear discharges.")}
      ${role("admin", "Admin staff", "Admit patients to free rooms, complete discharges, watch outcomes.")}
    </div></div></div>`;
}

function Header() {
  const u = S.user;
  const tabs = {
    nurse: [
      ["rounds", "Temperature rounds"],
      ["patients", "All patients"],
    ],
    doctor: [
      ["rounds", "Doctor rounds"],
      ["patients", "All patients"],
      ["dashboard", "Outcomes"],
    ],
    admin: [
      ["beds", "Bed board"],
      ["discharges", "Discharges"],
      ["admit", "Admit patient"],
      ["dashboard", "Outcomes"],
      ["log", "Activity log"],
    ],
  }[u.role];
  return `<header class="top"><div class="wrap">
    <div class="brand"><span class="dot"></span>FeverWard</div>
    <span class="daychip">Today: ${fmtDate(S.day)}</span>
    <nav class="tabs">${tabs.map(([k, l]) => `<button class="${UI.tab === k ? "on" : ""}" data-tab="${k}">${l}</button>`).join("")}</nav>
    <span class="spacer"></span>
    <span class="who">Signed in as <b>${esc(u.name)}</b></span>
    <button class="btn sm ghost" data-act="logout">Sign out</button>
  </div></header>`;
}

function NurseRounds() {
  const list = active()
    .filter(matchQ)
    .sort((a, b) => !!tempToday(a) - !!tempToday(b) || a.room - b.room);
  const done = active().filter(tempToday).length,
    total = active().length;
  const shown = list.filter(
    (p) =>
      UI.filter === "all" ||
      (UI.filter === "todo" ? !tempToday(p) : !!tempToday(p)),
  );
  return `<div class="wrap">
    <h1>Temperature rounds</h1>
    <p class="sub">Every admitted patient needs one reading today. Patients still waiting are listed first.</p>
    <div class="grid kpis" style="margin-bottom:16px">
      <div class="kpi"><div class="v">${done}/${total}</div><div class="l">Readings taken today</div><div class="bar"><i style="width:${total ? (done / total) * 100 : 0}%"></i></div></div>
      <div class="kpi"><div class="v" style="color:var(--warn)">${total - done}</div><div class="l">Still to take</div></div>
      <div class="kpi"><div class="v" style="color:var(--fever)">${active().filter((p) => tempToday(p) && isFever(tempToday(p).t)).length}</div><div class="l">Febrile today (≥ ${FEVER_C.toFixed(1)}°C)</div></div>
    </div>
    <div class="toolbar"><input type="search" placeholder="Search by name, room or patient ID" value="${esc(UI.q)}" data-q>
      <div class="seg">${[
        ["all", "All"],
        ["todo", "To do"],
        ["done", "Done"],
      ]
        .map(
          ([k, l]) =>
            `<button class="${UI.filter === k ? "on" : ""}" data-filter="${k}">${l}</button>`,
        )
        .join("")}</div></div>
    <div class="tablewrap"><table><thead><tr><th>Room</th><th>Patient</th><th>Yesterday</th><th>Today</th><th>Taken by</th><th></th></tr></thead><tbody>
    ${
      shown
        .map((p) => {
          const t = tempToday(p),
            y = p.readings[S.day - 1],
            locked = !!visitToday(p);
          return `<tr class="${t ? "dim" : ""}"><td><b>${p.room}</b></td><td><a href="#" data-open="${p.id}">${esc(p.name)}</a><div class="hint">${p.id} · ${p.age}${p.sex} · day ${daysIn(p)}</div></td>
      <td>${y ? tempHTML(y) : '<span class="hint">—</span>'}</td><td>${tempHTML(t)}</td><td class="hint">${t ? esc(staffName(t.by)) + " " + t.at : ""}</td>
      <td style="text-align:right">${
        !t
          ? `<button class="btn primary sm" data-temp="${p.id}">Record temperature</button>`
          : locked
            ? '<span class="hint">Locked after doctor visit</span>'
            : t.by === S.user.id
              ? `<button class="btn sm" data-temp="${p.id}">Correct</button>`
              : '<span class="hint">Recorded</span>'
      }</td></tr>`;
        })
        .join("") ||
      `<tr><td colspan="6" class="empty">No patients match. ${UI.filter === "todo" ? "All readings for today are in." : ""}</td></tr>`
    }
    </tbody></table></div></div>`;
}

function DoctorRounds() {
  const act = active();
  const ready = act.filter(
    (p) => tempToday(p) && !visitToday(p) && p.status === "admitted",
  );
  const waiting = act.filter((p) => !tempToday(p) && !visitToday(p));
  const elig = act.filter((p) => eligible(p) && p.status === "admitted");
  const visited = act.filter(visitToday);
  const row = (p, mode) => {
    const t = tempToday(p);
    return `<tr><td><b>${p.room}</b></td><td><a href="#" data-open="${p.id}">${esc(p.name)}</a><div class="hint">${p.id} · ${p.age}${p.sex} · day ${daysIn(p)}</div></td>
    <td>${tempHTML(t)}</td><td>${streakHTML(p)}</td><td>${statusPill(p)}</td><td style="text-align:right;white-space:nowrap">
    ${mode === "ready" ? `<button class="btn primary sm" data-visit="${p.id}">Record visit</button>` : ""}
    ${mode === "wait" ? `<button class="btn sm" disabled title="Waiting for nurse">Waiting for temperature</button>` : ""}
    ${mode === "elig" ? `<button class="btn primary sm" data-clear="${p.id}">Clear for discharge</button>` : ""}
    ${mode === "done" ? `<span class="hint">Visited ${visitToday(p).at}</span>` : ""}</td></tr>`;
  };
  const table = (rows, mode, empty) =>
    `<div class="tablewrap"><table><thead><tr><th>Room</th><th>Patient</th><th>Today</th><th>Fever-free run</th><th>Status</th><th></th></tr></thead><tbody>${
      rows
        .filter(matchQ)
        .map((p) => row(p, mode))
        .join("") || `<tr><td colspan="6" class="empty">${empty}</td></tr>`
    }</tbody></table></div>`;
  return `<div class="wrap">
    <h1>Doctor rounds</h1>
    <p class="sub">Visit patients whose temperature is already in. Patients without a reading are held back so you don't take it yourself.</p>
    ${elig.length ? `<div class="alert good"><b>${elig.length} patient${elig.length > 1 ? "s have" : " has"} reached ${CURE_DAYS} fever-free days</b>Clear them for discharge so admin can free the room today.</div>` : ""}
    <div class="grid kpis" style="margin-bottom:16px">
      <div class="kpi"><div class="v" style="color:var(--primary)">${ready.length}</div><div class="l">Ready to visit</div></div>
      <div class="kpi"><div class="v" style="color:var(--warn)">${waiting.length}</div><div class="l">Waiting for temperature</div></div>
      <div class="kpi"><div class="v">${visited.length}/${act.length}</div><div class="l">Visited today</div><div class="bar"><i style="width:${act.length ? (visited.length / act.length) * 100 : 0}%"></i></div></div>
      <div class="kpi"><div class="v" style="color:var(--ok)">${elig.length}</div><div class="l">Eligible for discharge</div></div>
    </div>
    <div class="toolbar"><input type="search" placeholder="Search by name, room or patient ID" value="${esc(UI.q)}" data-q></div>
    ${elig.length ? `<h2>Eligible for discharge</h2>${table(elig, "elig", "")}<div style="height:18px"></div>` : ""}
    <h2>Ready to visit (${ready.length})</h2>${table(ready, "ready", "Nobody is waiting for a visit right now.")}
    <div style="height:18px"></div>
    <h2>Waiting for temperature (${waiting.length})</h2>${table(waiting, "wait", "All temperatures are in.")}
    <div style="height:18px"></div>
    <h2>Visited today (${visited.length})</h2>${table(visited, "done", "No visits recorded yet today.")}
  </div>`;
}

function Patients() {
  const list = S.patients
    .filter((p) =>
      UI.filter === "closed"
        ? p.status === "discharged" || p.status === "deceased"
        : p.status === "admitted" || p.status === "discharge_pending",
    )
    .filter(matchQ)
    .sort((a, b) => a.room - b.room);
  return `<div class="wrap"><h1>Patients</h1><p class="sub">Tap a name for full temperature history and visit notes.</p>
  <div class="toolbar"><input type="search" placeholder="Search by name, room or patient ID" value="${esc(UI.q)}" data-q>
  <div class="seg">${[
    ["all", "Admitted"],
    ["closed", "Closed cases"],
  ]
    .map(
      ([k, l]) =>
        `<button class="${(UI.filter === "closed" ? "closed" : "all") === k ? "on" : ""}" data-filter="${k}">${l}</button>`,
    )
    .join("")}</div></div>
  <div class="tablewrap"><table><thead><tr><th>Room</th><th>Patient</th><th>Admitted</th><th>Latest</th><th>Fever-free run</th><th>Missed readings</th><th>Status</th></tr></thead><tbody>
  ${
    list
      .map(
        (
          p,
        ) => `<tr><td><b>${p.room}</b></td><td><a href="#" data-open="${p.id}">${esc(p.name)}</a><div class="hint">${p.id} · ${p.age}${p.sex}</div></td><td class="hint">${fmtDate(p.admitDay)}</td>
   <td>${tempHTML(lastTemp(p))}</td><td>${streakHTML(p)}</td><td>${missedDays(p) ? `<span class="pill warn">${missedDays(p)}</span>` : '<span class="hint">0</span>'}</td><td>${statusPill(p)}</td></tr>`,
      )
      .join("") ||
    '<tr><td colspan="7" class="empty">No patients found.</td></tr>'
  }
  </tbody></table></div></div>`;
}

function Beds() {
  const map = {};
  active().forEach((p) => (map[p.room] = p));
  let cells = "";
  for (let i = 1; i <= ROOMS; i++) {
    const p = map[i];
    if (!p) {
      cells += `<button class="bed free" data-admitroom="${i}"><b>${i}</b>Free</button>`;
      continue;
    }
    const lt = lastTemp(p);
    const cls =
      p.status === "discharge_pending"
        ? "pend"
        : eligible(p)
          ? "ready"
          : lt && isFever(lt.t)
            ? "fever"
            : "ok";
    cells += `<button class="bed ${cls}" data-open="${p.id}" title="${esc(p.name)}"><b>${i}</b>${esc(p.name.split(" ")[0])}<div class="hint">${lt ? lt.t.toFixed(1) + "°" : "—"}</div></button>`;
  }
  const occ = active().length;
  return `<div class="wrap"><h1>Bed board</h1><p class="sub">${occ} of ${ROOMS} rooms occupied · ${ROOMS - occ} free. Tap a free room to admit, or an occupied room for details.</p>
  ${occ >= ROOMS ? `<div class="alert warn"><b>Centre is at full capacity</b>New admissions are blocked until a patient is discharged.</div>` : ""}
  <div class="panel"><div class="beds">${cells}</div>
  <div class="legend"><span style="--c:var(--fever)">Febrile</span><span style="--c:var(--ok)">Afebrile</span><span style="--c:var(--ok-soft)">Eligible, not yet cleared by doctor</span><span style="--c:var(--warn-soft)">Cleared, awaiting discharge</span><span style="--c:var(--line)">Free</span></div></div></div>`;
}

function Discharges() {
  const pend = active().filter((p) => p.status === "discharge_pending");
  const notCleared = active().filter(
    (p) => p.status === "admitted" && eligible(p),
  );
  return `<div class="wrap"><h1>Discharges</h1><p class="sub">Complete discharges the same day a doctor clears them so the room can be reused.</p>
  <h2>Cleared by doctor (${pend.length})</h2>
  <div class="tablewrap"><table><thead><tr><th>Room</th><th>Patient</th><th>Cleared by</th><th>Waiting</th><th></th></tr></thead><tbody>
  ${
    pend
      .map(
        (
          p,
        ) => `<tr><td><b>${p.room}</b></td><td><a href="#" data-open="${p.id}">${esc(p.name)}</a><div class="hint">${p.id}</div></td><td>${esc(staffName(p.recBy))}</td>
  <td>${S.day - p.recDay > 0 ? `<span class="pill fever">${S.day - p.recDay} day(s) overdue</span>` : '<span class="pill ok">Today</span>'}</td>
  <td style="text-align:right"><button class="btn primary sm" data-discharge="${p.id}">Complete discharge</button></td></tr>`,
      )
      .join("") ||
    '<tr><td colspan="5" class="empty">No discharges waiting. Cleared patients will appear here.</td></tr>'
  }
  </tbody></table></div>
  <div style="height:20px"></div>
  <h2>Eligible but not yet cleared (${notCleared.length})</h2>
  <p class="hint" style="margin-top:-6px">These patients meet the ${CURE_DAYS}-day rule. Only a doctor can clear them – remind the doctor on rounds.</p>
  <div class="tablewrap"><table><thead><tr><th>Room</th><th>Patient</th><th>Fever-free run</th><th>Days in centre</th></tr></thead><tbody>
  ${notCleared.map((p) => `<tr><td><b>${p.room}</b></td><td><a href="#" data-open="${p.id}">${esc(p.name)}</a></td><td>${streakHTML(p)}</td><td>${daysIn(p)}</td></tr>`).join("") || '<tr><td colspan="4" class="empty">Nobody is waiting on a doctor’s clearance.</td></tr>'}
  </tbody></table></div></div>`;
}

function Admit() {
  const free = freeRooms();
  const pre =
    UI.admitRoom && free.includes(UI.admitRoom) ? UI.admitRoom : free[0];
  return `<div class="wrap"><h1>Admit patient</h1><p class="sub">${free.length} room${free.length === 1 ? "" : "s"} free.</p>
  ${!free.length ? `<div class="alert bad"><b>No free rooms</b>All ${ROOMS} rooms are occupied. Complete a discharge first.</div>` : ""}
  <div class="panel" style="max-width:520px"><form data-form="admit" onsubmit="return false">
  <label class="field"><span>Full name</span><input name="name" required ${!free.length ? "disabled" : ""}></label>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
  <label class="field"><span>Age</span><input name="age" type="number" min="0" max="120" ${!free.length ? "disabled" : ""}></label>
  <label class="field"><span>Sex</span><select name="sex" ${!free.length ? "disabled" : ""}><option>F</option><option>M</option><option>Other</option></select></label>
  <label class="field"><span>Room</span><select name="room" ${!free.length ? "disabled" : ""}>${free.map((r) => `<option ${r === pre ? "selected" : ""}>${r}</option>`).join("")}</select></label></div>
  <div class="err" id="admitErr"></div>
  <div class="actions"><button class="btn primary" data-act="admit" ${!free.length ? "disabled" : ""}>Admit patient</button></div></form></div></div>`;
}

function Dashboard() {
  const o = outcomes(),
    act = active();
  const taken = act.filter(tempToday).length,
    visited = act.filter(visitToday).length;
  const overdue = act.filter(
    (p) => p.status === "discharge_pending" && S.day - p.recDay > 0,
  ).length;
  const notCleared = act.filter(
    (p) => p.status === "admitted" && eligible(p),
  ).length;
  const missedYesterday = act.filter(
    (p) => p.admitDay < S.day && !p.readings[S.day - 1],
  ).length;
  const over = o.mort > BENCH_MORTALITY;
  const near = !over && o.mort > BENCH_MORTALITY - 2;
  // mortality gauge
  const w = 560,
    pct = Math.min(o.mort, 30) / 30;
  const svg = `<svg class="chart" viewBox="0 0 ${w} 70" role="img" aria-label="Mortality ${o.mort.toFixed(1)} percent against 15 percent benchmark">
    <rect x="0" y="22" width="${w}" height="18" rx="9" fill="var(--grey-soft)"/>
    <rect x="0" y="22" width="${w * pct}" height="18" rx="9" fill="${over ? "var(--fever)" : "var(--ok)"}"/>
    <line x1="${w * 0.5}" x2="${w * 0.5}" y1="12" y2="50" stroke="var(--ink)" stroke-width="2" stroke-dasharray="4 3"/>
    <text x="${w * 0.5}" y="64" text-anchor="middle" font-size="12" fill="var(--muted)">15% benchmark</text>
    <text x="0" y="12" font-size="12" fill="var(--muted)">0%</text><text x="${w}" y="12" font-size="12" text-anchor="end" fill="var(--muted)">30%</text></svg>`;
  return `<div class="wrap"><h1>Outcomes & operations</h1><p class="sub">Treatment quality against the 85% success benchmark, and today's process health.</p>
  ${over ? `<div class="alert bad"><b>Mortality is above the 15% benchmark (${o.mort.toFixed(1)}%)</b>Review treatment protocols with the head doctor.</div>` : near ? `<div class="alert warn"><b>Mortality is close to the 15% benchmark (${o.mort.toFixed(1)}%)</b>Keep a close watch on febrile patients.</div>` : `<div class="alert good"><b>Success rate ${o.success.toFixed(1)}% – within the 85% benchmark</b>${o.tot} closed cases so far.</div>`}
  <div class="two"><div class="panel"><h2>Treatment quality</h2>
    <div class="grid kpis"><div class="kpi"><div class="v" style="color:var(--ok)">${o.success.toFixed(1)}%</div><div class="l">Success rate (target ≥ 85%)</div></div>
    <div class="kpi"><div class="v" style="color:${over ? "var(--fever)" : "var(--ink)"}">${o.mort.toFixed(1)}%</div><div class="l">Mortality (benchmark 15%)</div></div>
    <div class="kpi"><div class="v">${o.rec}</div><div class="l">Recovered & discharged</div></div><div class="kpi"><div class="v">${o.dec}</div><div class="l">Deaths</div></div></div>
    <div style="margin-top:14px">${svg}</div></div>
  <div class="panel"><h2>Today's process</h2>
    <div class="grid kpis"><div class="kpi"><div class="v">${act.length}/${ROOMS}</div><div class="l">Occupancy</div><div class="bar"><i style="width:${(act.length / ROOMS) * 100}%"></i></div></div>
    <div class="kpi"><div class="v">${taken}/${act.length}</div><div class="l">Temperatures taken</div><div class="bar"><i style="width:${act.length ? (taken / act.length) * 100 : 0}%"></i></div></div>
    <div class="kpi"><div class="v">${visited}/${act.length}</div><div class="l">Doctor visits</div><div class="bar"><i style="width:${act.length ? (visited / act.length) * 100 : 0}%"></i></div></div>
    <div class="kpi"><div class="v" style="color:${overdue || notCleared ? "var(--warn)" : "var(--ink)"}">${overdue + notCleared}</div><div class="l">Discharge delays (${notCleared} not cleared, ${overdue} overdue)</div></div>
    <div class="kpi"><div class="v" style="color:${missedYesterday ? "var(--fever)" : "var(--ink)"}">${missedYesterday}</div><div class="l">Readings missed yesterday</div></div></div></div></div>
  </div>`;
}

function Log() {
  return `<div class="wrap"><h1>Activity log</h1><p class="sub">Every reading, visit, admission and discharge, newest first.</p>
  <div class="tablewrap"><table><thead><tr><th>When</th><th>Who</th><th>What</th></tr></thead><tbody>
  ${S.log.map((l) => `<tr><td class="hint">${fmtDate(l.day)} ${l.at}</td><td>${esc(l.by)}</td><td>${esc(l.msg)}</td></tr>`).join("") || '<tr><td colspan="3" class="empty">Nothing logged yet. Actions taken in the app appear here.</td></tr>'}
  </tbody></table></div></div>`;
}
