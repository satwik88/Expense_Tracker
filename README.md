# Money Tracker

A personal expense and income tracker built as a native Android app. Track deposits and withdrawals, view spending breakdowns with pie charts, and keep everything private — all data lives on your device, no account required.

---

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Local-Only Data](#local-only-data)
- [Security & App Lock](#security--app-lock)
- [Setup & Development](#setup--development)
- [Building the Android APK](#building-the-android-apk)
- [Pre-built APK](#pre-built-apk)
- [Roadmap / Known Issues](#roadmap--known-issues)
- [License](#license)

---

## Features

### Tracking
- **Deposit & withdrawal tracking** — log income and expenses with amount, date, category, and optional note
- **Custom transaction dates** — backdate or schedule entries instead of being locked to "today"
- **Auto-categorization by keyword** — type something like `"swiggy order"` or `"pocket money from dad"` and the app suggests the matching category (e.g. "canteen" → Cafeteria, "hostel fee" → Housing); override with one tap
- **Categories** — Groceries, Housing, Lent, Campus, Tech, Fitness, Cafeteria, Stationery, and more, each color-coded

### Stats & Visualization
- **Pie chart breakdowns** — monthly, weekly, and yearly spending visualised as donut charts with a legend and percentage labels
- **Stats view with calendar** — a 42-day, Monday-start calendar grid; tap a day to see its transactions
- **Dynamic stats sync** — Credited / Spent / Total cards recalculate live based on the active Day / Week / Month timeframe, not lifetime totals
- **Minimalist calendar design** — flat grid (no card backgrounds), faded/muted padding days from adjacent months, and a black-and-white pill highlight for the selected date that adapts to light/dark mode

### History
- **Transaction history** — filter by category, sorted newest first
- **Swipe & tap to delete** — swipe an entry to reveal a delete action, or tap it; custom drag-detection ensures normal scrolling never misfires as a delete

### App Lock & Security
- **PIN lock** — set a 4-digit PIN to gate access to the app
- **Biometric unlock** — enable fingerprint / face unlock independently of the PIN
- **Fully optional** — manage PIN and biometric setup independently from the Profile section
- **Lockout recovery** — a "Reset App Lock" option so you're never permanently locked out

### Data Management
- **Export / Import Data** — back up all transactions to a JSON file and restore from it later, from the Profile section
- **Reset all data** — wipe everything from the device in one tap (with confirmation)
- **Fully offline** — no backend, no cloud sync, no internet permission needed

### Navigation & UI
- **Profile Drawer** — the header avatar morphs into a close (X) button and acts as the single toggle for the drawer
- **Black-and-white themed UI** — minimal monochrome design with subtle muted accents
- **Playful empty states** in place of plain "no data" messages

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Charts | Recharts |
| Native wrapper | Capacitor (Android) |
| Biometric auth | `capacitor-biometric-authentication` (falls back to WebAuthn in browser) |
| Icons | Heroicons / Morphicons (React) |
| Styling | Vanilla CSS with CSS custom properties |
| Local storage | Browser `localStorage` (native `@capacitor/preferences` migration in progress for reliability across updates) |

---

## Local-Only Data

All data is stored locally on the device. There are no user accounts, no server, and no cloud sync. This means:

- **Private by default** — nobody but you can see your transactions.
- **Per-device** — data is tied to the device and app install.
- **Offline only** — the app works completely without an internet connection.

> **Note:** Reinstalling the app (uninstall → reinstall) or changing the app's package name / signing key will reset local data. Always **update over** the existing install (never uninstall first) to preserve your data, and use **Export Data** before major updates as a safety net.

---

## Security & App Lock

App Lock is optional and fully configurable from the **Profile** section:

- Set, change, or remove your PIN independently of biometric unlock
- Enable fingerprint or face unlock, backed by native Android biometric APIs via Capacitor
- If you're ever locked out, use **Reset App Lock** to regain access without losing your transaction data

---

## Setup & Development

### Prerequisites
- Node.js 18+
- npm
- A working JDK (see [JDK requirement](#jdk-requirement) below — required for the Android build only)

### Install dependencies
```bash
npm install
```

### Run the dev server
```bash
npm run dev
```
This starts Vite on `http://localhost:5173`. Open it in a browser to preview the UI. Native-only features (biometric auth, etc.) are only available inside the Android build.

---

## Building the Android APK

```bash
# 1. Build the frontend bundle
npm run build

# 2. Sync the web assets into the Capacitor Android project
npx cap sync android

# 3. Build the debug APK
cd android
./gradlew assembleDebug
```

The resulting APK will be at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

For a guaranteed clean build (recommended after dependency changes):
```bash
cd android
./gradlew clean --no-build-cache
./gradlew assembleDebug --no-build-cache --rerun-tasks
```

### JDK requirement
The Android Gradle Plugin used by this project's Capacitor version requires a modern JDK (21 recommended). Point `JAVA_HOME` at a valid, complete JDK install before building:

```bash
# Windows (PowerShell)
$env:JAVA_HOME = "C:\Path\To\jdk-21"
$env:Path = "$env:JAVA_HOME\bin;" + $env:Path

# Linux / macOS
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk
```

> If Gradle throws `Error: could not find java.dll` (Windows) or fails to compile with `invalid source release: XX`, your `JAVA_HOME` is either unset, pointing at a broken/incomplete JDK install, or pointing at a JDK version older than what the Android Gradle Plugin requires. Verify with `java -version` before building, and confirm the plugin's JDK version requirements if you upgrade Capacitor or Android Gradle Plugin.

---

## Pre-built APK

If you don't want to build from source, check the [Releases](../../releases) page for a pre-built `.apk` you can install directly on your device.

> Debug builds are for personal use — data is stored locally on-device only, with no accounts or cloud sync.

---

## Roadmap / Known Issues

- Migrating local storage from `localStorage` to `@capacitor/preferences` for better durability across app updates and low-storage conditions
- Fingerprint enrollment has occasionally regressed after fresh `npm install`s wipe a `node_modules`-level patch to the biometric plugin's JS bridge — a `patch-package`-based fix is planned to make this permanent

---

## License

Personal project — no license specified. All rights reserved by the author.
