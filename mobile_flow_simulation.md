# Luxtrace Mobile App — End-to-End Walkthrough Simulation

Panduan ini menjabarkan alur langkah demi langkah simulasi mobile app Luxtrace (dari Login, Scan QR, Verifikasi Proksimitas NFC, hingga Status Sukses Blockchain), beserta spesifikasi respons API dan visualisasi antarmuka pengguna (UI/UX) yang diharapkan.

---

## Tahap 1: Autentikasi Pengguna (`Login`)

### 1. Progres Alur (Steps)
1. Pembeli membuka aplikasi mobile Luxtrace. Root router mendeteksi token tidak ada di `expo-secure-store` dan mengarahkan ke halaman `/(auth)/login`.
2. Pengguna memasukkan kredensial email dan password (misal: `buyer@luxtrace.com` / `password123`).
3. Pengguna menekan tombol **"ACCESS PORTAL"**.

### 2. Respons API yang Diharapkan (Expected API Response)
* **API Call**: `POST /api/auth/login`
* **Request Headers**:
  ```http
  Content-Type: application/json
  ```
* **Request Body**:
  ```json
  {
    "email": "buyer@luxtrace.com",
    "password": "password123"
  }
  ```
* **Response Status**: `200 OK`
* **Response Body**:
  ```json
  {
    "success": true,
    "data": {
      "user_id": "8c59918a-7e3e-4b6d-9be2-4411b0f55acb",
      "email": "buyer@luxtrace.com",
      "full_name": "Arthur Pendragon",
      "role": "CONSUMER",
      "wallet_address": "0x3f6A27318eCacdD8849b40003BC9223e2b289a22",
      "access_token": "eyJhbGciOi...",
      "refresh_token": "d7b2a..."
    }
  }
  ```

### 3. Tampilan Antarmuka (Expected UI/UX)
* **Visual**: Tema gelap pekat, dengan latar belakang logo Luxtrace yang disamarkan (*brushed metal background*), form input bergaris batas halus abu-abu yang menyala hijau neon (`#00FFB2`) ketika difokuskan.
* **Loading State**: Tombol bertransisi menjadi spinner hijau saat autentikasi diproses.
* **Penyimpanan Aman**: Token JWT secara otomatis disimpan di keychain perangkat (`SecureStore`). Pengguna dialihkan ke halaman dashboard utama (`/index`).

---

## Tahap 2: Pemindaian QR (`Scan QR`)

### 1. Progres Alur (Steps)
1. Pada Dashboard, pembeli melihat daftar transaksi aktif. Transaksi bertipe `P2P_REMOTE_SHIPPING` dengan status `IN_TRANSIT` menampilkan tombol emas **"VERIFY HANDOVER & RELEASE"**.
2. Pengguna menekan tombol tersebut, membuka kamera belakang melalui modul `expo-camera`.
3. Pengguna mengarahkan kamera ke kode QR fisik/digital yang disediakan oleh penjual.

### 2. Tinjauan API (Expected API Action)
* *Tidak ada pemanggilan API langsung pada tahap scan ini*. Aplikasi mengekstrak `session_id` dari string QR mentah (atau URL seperti `https://luxtrace.com/verify?session_id=...`).

### 3. Tampilan Antarmuka (Expected UI/UX)
* **Visual**: Kamera layar penuh dengan overlay semi-transparan gelap di sisi tepi. Di bagian tengah, terdapat jendela bidik persegi (*scanner reticle*) 250x250 dengan garis sudut hijau neon menyala dan garis laser horizontal merah/hijau yang bergerak naik-turun secara dinamis.
* **Umpan Balik**: Begitu kode QR terdeteksi, kamera langsung dinonaktifkan, dan layar bertransisi ke panel **NFC Simulator Terminal**.

---

## Tahap 3: Verifikasi Proksimitas NFC (`Verify NFC`)

### 1. Progres Alur (Steps)
1. Pembeli melihat terminal simulasi NFC. Jendela menampilkan ID sesi QR yang telah dipindai.
2. Form input meminta pembeli memasukkan UID tag NFC fisik produk (misal: `04:F2:88:A2:9B:40`).
3. Pembeli menekan salah satu dari dua tombol eksekusi:
   * **TRIGGER REMOTE P2P HANDOVER** (Jika transaksi melibatkan escrow).
   * **TRIGGER DIRECT HANDOVER** (Jika serah terima tatap muka instan).

### 2. Respons API yang Diharapkan (Expected API Response)
* **API Call**: `POST /api/p2p/verify`
* **Request Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer eyJhbGciOi... (token JWT dari SecureStore)
  ```
* **Request Body**:
  ```json
  {
    "session_id": "a9d8f7e6-7e3e-4b6d-9be2-4411b0f55acb",
    "scanned_uid": "04:F2:88:A2:9B:40",
    "mode": "remote"
  }
  ```
* **Response Status**: `200 OK`
* **Response Body**:
  ```json
  {
    "success": true,
    "data": {
      "verified": true,
      "transaction_id": "d7b2a9e5-7e3e-4b6d-9be2-4411b0f55acb",
      "nft_transfer": {
        "tx_hash": "0xbc1a72d5c4aac84ae8afca1b05ae0c942fabc123d",
        "from_wallet": "0x981A7bFdB1615E258E298dDe51A68d276bA8ee99",
        "to_wallet": "0x3f6A27318eCacdD8849b40003BC9223e2b289a22",
        "token_id": "12"
      },
      "product_status": "OWNED",
      "via": "REMOTE"
    }
  }
  ```

### 3. Tampilan Antarmuka (Expected UI/UX)
* **Loading State Premium (Gating 12.5 Detik)**:
  * Layar penuh ditutup oleh overlay gelap `LuxuryLoader` Modal.
  * Ring spinner neon hijau berputar dengan dinamis.
  * Teks status bergerak berurutan secara berkala (masing-masing 2.5 detik) untuk menyimulasikan konfirmasi blok:
    1. *Initializing Sepolia Web3 handshake...*
    2. *Broadcasting transaction to Ethereum network...*
    3. *Awaiting proof-of-authority block finality (~12s)...*
    4. *Validating hardware signature via NFC-gate...*
    5. *Updating digital twin ownership records...*
  * Bilah kemajuan (*Progress Bar*) bertambah hingga 100%.

---

## Tahap 4: Konfirmasi Sukses Transaksi (`Success UI`)

### 1. Progres Alur (Steps)
1. Setelah hitung mundur 12.5 detik terlampaui DAN respons API sukses diterima (200 OK), modal loader ditutup.
2. Aplikasi mobile menampilkan kotak dialog sukses bawaan OS dengan data verifikasi blockchain.

### 2. Tampilan Antarmuka (Expected UI/UX)
* **Visual**: Alert Box khusus yang menonjol bertuliskan:
  * **Title**: `AUTHENTICITY VERIFIED`
  * **Content**: 
    * *Message*: "Ownership transfer & escrow settlement successfully completed on-chain!"
    * *Tx Hash*: `0xbc1a72d5c4aac84ae8afca1b05ae0c942fabc123d`
    * *Mode*: `REMOTE`
    * *Product Status*: `OWNED`
  * **Aksi**: Tombol emas/hijau "Dismiss".
* **Kembali Ke Dashboard**: Menekan "Dismiss" akan menghapus state pemindai, membersihkan masukan input UID, dan memicu router mengarahkan kembali pengguna ke dashboard utama `/index` untuk menyegarkan daftar escrow.
