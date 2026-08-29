# Money Tracker

A personal expense and income tracker built as a native Android app. Track deposits and withdrawals, view spending breakdowns with pie charts, and keep everything private — all data lives on your device, no account required.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Local-Only Data](#local-only-data)
- [Setup & Development](#setup--development)
- [Building the Android APK](#building-the-android-apk)
- [Pre-built APK](#pre-built-apk)

---

## Features

- **Deposit & withdrawal tracking** — log income and expenses with amount, date, category, and optional note
- **Auto-categorization by keyword** — type something like `"swiggy order"` or `"pocket money from dad"` and the app suggests the matching category; override with one tap
- **Pie chart breakdowns** — monthly, weekly, and yearly spending visualised as donut charts with a legend and percentage labels
- **Stats view with calendar** — navigate day / week / month; tap a calendar day to see its transactions
- **Transaction history** — filter by category, sorted newest first, with delete on each entry
- **App lock** — set a 4-digit PIN and/or enable fingerprint / face unlock (biometric) to gate access to the app
- **Reset all data** — wipe everything from the device in one tap (with confirmation)
- **Fully offline** — no backend, no cloud sync, no internet permission needed
- **Black-and-white themed UI** — minimal monochrome design with subtle muted accents

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Charts | Recharts |
| Native wrapper | Capacitor 8 (Android) |
| Biometric auth | `capacitor-biometric-authentication` (falls back to WebAuthn in browser) |
| Icons | Heroicons (React) |
| Styling | Vanilla CSS with CSS custom properties |

---

## Local-Only Data

All data is stored in the device's `localStorage`. There are no user accounts, no server, and no cloud sync. This means:

- **Private by default** — nobody but you can see your transactions.
- **Per-device** — data is tied to the device and app install. Switching phones or reinstalling the app will start fresh unless you manually back up the data.
- **Offline only** — the app works completely without an internet connection.

---

## Setup & Development

### Prerequisites

- Node.js 18+
- npm
- JDK 21 (required for Android build — see below)

### Install dependencies

```bash
npm install
```

### Run the dev server

```bash
npm run dev
```

This starts Vite on `http://localhost:5173`. Open it in a browser to preview the UI. The Capacitor native features (biometric auth, etc.) are only available inside the Android build.

---

## Building the Android APK

```bash
# 1. Build the frontend bundle
npm run build

# 2. Sync the web assets into the Capacitor Android project
npx cap sync android

# 3. Build the debug APK
cd client/android
./gradlew assembleDebug
```

The resulting APK will be at:

```
client/android/app/build/outputs/apk/debug/app-debug.apk
```

### JDK 21 requirement

The Android Gradle Plugin used by Capacitor 8 requires JDK 21. Set it before building:

```bash
export JAVA_HOME=$JAVA_HOME_21_X64   # Windows (SDK Manager path)
# or
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk   # Linux / macOS
```

Then run `./gradlew assembleDebug` as shown above.

---

## Pre-built APK

If you don't want to build from source, check the [Releases](../../releases) page for a pre-built `.apk` you can install directly on your device.
