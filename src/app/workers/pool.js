// src/app/api/pool.ts
const { parentPort, workerData } = require("worker_threads");
const { Connection, clusterApiUrl, PublicKey } = require("@solana/web3.js");
const axios = require("axios");
const { Program } = require("@coral-xyz/anchor");
const IDL = require("../../../anchor/target/idl/game3.json"); // Adjust path as necessary

const { challengeId, matches } = workerData;

const pollChallenge = async (challengeId, matches) => {
  console.log(challengeId, matches);
  let logsFetched = false;
  let retries = 0;
  const maxRetries = 10; // 5 minutes if polling every 30 seconds
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const program = new Program(IDL, { connection });

  const challengeIdBytes = Buffer.from(
    new Uint8Array(new Uint32Array([challengeId]).buffer)
  );

  const [accountPubkey] = await PublicKey.findProgramAddress(
    [Buffer.from("challenge"), challengeIdBytes],
    program.programId
  );

  while (!logsFetched && retries < maxRetries) {
    console.log("Checking for transactions...");
    console.log(accountPubkey);
    const signatures = await connection.getSignaturesForAddress(
      program.programId
    );

    // Look for a specific log message in the signatures
    const logMessage = `Challenge with id ${challengeId} is ready for processing`;
    const matchingSignature = await Promise.all(
      signatures.map(async (signatureInfo) => {
        // Fetch transaction details for each signature
        const transaction = await connection.getTransaction(
          signatureInfo.signature
        );

        // Check if the transaction exists and contains logs
        if (transaction && transaction.meta && transaction.meta.logMessages) {
          // Check if the desired log message is present
          if (
            transaction.meta.logMessages.some((log) => log.includes(logMessage))
          ) {
            return signatureInfo.signature; // Return the matching signature
          }
        }
        return null; // No match found
      })
    );

    // Filter out null values (non-matching signatures)
    const foundSignatures = matchingSignature.filter(
      (signature) => signature !== null
    );

    if (foundSignatures.length > 0) {
      console.log(
        "Matching Signatures now sending request to start pooling pubg mobile server to get participatns stats"
      );

      logsFetched = true;

      const res = await axios.get(
        `http://localhost:3000/api/schedule?matches=${matches}&challengeId=${challengeId}`
      );

      break;
    } else {
      console.log("No matching signatures found.");
      retries++;
      await new Promise((resolve) => setTimeout(resolve, 30000)); // Retry every 30 seconds
    }
  }

  return;
};

// Call the function with the provided parameters
pollChallenge(challengeId, matches);
