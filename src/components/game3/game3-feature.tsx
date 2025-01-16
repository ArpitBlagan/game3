"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "../solana/solana-provider";
import { AppHero, ellipsify } from "../ui/ui-layout";
import { ExplorerLink } from "../cluster/cluster-ui";
import { useGame3Program } from "./game3-data-access";
import { Game3List } from "./game3-ui";

export default function Game3Feature() {
  const { publicKey } = useWallet();
  const { programId } = useGame3Program();

  return publicKey ? (
    <div>
      <AppHero
        title="Game3"
        subtitle={`Hey welcome to Game3 a place where user can create challenge their friends or rivaly for 1 vs 1 pubg mobilde TDM matches, here you can see the challenges that are their and about other info like its status, description etc.
          want to create a challenge and play with your friend here is blink link for it:  Enjoy gaming 😁.`}
      >
        <p className="text-2xl font-semibold">
          Want to create you own challenge and play with your friend here is the
          blink link for it:{" "}
          <a
            href="http://localhost:3000/api/actions"
            className="text-blue-400 underline font-semibold"
            target="_blank"
          >
            Link
          </a>
        </p>
        <p className="mb-6">
          <ExplorerLink
            path={`account/${programId}`}
            label={ellipsify(programId.toString())}
          />
        </p>
      </AppHero>
      <Game3List />
    </div>
  ) : (
    <div className="max-w-4xl mx-auto">
      <div className="hero py-[64px]">
        <div className="hero-content text-center">
          <WalletButton />
        </div>
      </div>
    </div>
  );
}
