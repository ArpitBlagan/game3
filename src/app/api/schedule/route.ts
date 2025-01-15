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
import * as snarkjs from "snarkjs";
import axios from "axios";
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

  const [particpant1PubKey] = await PublicKey.findProgramAddress(
    [
      Buffer.from("participant"),
      challengeId.to_le_bytes().as_ref(),
      challengeInfo.participant1,
    ],
    program.programId
  );
  const [particpant2PubKey] = await PublicKey.findProgramAddress(
    [
      Buffer.from("participant"),
      challengeId.to_le_bytes().as_ref(),
      challengeInfo.participant2,
    ],
    program.programId
  );
  const participant1Info = await program.account.participant.fetch(
    particpant1PubKey
  );
  const participant2Info = await program.account.participant.fetch(
    particpant2PubKey
  );

  if (tasks[challengeId]) {
    return res
      .status(400)
      .json({ message: "Scheduler already running for this challenge" });
  }

  // Create a new cron task for this challenge
  tasks[challengeId] = cron.schedule("*/5 * * * *", async () => {
    try {
      let participant1Wins = 0;
      let participant2Wins = 0;
      const url = `https://api.pubg.com/shards/kakao/players/${participant1Info.playerId}`;
      const headers = {
        accept: "application/vnd.api+json",
        Authorization:
          "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJlNDFiZmJhMC1iMjRiLTAxM2QtOTFiYy03NmJmYTJlMWNhYjIiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzM2NjAxMjU5LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6ImdhbWUzIn0.Rp_6ubzqzye5y6LPLzzFPBnMlrzRSvhWWt16_svylXI",
      };
      const res = await axios.get(url, { headers });
      const tdmMatches = res.data.data.relationships.matches.data.map(
        (match: any) => match.type == "tdm"
      );
      const playerIdToCheck = [
        participant1Info.playerId,
        participant2Info.playerId,
      ];
      const { matchCount, winner, wins } = await checkMatches(
        tdmMatches,
        matches,
        playerIdToCheck,
        challengeInfo.startAt
      );
      if (winner && matchCount == matches) {
        const blockhash = await connection.getLatestBlockhash();
        //create a zkproof first
        //Create two isntruction
        //Verify the zkproof and update the challenge status to completed and show the winner info.
        const gamingStats = { participant1Wins, participant2Wins };

        // Generate proof  using zk-SNARKs based on gaming stats
        const { proof } = await snarkjs.groth16.fullProve(
          gamingStats,
          "circuit.wasm",
          "circuit_final.zkey"
        );
        // const instruction = program.methods.updateChallengeStats(
        //   challengeId,proof,participantInfo.owner
        // ).accounts(owner.publicKey).instruction()

        //Send the money to the winners account (after reducting some fee).
        const lamports = LAMPORTS_PER_SOL * 2;
        const secretKeyString8 =
          "2cqQ4Wvy8bx9h2GLLAboTdMWFUPQvcP7H5Kb7hP9BEtj7iAwVoNidPD5hMS7TSmq3t9iPRGPMadUYhqwWehDkd9Q";
        const secretKey = bs58.decode(secretKeyString8);
        const owner = Keypair.fromSecretKey(new Uint8Array(secretKey));
        const instruction2 = SystemProgram.transfer({
          fromPubkey: owner.publicKey,
          //replace with winner public key
          toPubkey: participant1Info.owner,
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

function checkMatches(
  tdmMatches: any[],
  matches: any,
  playerId: any,
  challengeStartAt: any
): { matchCount: any; winner: string | null; wins: any } {
  let matchCount = 0;
  let participant1 = 0;
  let participant2 = 0;
  tdmMatches.forEach(async (ele) => {
    try {
      const url = `https://api.pubg.com/shards/kakao/matches/${ele.id}`;
      const headers = {
        accept: "application/vnd.api+json",
        Authorization:
          "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJlNDFiZmJhMC1iMjRiLTAxM2QtOTFiYy03NmJmYTJlMWNhYjIiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzM2NjAxMjU5LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6ImdhbWUzIn0.Rp_6ubzqzye5y6LPLzzFPBnMlrzRSvhWWt16_svylXI",
      };
      const res = await axios.get(url, { headers });
      const matchTimestamp = new Date(
        res.data.data.attributes.createdAt
      ).getTime();
      const isCustom = res.data.data.attributes.isCustomMatch;
      if (
        matchCount < matches &&
        isCustom &&
        matchTimestamp >= challengeStartAt
      ) {
        let participants: any = [];
        const rosters = res.data.data.relationships.rosters.data;
        for (const roster of rosters) {
          if (roster.relationships && roster.relationships.participants) {
            const participantData = roster.relationships.participants.data;
            participantData.forEach((p: any) => {
              participants.push({
                id: p.id,
                winPlace: p.attributes.stats.winPlace, // Adjust this according to actual stats path
              });
            });
          }
        }
        if (
          participants.length == 2 &&
          participants.some((p: any) => p.id === playerId[0]) &&
          participants.some((p: any) => p.id === playerId[1])
        ) {
          const winner = participants.find((p: any) => p.winPlace === 1);
          if (winner.id == playerId[0]) {
            participant1++;
            matchCount++;
          } else if (winner.id == playerId[1]) {
            participant2++;
            matchCount++;
          }
        }
      } else {
        return {
          matchCount,
          wism: participant1 > participant2 ? playerId[0] : playerId[1],
          wins: participant1 > participant2 ? participant1 : participant2,
        };
      }
    } catch (err) {
      console.log(err);
      return { matchCount: 0, winner: null, wins: 0 };
    }
  });
  return { matchCount: 0, winner: null, wins: 0 };
}
