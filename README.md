# FB UID - X (v2.0.0)

Facebook UID list manager mobile app — built with Expo + React Native.

## Features

- 📂 Import UIDs from `.txt` (or any text file) or paste directly
- 🔍 Live status check (Live / Dead / Unknown) for every UID
- 👤 Auto-fetches profile name, username, and avatar from Facebook
- 🔁 One-tap refresh for individual or all unknown UIDs
- 🔎 Search and filter (All / Live / Dead / Unknown / Visited / Unvisited)
- 📋 Copy UID, password, or both with a single tap
- 💾 Export the full list to a shareable `.txt` file
- 🧹 Bulk actions: remove visited, remove dead, reset visited marks
- 💽 Persists everything offline using AsyncStorage
- 🌗 Light & dark theme support

## Local Development

```bash
npm install --legacy-peer-deps
npx expo start
```

Open the QR code with the Expo Go app on Android or iOS, or press `a` for Android emulator / `i` for iOS simulator.

## Build APK

The repo includes a GitHub Actions workflow at `.github/workflows/build-apk.yml` that builds the APK using EAS on every push to `main`.

### Requirements

1. Expo account: <https://expo.dev>
2. Add `EXPO_TOKEN` to **GitHub → Settings → Secrets and variables → Actions**
3. Push to `main` (or run the workflow manually from the Actions tab)

### Manual local build

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

The completed APK shows up at <https://expo.dev/accounts/{your-username}/projects/fbuidx/builds>.

## Project structure

```
app/                Screens (expo-router file-based)
  (tabs)/           Tab screens
  list.tsx          UID list screen
  _layout.tsx       Root layout
components/         Reusable UI components
context/            UIDContext (state + Facebook fetch logic)
constants/          Color palette & shared constants
hooks/              Custom hooks (useColors, etc.)
assets/             App icon and images
```

## License

Private — for personal use.
