// src/app/api/worker.ts
const { workerData } = require("worker_threads");
const { Program } = require("@coral-xyz/anchor");
const {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} = require("@solana/web3.js");
const cron = require("node-cron");
const axios = require("axios");
let task = null;
// import * as snarkjs from "snarkjs";
// import base58 from "bs58";
const IDL = require("../../../anchor/target/idl/game3.json");

const { challengeId, matches } = workerData;

const startCronJob = async () => {
  console.log(
    "Worker started with challengeId and matches.",
    challengeId,
    matches
  );
  // Get access to challenge's one participant's info
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const program = new Program(IDL, { connection });
  try {
    const challengeIdBytes = Buffer.from(
      new Uint8Array(new Uint32Array([challengeId]).buffer)
    );
    // Find challenge info
    const [accountPubkey] = await PublicKey.findProgramAddress(
      [Buffer.from("challenge"), challengeIdBytes],
      program.programId
    );
    const challengeInfo = await program.account.challenge.fetch(accountPubkey);
    console.log("ChallengeInfo found", challengeInfo);
    const [particpant1PubKey] = await PublicKey.findProgramAddress(
      [
        Buffer.from("participant"),
        challengeIdBytes,
        new PublicKey(challengeInfo.participant1).toBuffer(),
      ],
      program.programId
    );
    const [particpant2PubKey] = await PublicKey.findProgramAddress(
      [
        Buffer.from("participant"),
        challengeIdBytes,
        new PublicKey(challengeInfo.participant2).toBuffer(),
      ],
      program.programId
    );
    const participant1Info = await program.account.participant.fetch(
      particpant1PubKey
    );
    const participant2Info = await program.account.participant.fetch(
      particpant2PubKey
    );
    console.log("Participant info", participant1Info, participant2Info);
    // Create a new cron task for this challenge
    task = cron.schedule("*/5 * * * *", async () => {
      console.log("checking stats :)");
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
          (match) => match.type == "tdm"
        );
        const playerIdToCheck = [
          participant1Info.playerId,
          participant2Info.playerId,
        ];
        const { matchCount, winner, wins } = await checkMatches(
          tdmMatches,
          matches,
          playerIdToCheck,
          challengeInfo.startTime
        );
        if (winner && matchCount == matches) {
          // const blockhash = await connection.getLatestBlockhash();
          //create a zkproof first
          //Create two isntruction
          //Verify the zkproof and update the challenge status to completed and show the winner info.
          // const gamingStats = { participant1Wins, participant2Wins };

          // // Generate proof  using zk-SNARKs based on gaming stats
          // const { proof } = await snarkjs.groth16.fullProve(
          //   gamingStats,
          //   "circuit.wasm",
          //   "circuit_final.zkey"
          // );
          // const instruction = program.methods.updateChallengeStats(
          //   challengeId,proof,participantInfo.owner
          // ).accounts(owner.publicKey).instruction()

          //Send the money to the winners account (after reducting some fee).
          // const lamports = LAMPORTS_PER_SOL * 2;
          // const secretKeyString8 =
          //   "2cqQ4Wvy8bx9h2GLLAboTdMWFUPQvcP7H5Kb7hP9BEtj7iAwVoNidPD5hMS7TSmq3t9iPRGPMadUYhqwWehDkd9Q";
          // const secretKey = base58.decode(secretKeyString8);
          // const owner = Keypair.fromSecretKey(new Uint8Array(secretKey));
          // const instruction2 = SystemProgram.transfer({
          //   fromPubkey: owner.publicKey,
          //   //replace with winner public key
          //   toPubkey: participant1Info.owner,
          //   lamports,
          // });
          // const transaction = new Transaction({
          //   feePayer: owner.publicKey,
          //   blockhash: blockhash.blockhash,
          //   lastValidBlockHeight: blockhash.lastValidBlockHeight,
          // }).add(instruction2);
          // //transaction.add(instruction);
          // //Send and confirm the tranaction
          // await sendAndConfirmTransaction(connection, transaction, [owner]);
          console.log("Target reached! Triggering on-chain action...");
          task.stop();
        }
      } catch (error) {
        task.stop();
        console.log(error);
        console.error("Error during scheduled task execution:");
        return;
      }
    });
    task.start();
  } catch (err) {
    console.log("Error while fetching challenge and participants info :(");
    return;
  }
};

// Start the cron job
startCronJob();
function checkMatches(tdmMatches, matches, playerId, challengeStartAt) {
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
        let participants = [];
        const rosters = res.data.data.relationships.rosters.data;
        for (const roster of rosters) {
          if (roster.relationships && roster.relationships.participants) {
            const participantData = roster.relationships.participants.data;
            participantData.forEach((p) => {
              participants.push({
                id: p.id,
                winPlace: p.attributes.stats.winPlace, // Adjust this according to actual stats path
              });
            });
          }
        }
        if (
          participants.length == 2 &&
          participants.some((p) => p.id === playerId[0]) &&
          participants.some((p) => p.id === playerId[1])
        ) {
          const winner = participants.find((p) => p.winPlace === 1);
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
      console.log("Error while iterating the tdm matches history");
      return new Error("Not able to fetch matches info something went wrong");
    }
  });
  return { matchCount: 0, winner: null, wins: 0 };
}
