/* FeverWard – data.js
   App state, sample data (seed) and saving/loading from localStorage. */

let S = null; // persisted
let UI = { tab: null, q: "", filter: "all", modal: null, toast: null };

function rnd(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
function seed() {
  const r = rnd(42);
  const first = [
    "Aarav",
    "Vivaan",
    "Diya",
    "Ishaan",
    "Ananya",
    "Kabir",
    "Meera",
    "Rohan",
    "Saanvi",
    "Arjun",
    "Kavya",
    "Neha",
    "Rahul",
    "Priya",
    "Aditya",
    "Sneha",
    "Vikram",
    "Pooja",
    "Karan",
    "Riya",
    "Manish",
    "Tanvi",
    "Omkar",
    "Isha",
    "Sahil",
    "Nisha",
    "Yash",
    "Aditi",
    "Varun",
    "Shruti",
    "Nikhil",
    "Gauri",
    "Harsh",
    "Lata",
    "Deepak",
    "Swara",
    "Akash",
    "Mitali",
  ];
  const last = [
    "Sharma",
    "Patel",
    "Iyer",
    "Khan",
    "Desai",
    "Nair",
    "Joshi",
    "Gupta",
    "Reddy",
    "Mehta",
    "Kulkarni",
    "Singh",
    "Das",
    "Pillai",
    "Bose",
    "Jain",
    "Pawar",
    "Shetty",
  ];
  const patients = [];
  for (let i = 0; i < ROOMS; i++) {
    const admitDay = -Math.floor(r() * 11) - 1; // admitted 1..11 days ago
    const feverDays = Math.floor(r() * 9) + 3; // days with fever from admission
    const p = {
      id: "P" + String(1001 + i),
      name:
        first[Math.floor(r() * first.length)] +
        " " +
        last[Math.floor(r() * last.length)],
      age: 18 + Math.floor(r() * 62),
      sex: r() < 0.5 ? "F" : "M",
      room: i + 1,
      admitDay,
      status: "admitted",
      readings: {},
      visits: {},
      log: [],
    };
    for (let d = admitDay; d < 0; d++) {
      // occasionally missed reading in the past (the problem we are solving)
      if (r() < 0.04 && d !== admitDay) continue;
      const fever = d - admitDay < feverDays;
      const t = fever ? 38.1 + r() * 1.8 : 36.4 + r() * 1.2;
      p.readings[d] = {
        t: +t.toFixed(1),
        by: "n" + (1 + Math.floor(r() * 2)),
        at: "08:" + String(10 + Math.floor(r() * 40)),
      };
      p.visits[d] = {
        by: "d" + (1 + Math.floor(r() * 2)),
        notes: fever
          ? "Fever persists, continue antipyretics + fluids"
          : "Afebrile, stable",
        at: "11:" + String(10 + Math.floor(r() * 40)),
      };
    }
    patients.push(p);
  }
  // Today (day 0): some temps taken already, a few visits done
  patients.forEach((p, i) => {
    if (i % 4 === 0) {
      const prev = p.readings[-1];
      const fever = prev ? prev.t >= FEVER_C && r() < 0.85 : true;
      p.readings[0] = {
        t: +(fever ? 38.2 + r() * 1.5 : 36.5 + r() * 1).toFixed(1),
        by: "n1",
        at: "07:45",
      };
      if (i % 8 === 0)
        p.visits[0] = { by: "d1", notes: "Reviewed", at: "09:30" };
    }
  });
  return {
    day: 0,
    patients,
    closed: { recovered: 168, deceased: 27, stays: [] },
    log: [],
    user: null,
    nextId: 1001 + ROOMS,
  };
}
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      S = JSON.parse(raw);
      return;
    }
  } catch (e) {}
  S = seed();
}
function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(S));
  } catch (e) {}
}
