import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

async function main() {
  const { paymentService } = await import('../services/payment.service');
  const txId = 'cf92097b-cf58-4d2a-aa60-3ccd02a236bf';
  const orderId = 'LUX-cf92097b-cf58-4d2a-aa60-3ccd02a236bf';

  console.log(`Executing settlement manually for txId: ${txId}, orderId: ${orderId}...`);
  try {
    await paymentService._handleSettlement(txId, orderId);
    console.log('Settlement successful!');
  } catch (err) {
    console.error('Settlement failed with error:', err);
  }
}

main();
