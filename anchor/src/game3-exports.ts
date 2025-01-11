// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import Game3IDL from '../target/idl/game3.json'
import type { Game3 } from '../target/types/game3'

// Re-export the generated IDL and type
export { Game3, Game3IDL }

// The programId is imported from the program IDL.
export const GAME3_PROGRAM_ID = new PublicKey(Game3IDL.address)

// This is a helper function to get the Game3 Anchor program.
export function getGame3Program(provider: AnchorProvider, address?: PublicKey) {
  return new Program({ ...Game3IDL, address: address ? address.toBase58() : Game3IDL.address } as Game3, provider)
}

// This is a helper function to get the program ID for the Game3 program depending on the cluster.
export function getGame3ProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      // This is the program ID for the Game3 program on devnet and testnet.
      return new PublicKey('coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF')
    case 'mainnet-beta':
    default:
      return GAME3_PROGRAM_ID
  }
}
