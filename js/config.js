/* FeverWard – config.js
   Clinical rules, capacity and demo staff accounts. Change rules here only. */

const ROOMS = 74;
const FEVER_C = 38.0; // >= 38.0 °C counts as fever
const CURE_DAYS = 3; // 3 consecutive reported fever-free days
const BENCH_MORTALITY = 15; // %
const MIN_T = 34.0,
  MAX_T = 43.0; // hard input limits
const BASE_DATE = new Date(2026, 9, 23); // day 0
const STORE_KEY = "feverward.v1";
const STAFF = {
  nurse: [
    { id: "n1", name: "Nurse Asha Patil" },
    { id: "n2", name: "Nurse Kiran Rao" },
  ],
  doctor: [
    { id: "d1", name: "Dr. Meera Iyer (Head)", head: true },
    { id: "d2", name: "Dr. Arjun Shah" },
  ],
  admin: [{ id: "a1", name: "Ravi Kulkarni (Admin)" }],
};
