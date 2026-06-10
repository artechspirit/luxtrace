# Luxtrace — System Architecture Analysis
> Mode: Strict Production Engineering  
> Date: 2026-06-10

---

## 1. Product State Machine (Detail)

### Valid States
```
MANUFACTURED → REGISTERED → OWNED ⇄ IN_TRANSIT
```

| State | Meaning | Trigger | Guard |
|---|---|---|---|
| `MANUFACTURED` | New product created, not yet bound to a physical tag or owner. | CSV upload + DB insert | Only admin/operator |
| `REGISTERED` | NFT minted, NFC placeholder or physical tag bound to product. | Blockchain mint tx confirmed + initial tag saved | Mint transaction hash must exist, serial must be unique |
| `OWNED` | Product is owned by a consumer; digital twin NFT is in their derived wallet. | Primary sale PAID or P2P verification completed | NFT transfer confirmed on-chain |
| `IN_TRANSIT` | Product is in the P2P Remote Shipping flow. | Escrow funded and transaction marked as shipped | Product must be in `OWNED` state previously, not `MANUFACTURED` |

### Transition Rules (Immutable)
```
MANUFACTURED  ──(NFT mint + placeholder bind)──▶  REGISTERED
REGISTERED    ──(NFC physical activate)─────────▶  REGISTERED (nfc_bound=true)
REGISTERED    ──(boutique sale / payment paid)──▶  OWNED
OWNED         ──(P2P remote initiated & paid)───▶  OWNED
OWNED         ──(marked as shipped)─────────────▶  IN_TRANSIT
IN_TRANSIT    ──(NFC verified + escrow release)──▶  OWNED      [success]
IN_TRANSIT    ──(fraud detected / retry reset)──▶  IN_TRANSIT [retry allowed]
IN_TRANSIT    ──(NFT transfer fail / rollback)──▶  OWNED      [rollback to seller]
OWNED         ──(P2P direct verified)───────────▶  OWNED      [buyer wallet]
```

> [!IMPORTANT]
> - **Only the backend** can execute state changes.
> - The `IN_TRANSIT` status is **LOCKED**: the item cannot be listed for another sale or transferred while in transit.
> - Every status transition **must** record a new entry in `product_logs`.

---

## 2. Backend Service Flow (Detail)

### 2.1 Manufacturing Flow
```
[Admin Web]
    │
    ▼
POST /api/products/upload (CSV upload)
    │
    ▼
[product.service] → parseCsvBuffer()
    │   ── duplicate serial check via product.repository
    ▼
INSERT products (status=MANUFACTURED) [atomic batch]
    │
    ▼
[blockchain.service] → mintNFT()
    │   ── via Thirdweb TypeScript SDK v5 (using Brand account signer)
    │   ── polling for tx receipt: wait for receipt (~15 seconds finality)
    ▼
ON TX_CONFIRMED:
    │
    ├─▶ UPDATE products SET nft_token_id = tokenId, status='REGISTERED' WHERE product_id = X
    │
    ▼
[nfc.service] → generateNFCBinding()
    │   ── generates temporary UID (UUID v4)
    │   ── hash = SHA256(UID + SALT) [SALT from ENV: NFC_SECRET_SALT]
    │   ── INSERT nfc_tags (nfc_uid, secure_key_hash, product_id)
    │
    ▼
INSERT product_logs (event='MANUFACTURED' + 'REGISTERED')
```

---

### 2.2 Primary Sale (Boutique)
```
[Boutique Operator Mobile]
    │
    ▼
POST /api/boutique/initiate-sale { product_id, buyer_email, sale_mode }
    │
    ▼
[transaction.service]
    ├─▶ Resolve buyer from profile.repository.findByEmail()
    ├─▶ Verify product status = REGISTERED
    │
    ├─▶ IF sale_mode === 'escrow':
    │       └─ [payment.service] → createSnapInvoice(gross_amount, order_id)
    │       └─ INSERT transactions (type=PRIMARY_BOUTIQUE, status=PENDING, payment_ref=order_id)
    │       └─ Send push notification to buyer with Snap payment_url
    │
    ├─▶ IF sale_mode === 'direct':
    │       └─ INSERT transactions (type=PRIMARY_BOUTIQUE, status=PENDING)
    │       └─ [nfc.service] → generateQrPayload(transaction_id, product_id)
    │       └─ Return session_id + qr_payload (operator shows QR to buyer)
```

#### Webhook Settlement (Async Callback)
```
POST /api/webhooks/midtrans  ← Midtrans async notification
    │
    ▼
[payment.service]
    ├─▶ validateMidtransSignature(payload, MIDTRANS_SERVER_KEY) [reject if invalid]
    ├─▶ checkIdempotency(order_id) [if status is already PAID/COMPLETED -> return 200]
    │
    ▼
IF payment_status = 'settlement' / 'capture':
    │
    ├─▶ UPDATE transactions SET status='PAID'
    │
    ├─▶ [blockchain.service] → transferNFTFromBrand(buyerWalletAddress, tokenId)
    │       └─ signs on-chain transaction via Brand Account
    │
    ├─▶ UPDATE products SET status='OWNED', current_owner_id=buyer_user_id
    ├─▶ UPDATE transactions SET status='COMPLETED', blockchain_tx_hash=txHash
    └─▶ INSERT product_logs (event='BRAND_OUTLET', actor_role='CONSUMER')
```

---

### 2.3 P2P Remote Shipping (Escrow)
```
PHASE 1 — SELLER LISTS & BUYER FUNDS
────────────────────────────────────
[Seller Mobile]
    │
    ▼
POST /api/p2p/remote/init { product_id, buyer_id, agreed_price_idr }
    │
    ▼
[transaction.service]
    ├─▶ Verify caller is product owner & status is OWNED
    ├─▶ [payment.service] → createSnapInvoice(agreedPrice, order_id)
    ├─▶ INSERT transactions (type=P2P_REMOTE_SHIPPING, status=PENDING, payment_ref=order_id)
    ▼
Buyer pays via Snap → Webhook received
    │
    ▼
[payment.service]
    ├─▶ UPDATE transactions SET status='PAID'
    └─▶ Send push notification to Seller: "Escrow funded, ship product"


PHASE 2 — SELLER SHIPS & GENERATES QR
──────────────────────────────────────
[Seller Mobile]
    │
    ├─▶ POST /api/transactions/:id/ship  ──▶ Sets transaction & product status to IN_TRANSIT
    │
    ├─▶ GET /api/p2p/remote/:transaction_id/qr
    │       └─ [nfc.service] → generateQrPayload()
    │       └─ INSERT qr_sessions (session_id, transaction_id, encrypted_payload, expires_at)
    │       └─ Return qr_payload (encrypted) + session_id
    ▼
Seller displays QR code


PHASE 3 — BUYER SCANS & VERIFIES NFC
────────────────────────────────────
[Buyer Mobile]
    │
    ▼
1. Scan QR → decrypt QR payload → extracts session_id + product_id
2. Scan physical product NFC tag → reads raw nfc_uid
3. POST /api/p2p/verify { session_id, scanned_uid, mode: 'remote' }
    │
    ▼
[transaction.service]
    ├─▶ Load and validate QR session (must not be expired or used)
    ├─▶ Guard: transaction is IN_TRANSIT & caller is the buyer
    ├─▶ Atomic: mark session as USED (prevents replay attacks)
    ├─▶ Hash scanned_uid: SHA256(scanned_uid + NFC_SECRET_SALT)
    ├─▶ Compare with nfc_tags.secure_key_hash WHERE product_id = X
    │
    ├─── IF MATCH:
    │       ├─▶ [blockchain.service] → transferNFTBetweenUsers(sellerWallet → buyerWallet, tokenId)
    │       │       └─ derives private keys deterministically using WALLET_MASTER_SEED
    │       │       └─ checks gas balance; auto-funds seller wallet with 0.002 ETH if needed
    │       ├─▶ UPDATE products SET status='OWNED', current_owner_id=buyer_id
    │       ├─▶ UPDATE transactions SET status='COMPLETED', blockchain_tx_hash=txHash
    │       ├─▶ INSERT product_logs (event='TRANSFERRED')
    │       └─▶ Release escrow payout (simulated/manual release)
    │
    └─── IF MISMATCH:
            ├─▶ Reset QR session used flag (allow retry)
            ├─▶ INSERT product_logs (event='FRAUD_ATTEMPT')
            └─▶ Return 400 { error: { code: 'NFC_MISMATCH' } }
```

---

## 3. Cryptographic Proximity & Replay Protection

### QR Code Session Security
Unlike simple static QR verification, Luxtrace enforces a session-gated flow to prevent replay attacks (i.e. copying a QR code and scanning it later without the physical item).

1. **Generation:** When requested, the server creates a row in the `qr_sessions` table with a UUID `session_id`, encrypts the payload using AES-256 (`QR_ENCRYPTION_KEY`), and returns it.
2. **Consumption:** When the buyer hits `/api/p2p/verify`, the backend updates `qr_sessions.is_used = true` **before** performing on-chain calls. This prevents parallel execution replay attempts.
3. **Mismatches:** If the physical NFC UID does not match, the session is reset so the buyer can attempt the scan again without forcing the seller to generate a new QR.

---

## 4. Blockchain Integration Architecture (TypeScript SDK)

Luxtrace implements a direct integration model using the **Thirdweb TypeScript SDK v5** instead of a self-hosted engine server.

### Custodial Wallet Model
1. **No RPC key leakage:** Clients do not write directly to the blockchain. All signing is executed server-side.
2. **Deterministic Seed Derivation:** When a user registers, their private key is derived deterministically from `WALLET_MASTER_SEED` + `userId` using HMAC-SHA256:
   ```typescript
   privateKey = HMAC_SHA256(WALLET_MASTER_SEED, userId)
   ```
   Only the public `wallet_address` is stored in the database (`profiles` table). The private key is regenerated on-the-fly in memory when executing transfers on behalf of the user.
3. **Gas Sponsorship:** Since P2P transfers are signed by the seller's derived account, the backend checks the seller's wallet balance before transferring. If it is below `0.001 ETH`, the backend sponsors gas by sending `0.002 ETH` from the Brand wallet.

---

## 5. Security & Risk Mitigations

| Risk | Description | Mitigation |
|---|---|---|
| **NFC Cloning** | Attacker clones physical tag UID | The backend hashes raw scanned UIDs with a secret pepper (`NFC_SECRET_SALT`). Plaintext hashes or raw UIDs are never exposed to clients. |
| **Replay Attack** | Re-using a captured QR payload | QR sessions are marked as `is_used` in the database dynamically during the verification pipeline. |
| **Payment Webhook Spoofing** | Attacker simulates paid status | Midtrans signature verification is validated on every webhook using timing-safe comparisons (`crypto.timingSafeEqual`). |
| **Double NFT Transfer** | Concurrent webhook calls | Transaction and order status checks enforce idempotency. If `status === 'PAID'` already, the request is returned with `200` immediately. |

---

## 6. Required Environment Variables

The backend requires the following configuration variables:

* `SUPABASE_URL`: URL of the database instance.
* `SUPABASE_SERVICE_KEY`: Service role secret key (bypasses RLS).
* `SUPABASE_ANON_KEY`: Public anonymous access key.
* `MIDTRANS_SERVER_KEY`: Server secret key for Snap invoicing and signature generation.
* `MIDTRANS_CLIENT_KEY`: Client token key.
* `MIDTRANS_ENV`: Environment target (`sandbox` \| `production`).
* `NEXT_PUBLIC_APP_URL`: Domain host URL for callback redirects.
* `THIRDWEB_SECRET_KEY`: Secret key for SDK v5 API calls.
* `BRAND_WALLET_PRIVATE_KEY`: Private signing key for the Brand authority wallet.
* `BRAND_WALLET_ADDRESS`: Public address of the Brand wallet.
* `NFT_CONTRACT_ADDRESS`: Deployed ERC-721 smart contract address.
* `WALLET_MASTER_SEED`: Cryptographic master key for deterministic user wallet derivation.
* `NFC_SECRET_SALT`: Cryptographic salt for secure NFC UID hashing.
* `QR_ENCRYPTION_KEY`: Cryptographic key for QR code payload encryption.
