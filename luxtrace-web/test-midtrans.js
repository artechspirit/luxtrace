const Midtrans = require('midtrans-client');

const serverKey = "Mid-server-8boXT9kh8kplKhc3K-XlUaO-";
const clientKey = "Mid-client-y9U8BqA0rXxt7h-Z";
const isProduction = false;

const snap = new Midtrans.Snap({ isProduction, serverKey, clientKey });

async function run() {
  const result = await snap.createTransaction({
    transaction_details: {
      order_id: `LUX-test-${Date.now()}`,
      gross_amount: 50000,
    },
    customer_details: {
      first_name: "Test",
      email: "test@example.com",
    },
    item_details: [
      {
        id: "item-1",
        price: 50000,
        quantity: 1,
        name: "Test Item"
      }
    ]
  });
  console.log(result);
}
run().catch(console.error);
