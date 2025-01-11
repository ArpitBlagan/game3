import * as anchor from '@coral-xyz/anchor'
import {Program} from '@coral-xyz/anchor'
import {Keypair} from '@solana/web3.js'
import {Game3} from '../target/types/game3'

describe('game3', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const payer = provider.wallet as anchor.Wallet

  const program = anchor.workspace.Game3 as Program<Game3>

  const game3Keypair = Keypair.generate()

  it('Initialize Game3', async () => {
    await program.methods
      .initialize()
      .accounts({
        game3: game3Keypair.publicKey,
        payer: payer.publicKey,
      })
      .signers([game3Keypair])
      .rpc()

    const currentCount = await program.account.game3.fetch(game3Keypair.publicKey)

    expect(currentCount.count).toEqual(0)
  })

  it('Increment Game3', async () => {
    await program.methods.increment().accounts({ game3: game3Keypair.publicKey }).rpc()

    const currentCount = await program.account.game3.fetch(game3Keypair.publicKey)

    expect(currentCount.count).toEqual(1)
  })

  it('Increment Game3 Again', async () => {
    await program.methods.increment().accounts({ game3: game3Keypair.publicKey }).rpc()

    const currentCount = await program.account.game3.fetch(game3Keypair.publicKey)

    expect(currentCount.count).toEqual(2)
  })

  it('Decrement Game3', async () => {
    await program.methods.decrement().accounts({ game3: game3Keypair.publicKey }).rpc()

    const currentCount = await program.account.game3.fetch(game3Keypair.publicKey)

    expect(currentCount.count).toEqual(1)
  })

  it('Set game3 value', async () => {
    await program.methods.set(42).accounts({ game3: game3Keypair.publicKey }).rpc()

    const currentCount = await program.account.game3.fetch(game3Keypair.publicKey)

    expect(currentCount.count).toEqual(42)
  })

  it('Set close the game3 account', async () => {
    await program.methods
      .close()
      .accounts({
        payer: payer.publicKey,
        game3: game3Keypair.publicKey,
      })
      .rpc()

    // The account should no longer exist, returning null.
    const userAccount = await program.account.game3.fetchNullable(game3Keypair.publicKey)
    expect(userAccount).toBeNull()
  })
})
