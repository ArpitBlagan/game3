// workers/pollWorker.js
const { parentPort, workerData } = require("worker_threads");
const { challengeId, matches } = workerData;
const { Connection, clusterApiUrl } = require("@solana/web3.js");
import axios from "axios";
const pollChallenge = async (challengeId: any, matches: any) => {
  // Polling logic for the challenge (replace with your actual logic)
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  let logsFetched = false;
  let retries = 0;
  const maxRetries = 10; // 5 minutes if polling everys 30 seconds

  while (!logsFetched && retries < maxRetries) {
    // Simulate fetching logs (Replace with actual log fetch logic)
    const logs = await connection.getLogs();
    const log = logs.find((log: any) =>
      log.includes(`Challenge with id ${challengeId} is ready for processing`)
    );

    if (log) {
      logsFetched = true;
      //call the schedule to keep checking participant stats...
      await axios.post("/api/schedule", { matches, challengeId });
      parentPort.postMessage({ success: true, data: log });
    } else {
      retries++;
      await new Promise((resolve) => setTimeout(resolve, 30000)); // Retry every 30 seconds
    }
  }

  if (!logsFetched) {
    parentPort.postMessage({
      success: false,
      error: "Timeout or challenge not found",
    });
  }
};

pollChallenge(challengeId, matches);
