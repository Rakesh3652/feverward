/* FeverWard – app.js
   Main render() and all click/keyboard handling. Starts the app. */

function render() {
  const app = $("#app");
  const focusQ =
    document.activeElement &&
    document.activeElement.hasAttribute &&
    document.activeElement.hasAttribute("data-q");
  if (!S.user) {
    app.innerHTML = Login() + Demo();
    bindLogin();
    return;
  }
  const views = {
    rounds: S.user.role === "nurse" ? NurseRounds : DoctorRounds,
    patients: Patients,
    beds: Beds,
    discharges: Discharges,
    admit: Admit,
    dashboard: Dashboard,
    log: Log,
  };
  app.innerHTML =
    Header() +
    (views[UI.tab] || Patients)() +
    Demo() +
    Modal() +
    (UI.toast ? `<div class="toast" role="status">${esc(UI.toast)}</div>` : "");
  if (focusQ) {
    const q = $("[data-q]");
    if (q) {
      q.focus();
      q.setSelectionRange(q.value.length, q.value.length);
    }
  }
  if (UI.modal?.type === "temp") {
    const i = $("#tIn");
    i && i.focus();
    i && i.addEventListener("input", tempPreview);
  }
}
function Demo() {
  return `<div class="demo"><div class="wrap"><b>Prototype controls</b>
  <span>Simulate the next calendar day to see streaks, missed readings and discharge timing in action.</span><span class="spacer"></span>
  <button class="btn sm" data-act="nextday">Advance to next day</button><button class="btn sm ghost" data-act="reset">Reset demo data</button></div></div>`;
}
function tempPreview() {
  const v = parseFloat($("#tIn").value),
    w = $("#tWarn");
  if (isNaN(v)) {
    w.innerHTML = "";
    return;
  }
  if (v < MIN_T || v > MAX_T)
    w.innerHTML = `<div class="alert bad" style="margin-top:10px"><b>Out of range</b>Readings must be between ${MIN_T} and ${MAX_T}°C. Check the thermometer.</div>`;
  else if (v < 35 || v >= 41.5)
    w.innerHTML = `<div class="alert warn" style="margin-top:10px"><b>Unusual reading</b>Re-measure before saving. If confirmed, inform the doctor immediately.</div>`;
  else if (isFever(v))
    w.innerHTML = `<div class="alert bad" style="margin-top:10px"><b>Fever</b>This resets the patient's fever-free run to 0.</div>`;
  else
    w.innerHTML = `<div class="alert good" style="margin-top:10px"><b>No fever</b></div>`;
}
function bindLogin() {
  document.querySelectorAll("[data-login]").forEach(
    (b) =>
      (b.onclick = () => {
        const [r, id] = b.dataset.login.split(":");
        const s = STAFF[r].find((x) => x.id === id);
        S.user = { role: r, id, name: s.name };
        save();
        UI.tab = { nurse: "rounds", doctor: "rounds", admin: "beds" }[r];
        UI.filter = "all";
        UI.q = "";
        render();
      }),
  );
  bindDemo();
}
function bindDemo() {}
function ask(title, text, yes, fn, danger) {
  UI.modal = {
    type: "confirm",
    title,
    text,
    yes,
    fn,
    danger,
    pid: UI.modal?.pid,
  };
  render();
}

document.addEventListener("click", (e) => {
  const t = e.target.closest("button,a,[data-scrim]");
  if (!t) return;
  if (t.hasAttribute("data-scrim") && e.target === t) {
    UI.modal = null;
    render();
    return;
  }
  const d = t.dataset;
  if (t.tagName === "A") e.preventDefault();
  if (d.tab) {
    UI.tab = d.tab;
    UI.q = "";
    UI.filter = "all";
    render();
    return;
  }
  if (d.filter) {
    UI.filter = d.filter;
    render();
    return;
  }
  if (d.open) {
    UI.modal = { type: "patient", pid: d.open };
    render();
    return;
  }
  if (d.temp) {
    UI.modal = { type: "temp", pid: d.temp };
    render();
    return;
  }
  if (d.visit) {
    UI.modal = { type: "visit", pid: d.visit };
    render();
    return;
  }
  if (d.admitroom) {
    if (S.user?.role !== "admin") {
      toast("Only admin staff can admit patients.");
      return;
    }
    UI.tab = "admit";
    UI.admitRoom = +d.admitroom;
    render();
    return;
  }
  if (d.clear) {
    const p = S.patients.find((x) => x.id === d.clear);
    ask(
      "Clear " + p.name + " for discharge?",
      `${p.name} has ${streak(p)} consecutive fever-free days. Admin staff will be notified to complete the discharge.`,
      "Clear for discharge",
      () => {
        const er = recommendDischarge(p.id);
        UI.modal = null;
        toast(er || "Cleared – admin has been notified");
      },
    );
    return;
  }
  if (d.uncleard) {
    cancelDischarge(d.uncleard);
    UI.modal = null;
    toast("Clearance withdrawn");
    return;
  }
  if (d.discharge) {
    const p = S.patients.find((x) => x.id === d.discharge);
    ask(
      "Complete discharge for " + p.name + "?",
      `Room ${p.room} will become free for a new admission.`,
      "Complete discharge",
      () => {
        const er = confirmDischarge(p.id);
        UI.modal = null;
        toast(er || "Discharged – Room " + p.room + " is free");
      },
    );
    return;
  }
  switch (d.act) {
    case "logout":
      S.user = null;
      save();
      UI.modal = null;
      render();
      break;
    case "close":
      UI.modal = null;
      render();
      break;
    case "confirmYes":
      UI.modal.fn();
      break;
    case "nextday":
      ask(
        "Advance to the next day?",
        "All of today's readings and visits are closed. Any patient without a reading today will be marked as missed.",
        "Advance day",
        () => {
          nextDay();
          UI.modal = null;
          toast("It's now " + fmtDate(S.day));
        },
      );
      break;
    case "reset":
      ask(
        "Reset demo data?",
        "All changes made in this prototype will be erased.",
        "Reset",
        () => {
          const u = S.user;
          S = seed();
          S.user = u;
          save();
          UI.modal = null;
          toast("Demo data reset");
        },
        true,
      );
      break;
    case "saveTemp": {
      const v = parseFloat($("#tIn").value),
        err = $("#tErr");
      if (isNaN(v)) {
        err.textContent = "Enter a temperature.";
        return;
      }
      if (v < MIN_T || v > MAX_T) {
        err.textContent = `Enter a value between ${MIN_T} and ${MAX_T}°C.`;
        return;
      }
      if (
        Math.round(v * 10) !== v * 10 &&
        String(v).split(".")[1]?.length > 1
      ) {
        err.textContent = "Use one decimal place, e.g. 38.4";
        return;
      }
      const pid = UI.modal.pid;
      const go = () => {
        const er = recordTemp(pid, v);
        if (er) {
          UI.modal = { type: "temp", pid };
          render();
          $("#tErr").textContent = er;
          return;
        }
        UI.modal = null;
        toast("Saved " + v.toFixed(1) + "°C" + (isFever(v) ? " – fever" : ""));
      };
      if (v < 35 || v >= 41.5) {
        ask(
          "Save unusual reading?",
          `${v.toFixed(1)}°C is outside the usual range. Confirm you re-measured and inform the doctor.`,
          "Save anyway",
          go,
          true,
        );
      } else go();
      break;
    }
    case "saveVisit": {
      const notes = $("#vNotes").value.trim(),
        tx = $("#vTx").value.trim();
      if (!notes) {
        $("#vErr").textContent = "Add a short clinical note before saving.";
        return;
      }
      const er = recordVisit(UI.modal.pid, notes, tx);
      if (er) {
        $("#vErr").textContent = er;
        return;
      }
      const p = S.patients.find((x) => x.id === UI.modal.pid);
      UI.modal = null;
      toast(
        eligible(p)
          ? "Visit saved – patient is eligible for discharge"
          : "Visit saved",
      );
      break;
    }
    case "death": {
      const p = S.patients.find((x) => x.id === UI.modal.pid);
      ask(
        "Record death of " + p.name + "?",
        "This closes the case, frees Room " +
          p.room +
          " and counts toward the mortality rate. This can’t be undone in the app.",
        "Record death",
        () => {
          recordDeath(p.id);
          UI.modal = null;
          toast("Case closed");
        },
        true,
      );
      break;
    }
    case "admit": {
      const f = $('[data-form="admit"]').elements;
      const er = admit({
        name: f.namedItem("name").value,
        age: f.namedItem("age").value === "" ? NaN : +f.namedItem("age").value,
        sex: f.namedItem("sex").value,
        room: f.namedItem("room").value,
      });
      if (er) {
        $("#admitErr").textContent = er;
        return;
      }
      UI.admitRoom = null;
      UI.tab = "beds";
      toast("Patient admitted");
      break;
    }
  }
});
document.addEventListener("input", (e) => {
  if (e.target.hasAttribute("data-q")) {
    UI.q = e.target.value;
    render();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && UI.modal) {
    UI.modal = null;
    render();
  }
  if (e.key === "Enter" && UI.modal?.type === "temp") {
    e.preventDefault();
    $('[data-act="saveTemp"]').click();
  }
});

load();
if (S.user)
  UI.tab = { nurse: "rounds", doctor: "rounds", admin: "beds" }[S.user.role];
render();
