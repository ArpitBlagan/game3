import {
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
  createPostResponse,
} from "@solana/actions";
import * as bs58 from "bs58";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
const IDL = require("../../../../anchor/target/idl/game3.json");
export const OPTIONS = GET;
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import { Game3 } from "../../../../anchor/target/types/game3";

export async function GET(request: Request) {
  const actionMedata: ActionGetResponse = {
    icon: "https://img.freepik.com/premium-photo/pubg-character-with-m416-cyberpunk-neon-light-4k-image_783182-35.jpg?semt=ais_hybrid",
    title:
      "Challenge your friend for 1 vs 1 in tdm in Player Unkown Battel Ground (PUBG).",
    description: `Challenges are cool right but it becomes more intense when some money 
      gets involed right. Here is what we have to offer so lets say you want to challenge you friend you will create a 
      challenge set the no of matches, entry fee and other deatils. After creating a channle you paraticipate 
      in it with your valid account ID and user name then send the same link of the blink for that challenge to your friend. After that we
      will check your next X number of TDM matches with each other and who wins more of them will win the challenge 
      and entry fee of other will send to the winner. 
      We will start watching the matches result when the second participant particpate.
      }.`,
    label: "Challenges",
    error: Error("Something went wrong :("),
    links: {
      actions: [
        {
          label: "Create",
          href: "http://localhost:3000/api/actions?description={description}&name={name}&amount={amount}&matches={matches}",
          type: "transaction",
          parameters: [
            {
              name: "name",
              label: "Name the challenge",
            },
            { name: "description", label: "Challenge description" },

            {
              name: "amount",
              label: "Entry sol amount",
            },
            {
              name: "matches",
              label: "Number of matches",
            },
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
  console.log(name, description, amount);
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const body: ActionPostRequest = await request.json();

  try {
    let user = new PublicKey(body.account);
    console.log("user", user);
    const program: Program<Game3> = new Program(IDL, { connection });
    let challengeId = 0;
    const [accountPubkey] = await PublicKey.findProgramAddress(
      [Buffer.from("global-state")],
      program.programId
    );
    let accountInfo = null;
    try {
      const Info = await connection.getAccountInfo(accountPubkey);
      console.log("info", Info);
      accountInfo = Info;
    } catch (err) {
      console.log(err);
      throw new Error("account not found");
    }
    console.log("info", accountInfo);
    if (accountInfo) {
      //update teh challengeId;
      console.log(
        "Account found no need to worry just update the challenge id :)"
      );
      const challengeAccount = await program.account.globalState.fetch(
        accountPubkey
      );
      console.log("Id", challengeAccount);
      challengeId = challengeAccount.challengeId + 1;
    } else {
      const secretKeyString8 =
        "2cqQ4Wvy8bx9h2GLLAboTdMWFUPQvcP7H5Kb7hP9BEtj7iAwVoNidPD5hMS7TSmq3t9iPRGPMadUYhqwWehDkd9Q";
      const secretKey = bs58.decode(secretKeyString8);
      const owner = Keypair.fromSecretKey(new Uint8Array(secretKey));
      //intitialize the account
      console.log("Global state account not found lets create new one.");
      const instruction = await program.methods
        .initializeChallengeState()
        .accounts({ payer: owner.publicKey })
        .instruction();
      const blockhash = await connection.getLatestBlockhash();
      const transaction = new Transaction({
        feePayer: owner.publicKey,
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
      }).add(instruction);
      try {
        await sendAndConfirmTransaction(connection, transaction, [owner]);
        console.log("successfully created a account :)");
      } catch (err) {
        console.log(err);
        throw new Error("Not able to send and confirm the transaction...");
      }
    }
    const instruction = await program.methods
      .createChallenge(challengeId, name, description, amount)
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
          "Transaction created successfully :). Now you and friend can participate using this url:http://localhost:3000//api/participate",
        links: {
          next: {
            type: "inline",
            action: {
              type: "action",
              icon: "https://img.freepik.com/premium-photo/pubg-character-with-m416-cyberpunk-neon-light-4k-image_783182-35.jpg?semt=ais_hybrid",
              label: "Participate",
              title: "Participate in Challenge",
              description: `Enter the challenge just in ${amount} sol and share the link with your friend with whom
            you want to play the challenge. Here is the link to participate init: http://localhost:3000/api/participate?challengeId=${challengeId}&name=${name}&description=${description}&amount=${amount}`,
            },
          },
        },
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
