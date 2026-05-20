const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const API_URL = 'http://localhost:3000'

try {
  const envContent = fs.readFileSync('.env', 'utf8')
  const env = {}
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (match) {
      const key = match[1]
      let value = match[2] || ''
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
      env[key] = value
    }
  })

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

  async function run() {
    console.log('--- STARTING P2P HANDOVER SESSION CREATOR ---')

    // 1. Register Buyer 2 (Morgana) if not exists
    console.log('1. Checking/Registering Second Consumer (buyer2@luxtrace.com)...')
    const registerRes = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'buyer2@luxtrace.com',
        password: 'password123',
        fullName: 'Morgana Le Fay',
        role: 'CONSUMER'
      })
    })
    const regResult = await registerRes.json()
    let buyer2Id = ''
    let buyer2Wallet = ''

    if (registerRes.ok && regResult.success) {
      buyer2Id = regResult.data.user_id
      buyer2Wallet = regResult.data.wallet_address
      console.log(`   ✅ Registered! ID: ${buyer2Id}, Wallet: ${buyer2Wallet}`)
    } else {
      // Fetch from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'buyer2@luxtrace.com')
        .single()
      
      if (profile) {
        buyer2Id = profile.user_id
        buyer2Wallet = profile.wallet_address
        console.log(`   ✅ Account already exists. ID: ${buyer2Id}, Wallet: ${buyer2Wallet}`)
      } else {
        console.error('❌ Failed to register or find Second Consumer:', regResult)
        return
      }
    }

    // 2. Log in as original Buyer (Arthur / seller in this P2P context)
    console.log('2. Logging in as original owner (buyer@luxtrace.com) to initiate handover...')
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'buyer@luxtrace.com', password: 'password123' })
    })
    const buyerSession = await loginRes.json()
    if (!loginRes.ok) {
      console.error('❌ Failed to log in as original buyer:', buyerSession)
      return
    }
    const buyerToken = buyerSession.data.access_token
    console.log(`   ✅ Logged in!`)

    // 3. Find the owned product
    console.log('3. Fetching product owned by original buyer...')
    const { data: ownedProducts } = await supabase
      .from('products')
      .select('*')
      .eq('status', 'OWNED')
      .eq('current_owner_id', buyerSession.data.user_id)
      .limit(1)

    if (!ownedProducts || ownedProducts.length === 0) {
      console.error('❌ No OWNED products found for original buyer. Did you run simulate-boutique-buy.js yet?')
      return
    }
    const targetProduct = ownedProducts[0]
    console.log(`   ✅ Found owned product: ${targetProduct.brand} - ${targetProduct.name} (${targetProduct.serial_number})`)

    // Fetch the NFC tag associated with the product to display it
    const { data: nfcTag } = await supabase
      .from('nfc_tags')
      .select('nfc_uid')
      .eq('product_id', targetProduct.product_id)
      .single()

    const nfcUid = nfcTag ? nfcTag.nfc_uid : 'N/A'
    console.log(`      NFC UID: ${nfcUid}`)

    // 4. Initiate Direct Handover
    console.log('4. Initiating P2P Direct Handover Session...')
    const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    const timestamp = Date.now().toString()
    
    const initRes = await fetch(`${API_URL}/api/p2p/direct/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${buyerToken}`,
        'x-nonce': nonce,
        'x-timestamp': timestamp
      },
      body: JSON.stringify({
        product_id: targetProduct.product_id,
        buyer_id: buyer2Id
      })
    })
    const sessionResult = await initRes.json()
    if (!initRes.ok) {
      console.error('❌ Failed to initiate P2P Handover session:', sessionResult)
      return
    }
    
    const sessionId = sessionResult.data.session_id
    console.log(`   ✅ Handover session initiated successfully!`)
    console.log(`      Session ID: ${sessionId}`)

    // 5. Generate Markdown file with QR code
    console.log('5. Generating P2P_HANDOVER_QR.md file in workspace root...')
    const mdPath = path.join(__dirname, '../../P2P_HANDOVER_QR.md')
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${sessionId}`
    
    const mdContent = `# Luxtrace P2P Direct Handover Verification

This document has been generated to facilitate the testing of your secondary market transaction.

## 📦 Product Under Transfer
- **Model**: ${targetProduct.brand} ${targetProduct.name}
- **Serial Number**: \`${targetProduct.serial_number}\`
- **NFT Token ID**: \`#${targetProduct.nft_token_id}\`
- **NFC Tag UID**: \`${nfcUid}\` (Simulate by entering this on the phone)

## 👤 Participant Details
- **Current Owner (Seller)**: Arthur Pendragon (\`buyer@luxtrace.com\`)
- **Recipient (New Buyer)**: Morgana Le Fay (\`buyer2@luxtrace.com\`)

---

## 📲 How to Test the Handover on Mobile:
1. Open the **Luxtrace Mobile App** and log in as the Recipient (New Buyer):
   - **Email**: \`buyer2@luxtrace.com\`
   - **Password**: \`password123\`
2. Tap the **"Scan QR"** button on the home screen to open the scanner.
3. Scan the QR code image below:

![P2P Handover QR Code](${qrUrl})

4. Once the QR code is scanned, the **NFC Simulator Terminal** will open:
   - Paste the **NFC Tag UID** from above: \`${nfcUid}\`
   - Tap **"TRIGGER DIRECT HANDOVER"**.
5. The **Luxury Loader** will spin for **12.5 seconds** as it confirms ownership transfer on the Sepolia Ethereum blockchain.
6. Look at the transaction success alert! 
`
    fs.writeFileSync(mdPath, mdContent)
    console.log(`   ✅ P2P_HANDOVER_QR.md file generated at: ${mdPath}`)
    console.log('----------------------------------------------------')
    console.log('Open P2P_HANDOVER_QR.md, scan it with the buyer2@luxtrace.com account on mobile, and enter the NFC UID to transfer!')
  }

  run()
} catch (e) {
  console.error('❌ Failed to read .env file:', e.message)
}
