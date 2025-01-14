import { Program } from "@coral-xyz/anchor";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { NextApiRequest, NextApiResponse } from "next";
import cron from "node-cron";
const IDL = require("../../../../anchor/target/idl/game3.json");
import { Game3 } from "../../../../anchor/target/types/game3";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

// Store tasks by challengeId to allow concurrent cron jobs
let tasks: { [key: string]: cron.ScheduledTask } = {};

export async function POST(req: NextApiRequest, res: NextApiResponse) {
  const { challengeId, matches } = req.body;

  // Get access to challenge's one participant's info
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const program: Program<Game3> = new Program(IDL, { connection });

  // Find challenge info
  const [accountPubkey] = await PublicKey.findProgramAddress(
    [Buffer.from("challenge"), challengeId.to_le_bytes().as_ref()],
    program.programId
  );
  const challengeInfo = await program.account.challenge.fetch(accountPubkey);

  const [particpantPubKey] = await PublicKey.findProgramAddress(
    [
      Buffer.from("participant"),
      challengeId.to_le_bytes().as_ref(),
      challengeInfo.participant1,
    ],
    program.programId
  );
  const participantInfo = await program.account.participant.fetch(
    particpantPubKey
  );
  console.log(participantInfo.playerId);

  if (tasks[challengeId]) {
    return res
      .status(400)
      .json({ message: "Scheduler already running for this challenge" });
  }
  let matchCount = 0;
  let participant1Wins = 0;
  let participant2Wins = 0;
  // Create a new cron task for this challenge
  tasks[challengeId] = cron.schedule("*/5 * * * *", async () => {
    try {
      const response = await fetch(""); // Replace with the actual API URL
      const data = await response.json();

      if (matchCount == matches) {
        //create a zkproof first

        //Create two isntruction
        const blockhash = await connection.getLatestBlockhash();
        //Verify the zkproof and update the challenge status to completed and show the winner info.
        const instruction = null;

        //Send the money to the winners account (after reducting some fee).
        const lamports = LAMPORTS_PER_SOL * 2;
        const secretKeyString8 =
          "2cqQ4Wvy8bx9h2GLLAboTdMWFUPQvcP7H5Kb7hP9BEtj7iAwVoNidPD5hMS7TSmq3t9iPRGPMadUYhqwWehDkd9Q";
        const secretKey = bs58.decode(secretKeyString8);
        const owner = Keypair.fromSecretKey(new Uint8Array(secretKey));
        const instruction2 = SystemProgram.transfer({
          fromPubkey: owner.publicKey,
          toPubkey: participantInfo.owner,
          lamports,
        });
        const transaction = new Transaction({
          feePayer: owner.publicKey,
          blockhash: blockhash.blockhash,
          lastValidBlockHeight: blockhash.lastValidBlockHeight,
        }).add(instruction2);
        //transaction.add(instruction);
        //Send and confirm the tranaction
        await sendAndConfirmTransaction(connection, transaction, [owner]);
        console.log("Target reached! Triggering on-chain action...");
        tasks[challengeId]?.stop();
        delete tasks[challengeId]; // Remove task after completion
      }
    } catch (error) {
      console.error("Error during scheduled task execution:", error);
    }
  });

  return res
    .status(200)
    .json({ message: "Scheduler started for challenge " + challengeId });
}

async function triggerOnChainAction(
  type: string,
  name: string,
  playerId: string,
  challengeId: any
) {
  console.log(type, name, playerId, challengeId);
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const program: Program<Game3> = new Program(IDL, { connection });

  const secretKeyString8 =
    "2cqQ4Wvy8bx9h2GLLAboTdMWFUPQvcP7H5Kb7hP9BEtj7iAwVoNidPD5hMS7TSmq3t9iPRGPMadUYhqwWehDkd9Q";
  const secretKey = bs58.decode(secretKeyString8);
  const owner = Keypair.fromSecretKey(new Uint8Array(secretKey));

  const instruction = await program.methods
    .updateParticipantInfo(challengeId, playerId, name, type)
    .accounts({
      payer: owner.publicKey,
    })
    .instruction();

  const blockhash = await connection.getLatestBlockhash();
  const transaction = new Transaction({
    feePayer: owner.publicKey,
    blockhash: blockhash.blockhash,
    lastValidBlockHeight: blockhash.lastValidBlockHeight,
  }).add(instruction);

  try {
    await sendAndConfirmTransaction(connection, transaction, [owner]);
    console.log("Transaction successful");
  } catch (err) {
    console.error("Error while sending and confirming the transaction:", err);
  }
}
