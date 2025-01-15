import { NextApiRequest, NextApiResponse } from "next";

import { Worker } from "worker_threads";
// Store tasks by challengeId to allow concurrent cron jobs
let tasks: { [key: string]: any } = {};

export async function GET(req: Request, res: NextApiResponse) {
  const url = new URL(req.url);
  const challengeId = Number(url.searchParams.get("challengeId"));
  const matches = Number(url.searchParams.get("matches"));
  console.log("hitted", challengeId, matches);
  if (isNaN(challengeId) || isNaN(matches)) {
    return res
      .status(400)
      .json({ message: "Invalid challengeId and matches type :(" });
  }
  if (tasks[challengeId]) {
    delete tasks[challengeId];
  }

  tasks[challengeId] = new Worker("./src/app/workers/poolPubg.js", {
    workerData: {
      challengeId,
      matches,
    },
  });
  return res
    .status(200)
    .json({ message: "Scheduler started for challenge " + challengeId });
}
