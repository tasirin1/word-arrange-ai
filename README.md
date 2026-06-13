# 🧩 Word Arrange AI

Aplikasi **latihan susun kata bahasa Inggris** berbasis AI untuk Android. Cocok untuk belajar _English sentence structure_ dengan cara yang interaktif dan menyenangkan.

![GitHub](https://img.shields.io/badge/platform-Android-brightgreen)
![React Native](https://img.shields.io/badge/React%20Native-19-61DAFB)
![Expo](https://img.shields.io/badge/Expo-56-000020)

## ✨ Fitur

- **🧠 AI-Powered Sentences** — Generate kalimat otomatis pakai OpenAI API (GPT-4o-mini). Tanpa API Key pun tetap bisa pakai 100+ kalimat bawaan.
- **📊 3 Level Kesulitan** — Beginner (5–8 kata), Intermediate (8–14 kata), Advanced (12–20 kata).
- **💡 AI Hints** — Dapat petunjuk cerdas saat jawaban salah (perlu API Key).
- **📈 Statistik & Streak** — Pantau progress: games played, correct answers, current streak, total score.
- **🎉 Animasi & Confetti** — Efek seru setiap kali berhasil menyusun kata dengan benar.
- **🔒 Privacy First** — Semua data disimpan lokal di perangkat. Tidak ada data yang dikirim ke server kecuali API call ke OpenAI (jika pakai API Key).

## 📸 Screenshots

| Home | Gameplay | Correct |
|------|----------|---------|
| ![Home](assets/splash-icon.png) | _Tampilan game_ | _Animasi confetti_ |

## 🚀 Cara Install APK

### Opsi 1: Download dari GitHub Actions (Mudah)

1. Buka [GitHub Actions](https://github.com/tasirin1/word-arrange-ai/actions)
2. Pilih workflow **"Build Android APK"**
3. Klik **"Run workflow"** → pilih profile `preview` → klik **"Run"**
4. Tunggu build selesai (≈10 menit)
5. Download APK dari **"Artifacts"** → `word-arrange-ai-apk`
6. Install APK di Android kamu

### Opsi 2: Build Lokal

```bash
npm install
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

### Opsi 3: EAS Build (Expo Cloud)

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

## 🔑 Setup OpenAI API Key (Opsional)

Tanpa API Key, aplikasi tetap bisa dipakai dengan 100+ kalimat bawaan.

1. Daftar di [platform.openai.com](https://platform.openai.com)
2. Buat API Key di dashboard
3. Masukkan API Key di halaman **Settings** aplikasi

## 🛠️ Tech Stack

- **Framework**: React Native 0.85 + Expo 56
- **Navigation**: React Navigation (Native Stack)
- **AI**: OpenAI GPT-4o-mini
- **Storage**: AsyncStorage
- **Animations**: Reanimated 3
- **Build**: EAS Build + GitHub Actions

## 📁 Struktur Proyek

```
word-order-game/
├── App.js                    # Root component & navigasi
├── app.json                  # Expo config
├── eas.json                  # EAS Build config
├── babel.config.js           # Babel + Reanimated plugin
├── screens/
│   ├── HomeScreen.js         # Home, stats, difficulty, settings
│   └── GameScreen.js         # Gameplay: arrange words, check, hints
├── components/
│   └── WordChip.js           # Tombol kata yang bisa di-tap
├── services/
│   ├── aiService.js          # OpenAI API + fallback sentences
│   └── storageService.js     # AsyncStorage untuk API key & stats
├── assets/                   # Ikon & splash screen
└── .github/workflows/
    └── build-apk.yml         # GitHub Actions: build APK otomatis
```

## 📝 Lisensi

MIT — silakan gunakan, modifikasi, dan sebarkan.

## 👨‍💻 Author

Dibuat oleh [@tasirin1](https://github.com/tasirin1) untuk latihan bahasa Inggris.
