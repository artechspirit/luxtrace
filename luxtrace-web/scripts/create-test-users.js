/**
 * Luxtrace Testing Users Creation Script
 *
 * This script registers three default users with different roles:
 * 1. Admin (admin@luxtrace.com / password123)
 * 2. Operator (operator@luxtrace.com / password123)
 * 3. Consumer/Buyer (buyer@luxtrace.com / password123)
 *
 * Requirements:
 * - Next.js development server must be running on http://localhost:3000
 */

const USERS = [
  {
    email: 'admin@luxtrace.com',
    password: 'password123',
    fullName: 'System Admin',
    role: 'ADMIN',
  },
  {
    email: 'operator@luxtrace.com',
    password: 'password123',
    fullName: 'Boutique Operator',
    role: 'OPERATOR',
  },
  {
    email: 'buyer@luxtrace.com',
    password: 'password123',
    fullName: 'Arthur Pendragon',
    role: 'CONSUMER',
  },
]

async function registerAll() {
  console.log('----------------------------------------------------')
  console.log('LUXTRACE — TEST USER REGISTRATION UTILITY')
  console.log('----------------------------------------------------')

  for (const user of USERS) {
    console.log(`Registering ${user.role}: ${user.email}...`)
    try {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        console.log(`✅ Success! Created ${user.role}:`)
        console.log(`   - ID: ${data.data.user_id}`)
        console.log(`   - Custodial Wallet: ${data.data.wallet_address}`)
      } else {
        console.log(`❌ Failed: ${data.error?.message || data.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.log(`❌ Connection Error: Is the dev server running on http://localhost:3000?`)
      console.log(`   Detail: ${error.message}`)
      break
    }
    console.log('----------------------------------------------------')
  }
}

registerAll()
