const base58 = require("bs58");

// src/app/api/worker.ts
const { workerData } = require("worker_threads");
const { Program } = require("@coral-xyz/anchor");
const snarkjs = require("snarkjs");
const path = require("path");
const wasmPath = path.join(
  __dirname,
  "../../../build/circuits",
  "PlayerStats.wasm"
);
const zkeyPath = path.join(
  __dirname,
  "../../../build/circuits",
  "PlayerStats_final.zkey"
);
const { buildBn128, utils } = require("ffjavascript");
const { unstringifyBigInts } = utils;
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
        const { matchCount, winner, participant1, participant2 } = checkMatches(
          tdmMatches,
          matches,
          playerIdToCheck,
          challengeInfo.startTime
        );
        if (winner && matchCount == matches) {
          const blockhash = await connection.getLatestBlockhash();
          // create a zkproof first
          // Create two isntruction
          // Verify the zkproof and update the challenge status to completed and show the winner info.
          const input = { a: participant1, b: participant2 };

          // Generate proof  using zk-SNARKs based on gaming stats

          let { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            wasmPath,
            zkeyPath
          );

          console.log(publicSignals);
          console.log(proof);
          let curve = await buildBn128();
          let proofProc = unstringifyBigInts(proof);
          publicSignals = unstringifyBigInts(publicSignals);

          let pi_a = g1Uncompressed(curve, proofProc.pi_a);
          let pi_a_0_u8_array = Array.from(pi_a);
          console.log(pi_a_0_u8_array);

          // pi_a = reverseEndianness(pi_a)
          // pi_a = negateG1(curve, pi_a); // Negate pi_a
          // pi_a = reverseEndianness(pi_a); // Reverse endianness of negated pi_a

          const pi_b = g2Uncompressed(curve, proofProc.pi_b);
          let pi_b_0_u8_array = Array.from(pi_b);
          console.log(pi_b_0_u8_array.slice(0, 64));
          console.log(pi_b_0_u8_array.slice(64, 128));

          const pi_c = g1Uncompressed(curve, proofProc.pi_c);
          let pi_c_0_u8_array = Array.from(pi_c);
          console.log(pi_c_0_u8_array);

          // Assuming publicSignals has only one element
          const publicSignalsBuffer = to32ByteBuffer(BigInt(publicSignals[0]));
          let public_signal_0_u8_array = Array.from(publicSignalsBuffer);
          console.log(public_signal_0_u8_array);

          const serializedData = Buffer.concat([
            pi_a,
            pi_b,
            pi_c,
            publicSignalsBuffer,
          ]);
          const secretKeyString8 =
            "2cqQ4Wvy8bx9h2GLLAboTdMWFUPQvcP7H5Kb7hP9BEtj7iAwVoNidPD5hMS7TSmq3t9iPRGPMadUYhqwWehDkd9Q";
          const secretKey = base58.decode(secretKeyString8);
          const owner = Keypair.fromSecretKey(new Uint8Array(secretKey));
          const instruction = program.methods
            .updateChallengeStats(
              challengeId,
              serializedData,
              participant1Info.owner
            )
            .accounts(owner.publicKey)
            .instruction();

          // Send the money to the winners account (after reducting some fee).
          const lamports = LAMPORTS_PER_SOL * 2;

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
          transaction.add(instruction);
          //Send and confirm the tranaction
          await sendAndConfirmTransaction(connection, transaction, [owner]);

          console.log("Target reached! Triggering on-chain action...");
          task.stop();
          return;
        }
      } catch (error) {
        console.log(error);
        console.error("Error during scheduled task execution:");
        task.stop();
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
          winner: participant1 > participant2 ? playerId[0] : playerId[1],
          participant1,
          participant2,
        };
      }
    } catch (err) {
      console.log("Error while iterating the tdm matches history");
      return new Error("Not able to fetch matches info something went wrong");
    }
  });
  return { matchCount: 0, winner: null, participant1, participant2 };
}

function g1Uncompressed(curve, p1Raw) {
  let p1 = curve.G1.fromObject(p1Raw);

  let buff = new Uint8Array(64); // 64 bytes for G1 uncompressed
  curve.G1.toRprUncompressed(buff, 0, p1);

  return Buffer.from(buff);
}

function g2Uncompressed(curve, p2Raw) {
  let p2 = curve.G2.fromObject(p2Raw);

  let buff = new Uint8Array(128); // 128 bytes for G2 uncompressed
  curve.G2.toRprUncompressed(buff, 0, p2);

  return Buffer.from(buff);
}

function to32ByteBuffer(bigInt) {
  const hexString = bigInt.toString(16).padStart(64, "0");
  const buffer = Buffer.from(hexString, "hex");
  return buffer;
}
