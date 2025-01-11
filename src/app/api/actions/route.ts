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
import { BN, Program } from "@coral-xyz/anchor";
import { Game3 } from "../../../../anchor/target/types/game3";
export async function GET(request: Request) {
  const actionMedata: ActionGetResponse = {
    icon: "https://img.freepik.com/premium-photo/pubg-character-with-m416-cyberpunk-neon-light-4k-image_783182-35.jpg?semt=ais_hybrid",
    title: "Challenge your friend for 1 vs 1 in tdm in PUBG",
    description: `Challenges are cool right but it becomes more intense when some money 
      gets involed right so here the solution for it create a challenge put the entry sol and 
      send the link to your friend to accept the challenge and who ever won it get the entry fee of other user`,
    label: "Challenges",
    // error: Error(""),
    links: {
      actions: [
        {
          label: "Create",
          href: "http://localhost:3000/api/actions?type=create&name={name}&amount={amount}&description={description}",
          type: "transaction",
          parameters: [
            {
              name: "amount", // field name
              label: "SOL amount", // text input placeholder
            },
            {
              name: "name",
              label: "Name the challenge",
            },
            { name: "descriptino", label: "Challenge description" },
          ],
        },
      ],
    },
    // disabled: false,
  };
  return Response.json(actionMedata, { headers: ACTIONS_CORS_HEADERS });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const name = url.searchParams.get("name");
  const description = url.searchParams.get("description");
  const amount = url.searchParams.get("amount");
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const body: ActionPostRequest = await request.json();
  let user;
  try {
    user = new PublicKey(body.account);
  } catch (err) {
    return Response.json(
      { message: "Not a valid account" },
      { headers: ACTIONS_CORS_HEADERS }
    );
  }
  const program: Program<Game3> = new Program(IDL, { connection });
  const instruction = await program.methods
    //@ts-ignore
    .createChallenge(name, description, amount, "")
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

  const response = await createPostResponse({
    fields: {
      transaction: transaction,
      type: "transaction",
    },
  });

  return Response.json(response, { headers: ACTIONS_CORS_HEADERS });
}
