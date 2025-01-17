# game3

This is all about P2P in-game wagering with sol speciall for PUBG mobile users 🔫.
Where user can challenge their friend or rivaly for 1 vs 1 TDM matches with some entry fee in sol and who ever
wins the most matches win the challenge and reward with other participant entry fee.

### Stack user

- Anchor for writing solana program and deployed it on devent.
- Next js for writing the api's using worker-thread to delegate the task and node-cron to schedule the task.
- ZK-Snark for privacy and securit and groth16-solana ligth protocol ti verify the proof on-chain.
- Intergration with PUBG mobile api to get user's stats info by pooling their server.

### Overview video where I kind of explain the implementation and give a demo.

-

## Getting Started

### Prerequisites

- Node v18.18.0 or higher

- Rust v1.77.2 or higher
- Anchor CLI 0.30.1 or higher
- Solana CLI 1.18.17 or higher

### Installation

#### Clone the repo

```shell
git clone <repo-url>
cd <repo-name>
```

#### Install Dependencies

```shell
pnpm install
```

#### Start the web app

```
pnpm dev
```

## Apps

### anchor

This is a Solana program written in Rust using the Anchor framework.

#### Commands

You can use any normal anchor commands. Either move to the `anchor` directory and run the `anchor` command or prefix the command with `pnpm`, eg: `pnpm anchor`.

#### Sync the program id:

Running this command will create a new keypair in the `anchor/target/deploy` directory and save the address to the Anchor config file and update the `declare_id!` macro in the `./src/lib.rs` file of the program.

You will manually need to update the constant in `anchor/lib/counter-exports.ts` to match the new program id.

```shell
pnpm anchor keys sync
```

#### Build the program:

```shell
pnpm anchor-build
```

#### Start the test validator with the program deployed:

```shell
pnpm anchor-localnet
```

#### Run the tests

```shell
pnpm anchor-test
```

#### Deploy to Devnet

```shell
pnpm anchor deploy --provider.cluster devnet
```

### web

This is a React app that uses the Anchor generated client to interact with the Solana program.

#### Commands

Start the web app

```shell
pnpm dev
```

Build the web app

```shell
pnpm build
```
