import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

async function main() {
  const { getTokenOwner } = await import('../lib/thirdweb-engine');
  const tokenId = '14';
  try {
    const owner = await getTokenOwner(tokenId);
    console.log(`On-chain owner of token ${tokenId}: ${owner}`);
  } catch (err) {
    console.error('Failed to get token owner:', err);
  }
}

main();
