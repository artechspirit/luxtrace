# Luxtrace P2P Direct Handover Verification

This document has been generated to facilitate the testing of your secondary market transaction.

## 📦 Product Under Transfer
- **Model**: Patek Philippe Nautilus 5711/1A
- **Serial Number**: `LUX-26-B1-002`
- **NFT Token ID**: `#1`
- **NFC Tag UID**: `853daaff-645e-4823-a046-dfe652536448` (Simulate by entering this on the phone)

## 👤 Participant Details
- **Current Owner (Seller)**: Arthur Pendragon (`buyer@luxtrace.com`)
- **Recipient (New Buyer)**: Morgana Le Fay (`buyer2@luxtrace.com`)

---

## 📲 How to Test the Handover on Mobile:
1. Open the **Luxtrace Mobile App** and log in as the Recipient (New Buyer):
   - **Email**: `buyer2@luxtrace.com`
   - **Password**: `password123`
2. Tap the **"Scan QR"** button on the home screen to open the scanner.
3. Scan the QR code image below:

![P2P Handover QR Code](https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=9054e09a-e054-4ed7-b456-d86047c1d87f)

4. Once the QR code is scanned, the **NFC Simulator Terminal** will open:
   - Paste the **NFC Tag UID** from above: `853daaff-645e-4823-a046-dfe652536448`
   - Tap **"TRIGGER DIRECT HANDOVER"**.
5. The **Luxury Loader** will spin for **12.5 seconds** as it confirms ownership transfer on the Sepolia Ethereum blockchain.
6. Look at the transaction success alert! 
