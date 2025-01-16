"use client";

import { getGame3Program, getGame3ProgramId } from "@project/anchor";
import { useConnection } from "@solana/wallet-adapter-react";
import { Cluster, Keypair, PublicKey } from "@solana/web3.js";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import toast from "react-hot-toast";
import { useCluster } from "../cluster/cluster-data-access";
import { useAnchorProvider } from "../solana/solana-provider";
import { useTransactionToast } from "../ui/ui-layout";
import { Game3 } from "../../../anchor/target/types/game3";
export function useGame3Program() {
  const { connection } = useConnection();
  const { cluster } = useCluster();
  const transactionToast = useTransactionToast();
  const provider = useAnchorProvider();
  const programId = useMemo(
    () => getGame3ProgramId(cluster.network as Cluster),
    [cluster]
  );
  const program = useMemo(
    () => getGame3Program(provider, programId),
    [provider, programId]
  );

  const accounts = useQuery({
    queryKey: ["game3", "all", { cluster }],
    queryFn: () => program.account.challenge.all(),
  });

  const getProgramAccount = useQuery({
    queryKey: ["get-program-account", { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  });

  return {
    program,
    programId,
    accounts,
    getProgramAccount,
  };
}

export function useGame3ProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster();
  const transactionToast = useTransactionToast();
  const { program, accounts } = useGame3Program();

  const accountQuery = useQuery({
    queryKey: ["game3", "fetch", { cluster, account }],
    queryFn: () => program.account.challenge.fetch(account),
  });

  return {
    accountQuery,
  };
}
