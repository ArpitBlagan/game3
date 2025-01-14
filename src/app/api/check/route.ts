import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";

export const GET = async (
  request: NextApiRequest,
  response: NextApiResponse
) => {
  try {
    const url = "https://api.pubg.com/shards/steam/seasons";
    const headers = {
      accept: "application/vnd.api+json",
      Authorization:
        "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJlNDFiZmJhMC1iMjRiLTAxM2QtOTFiYy03NmJmYTJlMWNhYjIiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzM2NjAxMjU5LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6ImdhbWUzIn0.Rp_6ubzqzye5y6LPLzzFPBnMlrzRSvhWWt16_svylXI",
    };
    const res = await axios.get(url, { headers });
    console.log(res.data);
    return new Response(JSON.stringify(res.data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.log(err);
    response.status(500).json({ message: "Error while fetching :(." });
  }
};
