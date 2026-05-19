import { mintNFT, transferNFTBetweenUsers, brandWalletAddress } from '@/lib/thirdweb-engine'
import { productRepository } from '@/repositories/product.repository'
import type { ProductBatchItem, BlockchainTxResult } from '@/types'

export const blockchainService = {
  /**
   * Mint a single NFT to the brand wallet.
   * Returns tokenId and txHash after on-chain confirmation.
   *
   * Note: waitForReceipt in lib/thirdweb-engine handles confirmation.
   * No polling required — SDK awaits tx finality directly.
   */
  async mintSingleNFT(
    productId: string,
    item: ProductBatchItem
  ): Promise<BlockchainTxResult & { nft_token_id: string }> {
    const { tokenId, txHash } = await mintNFT({
      name: `${item.brand} — ${item.name}`,
      description: item.description,
      attributes: {
        serial_number: item.serial_number,
        brand: item.brand,
        product_id: productId,
        platform: 'Luxtrace',
      },
    })

    await productRepository.setNftTokenId(productId, tokenId, txHash)

    return { tx_hash: txHash, nft_token_id: tokenId }
  },

  /**
   * Transfer NFT between wallets.
   *
   * Custodial model: brand wallet is the on-chain holder.
   * fromWallet is the logical seller (tracked in DB only).
   * All transfers are signed by the brand wallet.
   */
  async transferNFT(
    fromWallet: string,
    toWallet: string,
    tokenId: string
  ): Promise<BlockchainTxResult> {
    const { txHash } = await transferNFTBetweenUsers(fromWallet, toWallet, tokenId)
    return { tx_hash: txHash }
  },

  /** Expose brand wallet address for service layer use */
  getBrandWallet(): string {
    return brandWalletAddress
  },
}
