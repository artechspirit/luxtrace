const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

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
    console.log('--- STARTING BOUTIQUE PURCHASE SIMULATION ---')

    // 1. Log in as Buyer
    console.log('1. Logging in as Buyer (buyer@luxtrace.com)...')
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'buyer@luxtrace.com', password: 'password123' })
    })
    const buyerSession = await loginRes.json()
    if (!loginRes.ok) {
      console.error('❌ Failed to log in as buyer:', buyerSession)
      return
    }
    const buyerToken = buyerSession.data.access_token
    console.log(`   ✅ Logged in! Buyer User ID: ${buyerSession.data.user_id}`)

    // 2. Fetch a REGISTERED product
    console.log('2. Fetching available REGISTERED products from database...')
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('*')
      .eq('status', 'REGISTERED')
      .limit(1)

    if (prodErr || !products || products.length === 0) {
      console.error('❌ No REGISTERED products found in the database. Please mint/upload a CSV batch first!', prodErr?.message)
      return
    }
    const targetProduct = products[0]
    console.log(`   ✅ Found available product: ${targetProduct.brand} - ${targetProduct.name} (${targetProduct.serial_number})`)
    console.log(`      Product ID: ${targetProduct.product_id}`)

    // 3. Create a primary payment transaction
    console.log('3. Initiating boutique purchase (PRIMARY_BOUTIQUE)...')
    const payCreateRes = await fetch(`${API_URL}/api/payments/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${buyerToken}`
      },
      body: JSON.stringify({
        type: 'PRIMARY_BOUTIQUE',
        product_id: targetProduct.product_id
      })
    })
    const payment = await payCreateRes.json()
    if (!payCreateRes.ok) {
      console.error('❌ Failed to create boutique payment:', payment)
      return
    }
    const transactionId = payment.data.transaction_id
    console.log(`   ✅ Payment invoice created successfully!`)
    console.log(`      Transaction ID: ${transactionId}`)
    console.log(`      Order ID: ${payment.data.order_id}`)
    console.log(`      Price: IDR ${payment.data.amount_idr.toLocaleString()}`)

    // 4. Log in as Admin/Operator to settle payment
    console.log('4. Logging in as Admin (admin@luxtrace.com) to trigger settlement...')
    const adminLoginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@luxtrace.com', password: 'password123' })
    })
    const adminSession = await adminLoginRes.json()
    if (!adminLoginRes.ok) {
      console.error('❌ Failed to log in as admin:', adminSession)
      return
    }
    const adminToken = adminSession.data.access_token

    // 5. Simulate payment success (settlement)
    console.log('5. Triggering simulated payment settlement on-chain (NFT transfer)...')
    console.log('   (This interacts with Sepolia blockchain and Thirdweb Engine, please wait 10-15s)...')
    
    const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    const timestamp = Date.now().toString()
    const settleRes = await fetch(`${API_URL}/api/transactions/${transactionId}/simulate-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'x-nonce': nonce,
        'x-timestamp': timestamp
      }
    })
    const settleResult = await settleRes.json()
    if (!settleRes.ok) {
      console.error('❌ Failed to settle payment:', settleResult)
      return
    }
    console.log('   ✅ Payment settled successfully!')

    // 6. Fetch updated status to verify
    console.log('6. Verifying database updates...')
    const { data: updatedProduct } = await supabase
      .from('products')
      .select('*')
      .eq('product_id', targetProduct.product_id)
      .single()

    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_address')
      .eq('user_id', buyerSession.data.user_id)
      .single()

    console.log('----------------------------------------------------')
    console.log('🎉 SIMULATION COMPLETED SUCCESSFULLY!')
    console.log('----------------------------------------------------')
    console.log(`   Product: ${updatedProduct.brand} ${updatedProduct.name}`)
    console.log(`   New Status: ${updatedProduct.status} (Expected: OWNED)`)
    console.log(`   NFT Token ID: #${updatedProduct.nft_token_id}`)
    console.log(`   Owner Wallet (Profile): ${profile.wallet_address}`)
    console.log(`   Owner Wallet (Product Record): ${updatedProduct.wallet_address}`)
    console.log('----------------------------------------------------')
    console.log('Verify this on your Mobile App now! The product will show up in active assets/transactions.')
  }

  run()
} catch (e) {
  console.error('❌ Failed to read .env file:', e.message)
}
