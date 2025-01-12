import { ActionGetResponse, ACTIONS_CORS_HEADERS } from "@solana/actions";

import { useRouter } from "next/router";

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
