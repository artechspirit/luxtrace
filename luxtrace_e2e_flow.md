# 💎 Luxtrace — End-to-End System Flow
> System flow documentation synchronized with codebase.

---

## 🗺️ System Map

```
┌─────────────────────────────────────────────────────────────────┐
│                             ACTORS                              │
│ 👤 ADMIN (Web)  │  🏪 OPERATOR (Mobile)  │  📱 CONSUMER (Mobile) │
└─────────────────────────────────────────────────────────────────┘
         │                    │                        │
         ▼                    ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              Next.js API (App Router) — JWT Auth                │
│  /api/auth/*  │  /api/products/*  │  /api/boutique/*            │
│  /api/nfc/*   │  /api/p2p/*       │  /api/payments/*            │
│  /api/webhooks/midtrans                                         │
└──────────┬────────────────────────┬────────────────────────────┘
            │                        │
     ┌──────▼──────┐         ┌───────▼──────┐
     │  Supabase   │         │  Thirdweb    │
     │ (PostgreSQL)│         │  SDK v5      │
     │ + Auth      │         │ (Blockchain) │
     └─────────────┘         └──────────────┘
                                     │
                          ┌──────────▼──────────┐
                          │   Sepolia Ethereum   │
                          │   ERC-721 Contract  │
                          └─────────────────────┘
```

---

## 🔑 Product Status State Machine

```
MANUFACTURED → REGISTERED → OWNED ⇄ IN_TRANSIT → OWNED
                                              ↓
                                       FRAUD_FLAGGED
```

| Status | Meaning |
|--------|---------|
| `MANUFACTURED` | Product created on DB, NFT not yet minted to brand wallet. |
| `REGISTERED` | NFT minted, NFC tag (placeholder or physical tag) is bound. |
| `OWNED` | Owned by a consumer, digital twin NFT stored in their custodial wallet. |
| `IN_TRANSIT` | Locked state in remote shipping escrow while package is in delivery. |
| `FRAUD_FLAGGED` | Fraud attempt detected (NFC mismatch), transaction held for review. |

---

## 📋 FLOW 1 — Authentication

### 1A. Email/Password Authentication
**Actors:** Admin, Operator, Consumer  
**Platforms:** Web Dashboard & Mobile App

```
[User] ──▶ Input email + password
       ──▶ POST /api/auth/login
       ──▶ [Backend] Supabase Auth verifies credentials
       ──▶ [Backend] Retrieve profile matching User ID
       ──▶ Return: { access_token (JWT), user_id, email, wallet_address, role, full_name }
[Mobile] ──▶ Save token securely using expo-secure-store
[Web]    ──▶ Save token in secure cookies / session state
```

---

### 1B. Google OAuth Authentication (Mobile Only)
```
[User]    ──▶ Tap "Sign in with Google"
          ──▶ AuthSession opens Google OAuth popup
          ──▶ Google redirects to callback with auth ?code=xxx
[Mobile]  ──▶ auth-callback.tsx intercepts auth code
          ──▶ POST /api/auth/oauth/google { code }
          ──▶ [Backend] Exchange code with Supabase for Google session
          ──▶ [Backend] Retrieve or auto-create profile and derived wallet
          ──▶ Return: JWT access_token + user profile details
[Mobile]  ──▶ Store token securely in SecureStore, redirect user to tab home
```

---

### 1C. Active Session Verification
```
[App / Web Launch] ──▶ Check secure storage for token
                   ──▶ GET /api/auth/me (Auth header: Bearer <token>)
                   ──▶ [Backend] Verify JWT token signature via middleware.ts
                   ──▶ Return: { user profile details }
                   ──▶ Transition UI to authenticated state
```

---

## 📦 FLOW 2 — Batch Product Manufacturing

**Actors:** Admin  
**Platform:** Web Dashboard  

```
[Admin] ──▶ Select CSV file containing product list (serial, brand, name, price, description)
        ──▶ POST /api/products/upload (multipart/form-data)
```

### Backend Processing Pipeline (Asynchronous):
```
[Backend] ──▶ Parse and validate CSV data format
          ──▶ Verify serial number uniqueness in database
          ──▶ INSERT batch products to public.products (status: MANUFACTURED)
          ──▶ Create manufacturing batch status record (batch_id)
          ──▶ Return: { batch_id, status: "PROCESSING" } (IMMEDIATE response to web client)
          ──▶ [ASYNC Background Thread starts]:
                For each product in CSV batch:
                A. Mint ERC-721 NFT to Brand Wallet using Thirdweb SDK v5
                   └─ Wait for transaction receipt confirmation (~15 seconds)
                B. Generate placeholder NFC tag and secure key hash
                   └─ SHA-256(temporary UUID + NFC_SECRET_SALT)
                C. Update product status -> REGISTERED
                D. Log MANUFACTURED & REGISTERED events to product_logs
                E. Append success result details to manufacturing batch record
```

### Status Polling:
```
[Frontend] ──▶ GET /api/products/batch/:batch_id
           ──▶ Return: { batch_id, status, processed, failed, results }
           ──▶ Poll every 3 seconds until status is COMPLETED or FAILED
```

---

## 🏪 FLOW 3 — Physical NFC Tag Activation

**Actors:** Operator  
**Platform:** Mobile App (Operator Screen)  

```
[Operator] ──▶ Open "Activate Product" tab
           ──▶ Tap physical NFC chip embedded on item using smartphone
           ──▶ App reads raw physical nfc_uid from chip
           ──▶ Input/scan product serial_number printed on tag/box
           ──▶ POST /api/nfc/activate { serial_number, nfc_uid }
```

```
[Backend] ──▶ Fetch product details by serial number
          ──▶ Guard: status must be MANUFACTURED and nfc_bound must be false
          ──▶ Hash raw scanned UID: SHA-256(nfc_uid + NFC_SECRET_SALT)
          ──▶ Insert/overwrite row in public.nfc_tags with real physical secure_key_hash
          ──▶ Update product.nfc_bound = true and status = REGISTERED
          ──▶ Log REGISTERED activation event in public.product_logs
          ──▶ Return: { success: true, status: "REGISTERED" }
```

---

## 🛍️ FLOW 4 — Boutique Outlet Purchase (Primary Sale)

**Actors:** Operator (Initiates) + Consumer (Buyer)  
**Platform:** Mobile App

### Phase 1: Operator Initiates Order
```
[Operator] ──▶ Open "Sell" tab -> Select REGISTERED product
           ──▶ Enter Buyer email address or scan customer ID
           ──▶ POST /api/boutique/initiate-sale { product_id, buyer_email, sale_mode: "escrow" }
```

```
[Backend] ──▶ Resolve buyer profile by email
          ──▶ Lock product state (status must be REGISTERED)
          ──▶ Request Midtrans Snap Invoice for product price
          ──▶ Insert transaction row (type: PRIMARY_BOUTIQUE, status: PENDING, payment_ref)
          ──▶ Trigger push notification to Buyer: "🏛️ Boutique Purchase Invitation"
          ──▶ Return: { transaction_id, snap_token, payment_url }
```

### Phase 2: Customer Checkout
```
[Consumer Mobile] ──▶ Click push notification / Open invoice
                  ──▶ Redirect to payment_url (Midtrans Snap checkout page)
                  ──▶ Complete payment transaction (VA, QRIS, etc.)
```

### Phase 3: Settlement Webhook
```
[Midtrans] ──▶ POST /api/webhooks/midtrans { order_id, transaction_status: "settlement" }
[Backend]  ──▶ Validate signature check
           ──▶ Check idempotency (skip if already marked PAID)
           ──▶ Update transaction status -> PAID
           ──▶ Transfer NFT: Brand Wallet -> Buyer Custodial Wallet (Thirdweb SDK v5)
           ──▶ Update product status -> OWNED, set current_owner_id = buyer_id
           ──▶ Update transaction status -> COMPLETED, record blockchain_tx_hash
           ──▶ Log BRAND_OUTLET event to public.product_logs
```

---

## 🔄 FLOW 5 — P2P Remote Shipping (Escrow)

**Actors:** Seller (Owner) + Buyer (Consumer)  
**Platform:** Mobile App

### Phase 1: Seller Lists Item
```
[Seller Mobile] ──▶ Select OWNED item from vault
                ──▶ Click "Sell via Remote Shipping"
                ──▶ Enter buyer's email (resolves ID via GET /api/users/lookup)
                ──▶ Input agreed price
                ──▶ POST /api/p2p/remote/init { product_id, buyer_id, agreed_price_idr }
```

```
[Backend] ──▶ Verify product status = OWNED and seller is current owner
          ──▶ Request Midtrans Snap Escrow Invoice
          ──▶ Insert transaction (type: P2P_REMOTE_SHIPPING, status: PENDING)
          ──▶ Send push notification to Buyer: "P2P Purchase Request"
          ──▶ Return: { transaction_id, payment_url }
```

### Phase 2: Buyer Locks Escrow
```
[Buyer Mobile] ──▶ Open payment_url -> Complete payment
[Midtrans]     ──▶ POST /api/webhooks/midtrans
[Backend]      ──▶ Update transaction status -> PAID
               ──▶ Send push notification to Seller: "Escrow funded, ready to ship"
```

### Phase 3: Shipping Trigger
```
[Seller Mobile] ──▶ Pack and ship the item
                ──▶ POST /api/transactions/:id/ship
[Backend]       ──▶ Update product status -> IN_TRANSIT (locked state)
                ──▶ Update transaction status -> IN_TRANSIT
```

### Phase 4: Verification QR Generation
```
[Seller Mobile] ──▶ Click "Generate QR Code" in transaction details
                ──▶ GET /api/p2p/remote/:transaction_id/qr
```

```
[Backend] ──▶ Verify caller is seller and transaction is IN_TRANSIT
          ──▶ Generate session_id (UUID)
          ──▶ Encrypt QR payload: AES-256({ session_id, transaction_id, product_id, nfc_uid })
          ──▶ Insert session into public.qr_sessions
          ──▶ Return: { qr_payload (encrypted string), session_id }
```

### Phase 5: Delivery & Verification
```
[Buyer Mobile] ──▶ Receive package delivery
               ──▶ Scan Seller's Handover QR -> Decrypts session_id
               ──▶ Tap smartphone on product physical NFC tag -> Reads nfc_uid
               ──▶ POST /api/p2p/verify { session_id, scanned_uid }
```

```
[Backend] ──▶ Validate QR session (must be active and unused)
          ──▶ Atomic: Consume session (set is_used = true)
          ──▶ Compare SHA-256(scanned_uid + salt) with database tag hash
          
          IF MATCH:
          ──▶ Transfer NFT: Seller Wallet -> Buyer Wallet (Thirdweb SDK v5)
          ──▶ Sponsor gas from Brand wallet to Seller wallet if balance < 0.001 Sepolia ETH
          ──▶ Update product status -> OWNED, set owner = buyer_id
          ──▶ Update transaction status -> COMPLETED, record tx_hash
          ──▶ Release Midtrans escrow funds to Seller
          ──▶ Log TRANSFERRED event to product_logs
          
          IF MISMATCH:
          ──▶ Revert session usage (allow retry)
          ──▶ Log FRAUD_ATTEMPT event to product_logs (record mismatched UID)
          ──▶ Return 400 NFC_MISMATCH (Escrow remains locked)
```

---

## 🤝 FLOW 6 — P2P Direct Handover (Tatap Muka)

**Actors:** Seller + Buyer (Direct face-to-face, no payment/escrow)  
**Platform:** Mobile App

### Phase 1: Seller Creates Handover Session
```
[Seller Mobile] ──▶ Click "Direct Handover" -> Enter buyer's email
                ──▶ POST /api/p2p/direct/init { product_id, buyer_id }
```

```
[Backend] ──▶ Verify seller ownership
          ──▶ Insert transaction (type: P2P_DIRECT_HANDOVER, status: PENDING)
          ──▶ Generate QR session valid for 5 minutes
          ──▶ Return: { qr_payload (encrypted), session_id }
[Seller]  ──▶ Display QR code on screen
```

### Phase 2: Buyer Scans and Authenticates
```
[Buyer Mobile] ──▶ Scan Seller's QR code -> Extract session_id
               ──▶ Tap physical NFC tag on item -> Read raw nfc_uid
               ──▶ POST /api/p2p/verify { session_id, scanned_uid, mode: "direct" }
```

```
[Backend] ──▶ Validate session (is active, not expired, not used)
          ──▶ Consume session (is_used = true)
          ──▶ Verify NFC tag hash match
          
          IF MATCH:
          ──▶ Transfer NFT: Seller Wallet -> Buyer Wallet (Thirdweb SDK v5)
          ──▶ Update product status -> OWNED, set owner = buyer_id
          ──▶ Update transaction status -> COMPLETED, record tx_hash
          ──▶ Log TRANSFERRED event to product_logs
```

---

## 🔐 Cryptographic Security Layer

| Guard | Implementation | Key Variable |
|---|---|---|
| **NFC Hash Protection** | Scanned physical UIDs are compared securely using hashed hashes | `NFC_SECRET_SALT` |
| **QR Code Tampering** | QR strings are AES-256 encrypted to hide transaction metadata | `QR_ENCRYPTION_KEY` |
| **Replay Prevention** | Database sessions are checked and marked consumed atomically | `qr_sessions` Table |
| **Gasless Custody** | Deterministic user private keys derived server-side on-demand | `WALLET_MASTER_SEED` |
