import { Worker } from "worker_threads";
export async function GET(req: Request) {
  try {
    const worker = new Worker("./src/app/workers/pool.js", {
      workerData: {
        challengeId: 1,
        matches: 3,
      },
    });
    return Response.json({ messsage: "worker started successfully :)" });
  } catch (err) {
    console.log(err);
    return Response.json({ message: "Error while starting the worker :(" });
  }
}
