const Midtrans = require('midtrans-client');
require('dotenv').config();

const serverKey = process.env.MIDTRANS_SERVER_KEY || 'placeholder-server-key';
const clientKey = process.env.MIDTRANS_CLIENT_KEY || 'placeholder-client-key';
const isProduction = false;

const snap = new Midtrans.Snap({ isProduction, serverKey, clientKey });

async function testDuplicate() {
  const orderId = 'TEST-' + Math.floor(Math.random() * 1000000);
  console.log('Testing orderId:', orderId);

  // 1. Create first time
  const res1 = await snap.createTransaction({
    transaction_details: {
      order_id: orderId,
      gross_amount: 150000,
    },
    customer_details: {
      first_name: 'Test Buyer',
      email: 'buyer@test.com',
    }
  });
  console.log('First response token:', res1.token);

  // 2. Try creating second time with identical info
  try {
    const res2 = await snap.createTransaction({
      transaction_details: {
        order_id: orderId,
        gross_amount: 150000,
      },
      customer_details: {
        first_name: 'Test Buyer',
        email: 'buyer@test.com',
      }
    });
    console.log('Second response token:', res2.token);
  } catch (err) {
    console.log('Second attempt failed as expected:', err.message);
  }
}

testDuplicate();
