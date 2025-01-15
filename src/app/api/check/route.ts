import { Program } from "@coral-xyz/anchor";
const IDL = require("../../../../anchor/target/idl/game3.json");
import { Game3 } from "@project/anchor";
import {
  ActionGetResponse,
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
  createPostResponse,
} from "@solana/actions";
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";

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

export const GET = async () => {
  const actionMedata: ActionGetResponse = {
    icon: "https://img.freepik.com/premium-photo/pubg-character-with-m416-cyberpunk-neon-light-4k-image_783182-35.jpg?semt=ais_hybrid",
    title: "Check challange status 👀.",
    description: `Put the challenge Id and get to know about its status. Want to create your own challenege click here
      ${"http://localhost:3000/api/actions"}`,
    label: "Challenges",
    error: Error("Something went wrong :("),
    links: {
      actions: [
        {
          label: "Check",
          href: "http://localhost:3000/api/check?challengeId={challengeId}",
          type: "transaction",
          parameters: [
            {
              name: "challengeId",
              label: "Enter challenge id",
            },
          ],
        },
      ],
    },
  };
  return Response.json(actionMedata, {
    headers: ACTIONS_CORS_HEADERS,
    status: 200,
  });
};

export const POST = async (request: Request) => {
  const url = new URL(request.url);
  const challengeId: any = url.searchParams.get("challengeId");
  if (isNaN(challengeId)) {
    return Response.json(
      {
        message: "Please provide valid info about the challenge id :)",
      },
      {
        headers: ACTIONS_CORS_HEADERS,
        status: 403,
      }
    );
  }
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const program: Program<Game3> = new Program(IDL, { connection });
  const challengeIdBytes = Buffer.from(
    new Uint8Array(new Uint32Array([challengeId]).buffer)
  );
  const [accountPubkey] = await PublicKey.findProgramAddress(
    [Buffer.from("challenge"), challengeIdBytes],
    program.programId
  );
  console.log(accountPubkey);
  const challengeInfo = await program.account.challenge.fetch(accountPubkey);
  console.log(challengeInfo);
  if (challengeInfo) {
    //Listen upto when challenge have two participant.

    return Response.json(
      {
        type: "message",
        message: `Challenge name is ${challengeInfo.name},
        its about ${challengeInfo.description}. 
         the entry fee is or was ${challengeInfo.entryFee}
         status: ${challengeInfo.status} ${
          challengeInfo.status == "Completed" ? challengeInfo.winner : ""
        }`,
      },
      {
        headers: ACTIONS_CORS_HEADERS,
        status: 200,
      }
    );
  } else {
    const errorResponse = {
      type: "error",
      message: "Challenge not found :(",
    };
    return Response.json(errorResponse, {
      headers: ACTIONS_CORS_HEADERS,
      status: 500,
    });
  }
};

// export const GET = async (
//   request: NextApiRequest,
//   response: NextApiResponse
// ) => {
//   try {
//     const url = "https://api.pubg.com/shards/kakao/seasons";
//     const headers = {
//       accept: "application/vnd.api+json",
//       Authorization:
//         "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJlNDFiZmJhMC1iMjRiLTAxM2QtOTFiYy03NmJmYTJlMWNhYjIiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzM2NjAxMjU5LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6ImdhbWUzIn0.Rp_6ubzqzye5y6LPLzzFPBnMlrzRSvhWWt16_svylXI",
//     };
//     const res = await axios.get(url, { headers });
//     console.log(res.data);
//     return new Response(JSON.stringify(res.data), {
//       status: 200,
//       headers: {
//         "Content-Type": "application/json",
//       },
//     });
//   } catch (err) {
//     console.log(err);
//     response.status(500).json({ message: "Error while fetching :(." });
//   }
// };
