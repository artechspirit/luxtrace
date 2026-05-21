/**
 * Thirdweb SDK v5 client.
 * Contract: 0x6d87293F44D68365De7cE9c29dAF752971237239 on Ethereum Sepolia.
 *
 * Architecture (custodial model — no Engine required):
 * - Brand wallet (BRAND_WALLET_PRIVATE_KEY) is the operational signer
 * - Brand wallet mints all NFTs initially to brand address
 * - Brand wallet transfers NFTs to users on sale/P2P
 * - User wallets are real EOA addresses (generated server-side, address stored in DB)
 *
 * ENV (required):
 *   THIRDWEB_SECRET_KEY         — from thirdweb.com dashboard → Settings → API Keys
 *   BRAND_WALLET_PRIVATE_KEY    — 0x-prefixed private key of operational wallet
 *   NFT_CONTRACT_ADDRESS        — 0x6d87293F44D68365De7cE9c29dAF752971237239
 */

import {
  createThirdwebClient,
  getContract,
  sendTransaction,
  waitForReceipt,
  prepareContractCall,
  readContract,
  prepareTransaction,
} from 'thirdweb'
import { sepolia } from 'thirdweb/chains'
import { privateKeyToAccount, getWalletBalance } from 'thirdweb/wallets'
import { mintTo, transferFrom } from 'thirdweb/extensions/erc721'
import crypto from 'crypto'
import { supabase } from './supabase'

// ─── ENV Validation ───────────────────────────────────────────────────────────

const secretKey = process.env.THIRDWEB_SECRET_KEY || 'placeholder-secret'
const brandPrivateKey = process.env.BRAND_WALLET_PRIVATE_KEY || '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
const contractAddress = process.env.NFT_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000'

if ((!process.env.THIRDWEB_SECRET_KEY || !process.env.BRAND_WALLET_PRIVATE_KEY || !process.env.NFT_CONTRACT_ADDRESS) && process.env.NEXT_PHASE !== 'phase-production-build') {
  if (!process.env.THIRDWEB_SECRET_KEY) throw new Error('[ENV] THIRDWEB_SECRET_KEY is required')
  if (!process.env.BRAND_WALLET_PRIVATE_KEY) throw new Error('[ENV] BRAND_WALLET_PRIVATE_KEY is required (0x-prefixed)')
  if (!process.env.NFT_CONTRACT_ADDRESS) throw new Error('[ENV] NFT_CONTRACT_ADDRESS is required')
}

// ─── Client + Chain + Contract ───────────────────────────────────────────────

export const client = createThirdwebClient({ secretKey })
export const chain = sepolia

export const nftContract = getContract({
  client,
  chain,
  address: contractAddress,
})

// ─── Brand Wallet ─────────────────────────────────────────────────────────────

/** The operational wallet that signs all blockchain transactions. */
const brandAccount = privateKeyToAccount({
  client,
  privateKey: brandPrivateKey as `0x${string}`,
})

export const brandWalletAddress: string = brandAccount.address

// ─── User Wallet Generation ───────────────────────────────────────────────────

export interface UserWalletResult {
  walletAddress: string
}

/**
 * Generate a unique Ethereum wallet address for a new user.
 *
 * Security model:
 * - Private key is derived deterministically from WALLET_MASTER_SEED + userId
 * - Only the wallet ADDRESS is stored in DB (never the private key)
 * - The brand wallet acts as operator for all on-chain transfers
 * - Deterministic: same userId always produces same address (idempotent)
 *
 * ENV: WALLET_MASTER_SEED (min 32 random bytes, hex-encoded)
 */
export function createUserWallet(userId: string): UserWalletResult {
  const masterSeed = process.env.WALLET_MASTER_SEED
  if (!masterSeed) throw new Error('[ENV] WALLET_MASTER_SEED is required')

  // HMAC-SHA256 → 32-byte private key
  const derivedKey = crypto
    .createHmac('sha256', masterSeed)
    .update(userId)
    .digest('hex')

  const privateKey = `0x${derivedKey}` as `0x${string}`

  const account = privateKeyToAccount({ client, privateKey })
  return { walletAddress: account.address }
}

// ─── NFT Minting ──────────────────────────────────────────────────────────────

export interface MintNFTResult {
  tokenId: string
  txHash: string
}

/**
 * Mint a single NFT to the brand wallet.
 * Token is held in brand wallet until sold/transferred to buyer.
 */
export async function mintNFT(metadata: {
  name: string
  description: string
  attributes: Record<string, string | number>
}): Promise<MintNFTResult> {
  const transaction = mintTo({
    contract: nftContract,
    to: brandWalletAddress,
    nft: {
      name: metadata.name,
      description: metadata.description,
      attributes: Object.entries(metadata.attributes).map(([trait_type, value]) => ({
        trait_type,
        value: String(value),
      })),
    },
  })

  const { transactionHash } = await sendTransaction({ transaction, account: brandAccount })
  const receipt = await waitForReceipt({ client, chain, transactionHash })

  // Extract tokenId from Transfer event logs
  const tokenId = extractTokenIdFromReceipt(
    receipt as { logs?: Array<{ topics?: string[] }> },
    transactionHash
  )

  return {
    tokenId,
    txHash: transactionHash,
  }
}

/**
 * Extract minted tokenId from the Transfer event in the receipt.
 * ERC-721 Transfer event: Transfer(address from, address to, uint256 tokenId)
 */
function extractTokenIdFromReceipt(
  receipt: { logs?: Array<{ topics?: string[] }> },
  fallbackHash: string
): string {
  // Transfer event topic: keccak256("Transfer(address,address,uint256)")
  const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

  for (const log of receipt.logs ?? []) {
    if (log.topics?.[0]?.toLowerCase() === TRANSFER_TOPIC) {
      // topics[3] = tokenId (as 32-byte hex)
      const tokenIdHex = log.topics?.[3]
      if (tokenIdHex) {
        return BigInt(tokenIdHex).toString()
      }
    }
  }

  // Fallback: use tx hash slice as identifier
  return fallbackHash
}

// ─── NFT Transfer ─────────────────────────────────────────────────────────────

export interface TransferNFTResult {
  txHash: string
}

/**
 * Transfer NFT from brand wallet to a user wallet (primary sale / P2P via custodial model).
 *
 * The brand wallet is the legal custodian of all NFTs.
 * On sale completion, the NFT is transferred to the buyer's address.
 */
export async function transferNFTFromBrand(
  toWallet: string,
  tokenId: string
): Promise<TransferNFTResult> {
  const transaction = transferFrom({
    contract: nftContract,
    from: brandWalletAddress,
    to: toWallet as `0x${string}`,
    tokenId: BigInt(tokenId),
  })

  const receipt = await sendTransaction({ transaction, account: brandAccount })
  await waitForReceipt({ client, chain, transactionHash: receipt.transactionHash })

  return { txHash: receipt.transactionHash }
}

/**
 * Transfer NFT between user wallets (P2P — seller to buyer).
 *
 * Requires the brand wallet to be approved as operator on the seller's wallet,
 * OR the NFT is still held by brand wallet (custodial model).
 *
 * In custodial model: brand wallet is always `from` (logical seller tracked in DB).
 */
export async function transferNFTBetweenUsers(
  fromWallet: string,
  toWallet: string,
  tokenId: string
): Promise<TransferNFTResult> {
  // 1. If it's from the brand wallet, just do normal brand transfer
  if (fromWallet.toLowerCase() === brandWalletAddress.toLowerCase()) {
    return transferNFTFromBrand(toWallet, tokenId)
  }

  // 2. Otherwise, look up the seller's user ID from Supabase by their wallet address
  // and derive their private key to sign the transaction.
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('wallet_address', fromWallet)
    .single()

  if (error || !profile) {
    throw new Error(`[Blockchain Service] Seller profile not found for wallet: ${fromWallet}`)
  }

  const masterSeed = process.env.WALLET_MASTER_SEED
  if (!masterSeed) throw new Error('[ENV] WALLET_MASTER_SEED is required')

  // Derive private key deterministically
  const derivedKey = crypto
    .createHmac('sha256', masterSeed)
    .update(profile.user_id)
    .digest('hex')

  const privateKey = `0x${derivedKey}` as `0x${string}`
  const sellerAccount = privateKeyToAccount({ client, privateKey })

  // Check seller's balance to ensure they have gas for transaction execution
  const balance = await getWalletBalance({
    client,
    chain,
    address: sellerAccount.address,
  })

  // If balance is less than 0.001 ETH, transfer 0.002 ETH from brand wallet to seller wallet
  if (balance.value < BigInt("1000000000000000")) {
    console.log(`[Blockchain Service] Funding seller wallet ${sellerAccount.address} with gas from brand wallet...`)
    const fundTransaction = prepareTransaction({
      to: sellerAccount.address,
      value: BigInt("2000000000000000"), // 0.002 ETH
      chain,
      client,
    })

    const fundReceipt = await sendTransaction({
      transaction: fundTransaction,
      account: brandAccount,
    })
    await waitForReceipt({
      client,
      chain,
      transactionHash: fundReceipt.transactionHash,
    })
    console.log(`[Blockchain Service] Gas funding complete. Tx: ${fundReceipt.transactionHash}`)
  }

  // Prepare standard ERC721 transferFrom from seller to buyer
  const transaction = transferFrom({
    contract: nftContract,
    from: sellerAccount.address,
    to: toWallet as `0x${string}`,
    tokenId: BigInt(tokenId),
  })

  // Sign and submit transaction using the seller's account
  const receipt = await sendTransaction({ transaction, account: sellerAccount })
  await waitForReceipt({ client, chain, transactionHash: receipt.transactionHash })

  return { txHash: receipt.transactionHash }
}

// ─── Contract Read ────────────────────────────────────────────────────────────

/**
 * Check on-chain owner of a token.
 * Used for verification and provenance queries.
 */
export async function getTokenOwner(tokenId: string): Promise<string> {
  const result = await readContract({
    contract: nftContract,
    method: 'function ownerOf(uint256 tokenId) view returns (address)',
    params: [BigInt(tokenId)],
  })
  return result as string
}
