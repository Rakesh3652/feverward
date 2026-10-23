# FeverWard – Quarantine Centre Tracker

Prototype app for a 74-bed virus quarantine and treatment centre. Nurses record daily temperatures, doctors visit only after the temperature is in, and admin completes discharges after a patient has 3 fever-free days. An outcomes page tracks mortality against the 15% benchmark.

## Folder structure

```
feverward-project/
├── index.html          Page shell, loads the CSS and JS files
├── vercel.json         Vercel settings
├── README.md
├── assets/
│   └── favicon.svg     Thermometer icon
├── css/
│   └── styles.css      All styling (light + dark mode)
└── js/
    ├── config.js       Rules: fever 38.0 °C, 3 cure days, 74 rooms, 15% benchmark, staff
    ├── data.js         State, sample data (seed), load/save with localStorage
    ├── logic.js        Streak, eligibility, free rooms, outcomes, audit log
    ├── actions.js      recordTemp, recordVisit, recommendDischarge, confirmDischarge, admit, recordDeath, nextDay
    ├── helpers.js      Badges, toast, escaping, search
    ├── screens.js      Login, Header, NurseRounds, DoctorRounds, Patients, Beds, Discharges, Admit, Dashboard, Log
    ├── modals.js       Temperature, visit, confirm and patient popups; history table; SVG chart
    └── app.js          render() and click/keyboard handling; starts the app
```


## Run locally

Open `index.html` in a browser, or run a small server:

```
npx serve .
```

## Users

- **Nurse** – records one temperature per patient per day.
- **Doctor** – visits patients after the temperature is in, clears patients for discharge, records deaths.
- **Admin** – admits patients to free rooms, completes discharges, views outcomes and the activity log.
