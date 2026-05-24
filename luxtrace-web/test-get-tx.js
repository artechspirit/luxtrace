const http = require('http');

// A quick way to test what `createSnapInvoice` returns when called twice
const Midtrans = require('midtrans-client');
const serverKey = "Mid-server-8boXT9kh8kplKhc3K-XlUaO-";
const clientKey = "Mid-client-y9U8BqA0rXxt7h-Z";
const snap = new Midtrans.Snap({ isProduction: false, serverKey, clientKey });

async function run() {
  const orderId = `LUX-TEST-${Date.now()}`;
  
  console.log("Creating first time...");
  const res1 = await snap.createTransaction({
    transaction_details: { order_id: orderId, gross_amount: 10000 },
    customer_details: { first_name: "Test", email: "test@example.com" }
  });
  console.log(res1);

  console.log("Creating second time...");
  const res2 = await snap.createTransaction({
    transaction_details: { order_id: orderId, gross_amount: 10000 },
    customer_details: { first_name: "Test", email: "test@example.com" }
  });
  console.log(res2);
}
run().catch(console.error);
