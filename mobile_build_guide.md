# 📱 Panduan Build APK Luxtrace Mobile

Aplikasi mobile Luxtrace menggunakan library native **`react-native-nfc-manager`** untuk berinteraksi dengan chip NFC fisik pada tas/barang mewah. Karena modul ini menggunakan kode native, aplikasi **tidak dapat berjalan secara penuh di dalam aplikasi Expo Go standar**. 

Untuk dapat menggunakan fitur pemindaian NFC secara penuh, Anda harus membuat **Standalone APK** (Development Build atau Release Build).

Berikut adalah 2 metode untuk melakukan build APK:

---

## ☁️ Metode 1: EAS Build (Sangat Direkomendasikan & Paling Mudah)
EAS (Expo Application Services) adalah layanan cloud milik Expo untuk melakukan build APK secara online tanpa memerlukan instalasi Android Studio, SDK, Java, atau komputer berspesifikasi tinggi di lokal Anda.

### Langkah-langkah:

1. **Instal EAS CLI secara global:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login ke akun Expo Anda (buat akun gratis di [expo.dev](https://expo.dev) jika belum ada):**
   ```bash
   eas login
   ```

3. **Inisialisasi Proyek EAS (jalankan di folder `luxtrace-mobile`):**
   ```bash
   cd luxtrace-mobile
   eas project:init
   ```

4. **Buat file konfigurasi `eas.json`:**
   Buat file bernama `eas.json` di dalam folder `luxtrace-mobile` dengan konfigurasi di bawah ini untuk menghasilkan file `.apk` (secara default Expo menghasilkan format `.aab` untuk Google Play Store):
   
   ```json
   {
     "cli": {
       "version": ">= 10.0.0"
     },
     "build": {
       "development": {
         "developmentClient": true,
         "distribution": "internal"
       },
       "preview": {
         "distribution": "internal",
         "android": {
           "buildType": "apk"
         }
       },
       "production": {}
     },
     "submit": {
       "production": {}
     }
   }
   ```

5. **Mulai Proses Build APK:**
   Jalankan perintah berikut untuk mengirimkan kode ke server Expo untuk di-build menjadi file `.apk` siap pakai:
   ```bash
   eas build -p android --profile preview
   ```
   *   Pilih opsi default untuk membuat Keystore baru jika ditanya.
   *   Tunggu proses antrean di cloud Expo selesai (biasanya memakan waktu 5-10 menit).
   *   Setelah selesai, CLI akan menampilkan **Link Download** dan **QR Code** untuk langsung mengunduh file `.apk` tersebut ke ponsel Android Anda.

---

## 💻 Metode 2: Local Build (Menggunakan Komputer Sendiri)
Jika Anda memiliki Android SDK dan Java yang sudah terinstal di komputer lokal Anda, Anda bisa mem-build APK secara offline.

### Prasyarat:
*   Java Development Kit (JDK) versi 17.
*   Android Studio & Android SDK (platform-tools, build-tools).
*   Variabel lingkungan `$ANDROID_HOME` terkonfigurasi di OS Anda.

### Langkah-langkah:

1. **Generasikan Folder Native Android:**
   Jalankan perintah berikut di folder `luxtrace-mobile` untuk menghasilkan folder native `/android`:
   ```bash
   npx expo prebuild
   ```

2. **Kompilasi APK Menggunakan Gradle:**
   Masuk ke folder `android` yang baru dibuat dan jalankan kompilasi release:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

3. **Ambil File APK:**
   Setelah proses kompilasi selesai dengan status `BUILD SUCCESSFUL`, file APK Anda akan tersimpan di direktori berikut:
   ```path
   luxtrace-mobile/android/app/build/outputs/apk/release/app-release.apk
   ```
   Kirim file `app-release.apk` tersebut ke ponsel Android Anda untuk langsung diinstal.
