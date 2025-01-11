/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/game3.json`.
 */
export type Game3 = {
  address: "DEjo3Tdg9vsXKY4CHv97WWXEPAFzHRMe6Z8BgczX6moB";
  metadata: {
    name: "game3";
    version: "0.1.0";
    spec: "0.1.0";
    description: "Created with Anchor";
  };
  instructions: [
    {
      name: "createChallenge";
      discriminator: [238, 243, 211, 163, 179, 4, 85, 64];
      accounts: [
        {
          name: "challengeAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [99, 104, 97, 108, 108, 101, 110, 103, 101];
              },
              {
                kind: "arg";
                path: "challengeId";
              }
            ];
          };
        },
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "name";
          type: "string";
        },
        {
          name: "descritpion";
          type: "string";
        },
        {
          name: "entryFee";
          type: "u32";
        }
      ];
    },
    {
      name: "createParticipant";
      discriminator: [206, 214, 20, 200, 254, 25, 244, 152];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "participantAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [112, 97, 114, 116, 105, 99, 105, 112, 97, 110, 116];
              },
              {
                kind: "arg";
                path: "challengeId";
              },
              {
                kind: "account";
                path: "payer";
              }
            ];
          };
        },
        {
          name: "challengeAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [99, 104, 97, 108, 108, 101, 110, 103, 101];
              },
              {
                kind: "account";
                path: "payer";
              },
              {
                kind: "arg";
                path: "challengeId";
              }
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "userName";
          type: "string";
        },
        {
          name: "playerId";
          type: "u32";
        }
      ];
    },
    {
      name: "deleteParticipant";
      discriminator: [12, 30, 139, 106, 80, 104, 147, 253];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "participantAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [112, 97, 114, 116, 105, 99, 105, 112, 97, 110, 116];
              },
              {
                kind: "arg";
                path: "challengeId";
              },
              {
                kind: "account";
                path: "payer";
              }
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "participantId";
          type: "u32";
        }
      ];
    },
    {
      name: "finishChallenge";
      discriminator: [94, 22, 255, 127, 158, 199, 125, 68];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "challengeAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [99, 104, 97, 108, 108, 101, 110, 103, 101];
              },
              {
                kind: "arg";
                path: "challengeId";
              }
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "challengeId";
          type: "u32";
        }
      ];
    },
    {
      name: "updateParticipantInfo";
      discriminator: [83, 149, 143, 185, 46, 238, 231, 251];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "participantAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [112, 97, 114, 116, 105, 99, 105, 112, 97, 110, 116];
              },
              {
                kind: "arg";
                path: "participantId";
              },
              {
                kind: "account";
                path: "payer";
              }
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "playerId";
          type: "string";
        },
        {
          name: "userName";
          type: "string";
        },
        {
          name: "typee";
          type: "string";
        }
      ];
    }
  ];
  accounts: [
    {
      name: "challenge";
      discriminator: [119, 250, 161, 121, 119, 81, 22, 208];
    },
    {
      name: "participant";
      discriminator: [32, 142, 108, 79, 247, 179, 54, 6];
    }
  ];
  errors: [
    {
      code: 6000;
      name: "participantLimitExceeded";
      msg: "The challenge already has two participants.";
    }
  ];
  types: [
    {
      name: "challenge";
      type: {
        kind: "struct";
        fields: [
          {
            name: "owner";
            type: "pubkey";
          },
          {
            name: "name";
            type: "string";
          },
          {
            name: "descritpion";
            type: "string";
          },
          {
            name: "entryFee";
            type: "u32";
          },
          {
            name: "startAt";
            type: {
              option: "u32";
            };
          },
          {
            name: "endAt";
            type: {
              option: "u32";
            };
          },
          {
            name: "participant1";
            type: {
              option: "pubkey";
            };
          },
          {
            name: "participant2";
            type: {
              option: "pubkey";
            };
          }
        ];
      };
    },
    {
      name: "participant";
      type: {
        kind: "struct";
        fields: [
          {
            name: "owner";
            type: "pubkey";
          },
          {
            name: "userName";
            type: "string";
          },
          {
            name: "wins";
            type: "u32";
          },
          {
            name: "losses";
            type: "u32";
          },
          {
            name: "playerId";
            type: "u32";
          }
        ];
      };
    }
  ];
};
