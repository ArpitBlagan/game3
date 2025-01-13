import { Program } from "@coral-xyz/anchor";
import {
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
  createPostResponse,
} from "@solana/actions";
import {
  clusterApiUrl,
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
const IDL = require("../../../../anchor/target/idl/game3.json");
import { Game3 } from "../../../../anchor/target/types/game3";
export const OPTIONS = GET;
export async function GET(request: Request) {
  const url = new URL(request.url);
  const challengeId = url.searchParams.get("challengeId");
  const name = url.searchParams.get("name");
  const description = url.searchParams.get("description");
  const amount = Number(url.searchParams.get("amount"));
  if (!name || !description || !amount) {
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
    title: name + "Just join in for " + amount + "sol",
    description: description + "Challenge ID is" + challengeId,
    label: "Participate",
    error: Error("Something went wrong :("),
    links: {
      actions: [
        {
          label: "Participate",
          href: `http://localhost:3000/api/participate?name={name}&accountId={accountId}&challengeId=${challengeId}`,
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
  console.log("Hitting get request :)");
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
  if (!name || !accountId || !challengeId) {
    return Response.json(
      { message: "Please provide valid info like user name and account id :(" },
      { status: 403, headers: ACTIONS_CORS_HEADERS }
    );
  }
  // First put create partcipant instruction
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

    const transaction = new Transaction({
      feePayer: user,
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
    }).add(instruction);

    const response: ActionPostResponse = await createPostResponse({
      fields: {
        transaction: transaction,
        type: "transaction",
        message:
          "Participated in the challenge  successfully :). Now when both the participant have participated the challenge will start",
      },
    });
    console.log(response);
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
