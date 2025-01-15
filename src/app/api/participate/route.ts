import { Program } from "@coral-xyz/anchor";
import {
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
  createPostResponse,
} from "@solana/actions";
import { Worker } from "node:worker_threads";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
const IDL = require("../../../../anchor/target/idl/game3.json");
import { Game3 } from "../../../../anchor/target/types/game3";

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*", // Or specific origin
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
    status: 204, // No content
  });
}
export async function GET(request: Request) {
  const url = new URL(request.url);
  const challengeId = Number(url.searchParams.get("challengeId"));
  const name = url.searchParams.get("name");
  const description = url.searchParams.get("description");
  const amount = Number(url.searchParams.get("amount"));
  const matches = Number(url.searchParams.get("matches"));
  if (!name || !description || !amount || !matches) {
    return Response.json(
      {
        message:
          "Please provide valid info about the challenge ex: its name ,description and min entry sol :)",
      },
      {
        headers: ACTIONS_CORS_HEADERS,
        status: 500,
      }
    );
  }
  const actionMedata: ActionGetResponse = {
    icon: "https://img.freepik.com/premium-photo/pubg-character-with-m416-cyberpunk-neon-light-4k-image_783182-35.jpg?semt=ais_hybrid",
    title: name + "Just join in for " + amount + " sol",
    description: description + "Challenge ID is " + challengeId,
    label: "Participate",
    error: Error("Something went wrong :("),
    links: {
      actions: [
        {
          label: "Participate",
          href: `http://localhost:3000/api/participate?name={name}&accountId={accountId}&challengeId=${challengeId}&matches=${matches}`,
          type: "transaction",
          parameters: [
            {
              name: "name",
              label: "User name ",
            },
            { name: "accountId", label: "Enter account ID" },
          ],
        },
      ],
    },
  };
  return Response.json(actionMedata, {
    headers: ACTIONS_CORS_HEADERS,
    status: 200,
  });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const name = url.searchParams.get("name");
  const accountId = Number(url.searchParams.get("accountId"));
  const challengeId = Number(url.searchParams.get("challengeId"));
  const amount = Number(url.searchParams.get("amount"));
  const matches = Number(url.searchParams.get("matches"));
  if (!name || isNaN(accountId) || isNaN(challengeId) || isNaN(amount)) {
    return Response.json(
      { message: "Please provide valid info like user name and account id :(" },
      { status: 403, headers: ACTIONS_CORS_HEADERS }
    );
  }
  //First the name and accountId is a valid one or not
  // try {
  //   const url = `https://api.pubg.com/shards/kakao/players/${accountId}`;
  //   const headers = {
  //     accept: "application/vnd.api+json",
  //     Authorization:
  //       "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJlNDFiZmJhMC1iMjRiLTAxM2QtOTFiYy03NmJmYTJlMWNhYjIiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzM2NjAxMjU5LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6ImdhbWUzIn0.Rp_6ubzqzye5y6LPLzzFPBnMlrzRSvhWWt16_svylXI",
  //   };
  //   await axios.get(url, { headers });
  //   console.log("Player found :)");
  // } catch (err) {
  //   console.log("Player with particular accountId not found", err);
  //   return Response.json(
  //     { message: "Please provide valid info like user name and account id :(" },
  //     { status: 403, headers: ACTIONS_CORS_HEADERS }
  //   );
  // }
  // First put create partcipant and participate in challenge with given challengeId instruction
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const body: ActionPostRequest = await request.json();
  try {
    let user = new PublicKey(body.account);
    console.log("user", user);
    const program: Program<Game3> = new Program(IDL, { connection });

    const instruction = await program.methods
      .createParticipant(challengeId, name, accountId)
      .accounts({
        payer: user,
      })
      .instruction();

    const blockhash = await connection.getLatestBlockhash();
    const lamports = amount * 1e9;
    const owner = new PublicKey("DHhk6gcPzzavCbq4YywZUjLfdBxgjbNFkPVgdad3BEqH");
    const instruction2 = SystemProgram.transfer({
      fromPubkey: user,
      toPubkey: owner,
      lamports,
    });
    const transaction = new Transaction({
      feePayer: user,
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
    }).add(instruction);
    transaction.add(instruction2);
    const response: ActionPostResponse = await createPostResponse({
      fields: {
        transaction: transaction,
        type: "transaction",
        message: `Participated in the challenge successfully :). Now when both the participant 
          have participated the challenge will start`,
      },
    });
    console.log(response);
    const worker = new Worker("./src/pool.ts"); // Path to the worker file

    // Send the challengeId and matches to the worker
    worker.postMessage({ challengeId, matches });
    //Listen upto when challenge have two participant.
    return Response.json(response, {
      headers: ACTIONS_CORS_HEADERS,
      status: 200,
    });
  } catch (err) {
    console.log("error", err);
    const errorResponse = {
      type: "error",
      message: "An unknown error occurred and something went wrong :(",
    };
    return Response.json(errorResponse, {
      headers: ACTIONS_CORS_HEADERS,
      status: 500,
    });
  }
}
