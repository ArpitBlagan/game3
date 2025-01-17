
#![allow(clippy::result_large_err)]
use anchor_lang::prelude::*;
use groth16_solana::groth16::{Groth16Verifyingkey, Groth16Verifier};
use borsh::{BorshDeserialize, BorshSerialize};

declare_id!("C5uvm3Vx21r3Joom7h4bRtHBmfPbpbHW1fxnnTa1Wupj");
const NR_PUBLIC_INPUTS: usize = 1; 

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Groth16Proof {
    pub proof_a: [u8; 64],           // Adjust size based on your proof's structure
    pub proof_b: [[u8; 32]; 2],      // Adjust size based on your proof's structure
    pub proof_c: [u8; 64],           // Adjust size based on your proof's structure
    pub public_inputs: [[u8; 32]; NR_PUBLIC_INPUTS], // Public inputs for verification
}

#[program]
pub mod game3 {
    use super::*;

    pub fn create_challenge(ctx: Context<CreateChallenge>, challenge_id: u32, name: String, description: String, entry_fee: u32) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge_account;
        let global_state_account = &mut ctx.accounts.global_state;
        challenge.owner = ctx.accounts.payer.key();
        challenge.name = name;
        challenge.description = description;
        challenge.entry_fee = entry_fee;
        challenge.status = Some("Yet to start.".to_string());
        global_state_account.challenge_id = challenge_id;
        global_state_account.challenge_key = Some(challenge.key());
        Ok(())
    }

    pub fn create_participant(ctx: Context<CreateParticipant>, challenge_id: u32, user_name: String, player_id: u32) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge_account;
        let participant_account = &mut ctx.accounts.participant_account;

        if challenge.participant1.is_some() && challenge.participant2.is_some() {
            participant_account.owner = Pubkey::default();
            participant_account.user_name.clear();
            participant_account.player_id = 0;
            msg!("Participant data has been cleared.");
            return Err(ErrorCode::ParticipantLimitExceeded.into());
        }

        // Add the participant to the challenge
        if challenge.participant1.is_none() {
            participant_account.owner = ctx.accounts.payer.key();
            participant_account.user_name = user_name;
            participant_account.player_id = player_id;
            challenge.participant1 = Some(ctx.accounts.payer.key());
        } else if challenge.participant2.is_none() {
            participant_account.owner = ctx.accounts.payer.key();
            participant_account.user_name = user_name;
            participant_account.player_id = player_id;
            challenge.participant2 = Some(ctx.accounts.payer.key());
            challenge.status = Some("Started (In progress).".to_string());
            challenge.startTime = Some(Clock::get()?.unix_timestamp);
            msg!("Challenge with id {} is ready for processing", challenge_id);
        }

        Ok(())
    }


    pub fn update_challenge_status(ctx: Context<UpdateStats>, challenge_id: u32, instruction_data: Groth16Proof, winner: Pubkey) -> Result<()> {
        let challenge_account = &mut ctx.accounts.challenge_account;

        // Ensure instruction_data is long enough
        // if instruction_data.len() < 256 {
        //     return Err(ProgramError::InvalidArgument.into());
        // }

        // Deserialize instruction data
        // let proof_a: [u8; 64] = instruction_data[0..64].try_into().map_err(|_| ProgramError::InvalidArgument.into())?;
        // let proof_b: [[u8; 32]; 2] = [
        //     instruction_data[64..96].try_into().map_err(|_| ProgramError::InvalidArgument.into())?,
        //     instruction_data[96..128].try_into().map_err(|_| ProgramError::InvalidArgument.into())?,
        // ];
        // let proof_c: [u8; 64] = instruction_data[128..192].try_into().map_err(|_| ProgramError::InvalidArgument.into())?;
        
        // let mut public_inputs = [[0u8; 32]; NR_PUBLIC_INPUTS];
        // public_inputs[0] = instruction_data[256..288].try_into().map_err(|_| ProgramError::InvalidArgument.into())?;

        // Flatten proof_b from [[u8; 32]; 2] to [u8; 128]
        let proof_b_flat: [u8; 128] = [
            instruction_data.proof_b[0].clone(),
            instruction_data.proof_b[1].clone(),
        ].concat().try_into().map_err(|_| ProgramError::InvalidArgument)?;
        // Create verifier instance
        let mut verifier =
            Groth16Verifier::new(&instruction_data.proof_a, &proof_b_flat, &instruction_data.proof_c, &instruction_data.public_inputs, &VERIFYINGKEY)
                .map_err(|_| ProgramError::Custom(0))?; // Use a custom error code

        // Perform the verification
        match verifier.verify() {
            Ok(true) => {
                challenge_account.status = Some("Completed.".to_string());
                challenge_account.winner = Some(winner);
                challenge_account.endTime = Some(Clock::get()?.unix_timestamp);
                msg!("Challenge completed successfully :)");
            },
            Ok(false) => return Err(ErrorCode::InvalidProof.into()),
            Err(_) => return Err(ErrorCode::InvalidProof.into()),
        }

        Ok(())
    }

    pub fn initialize_challenge_state(ctx: Context<CreateGlobalState>) -> Result<()> {
        let global_state_account = &mut ctx.accounts.global_state;
        global_state_account.challenge_id = 0;
        Ok(())
    }

    pub fn delete_participant(ctx: Context<DeleteParticipant>, participant_id: u32) -> Result<()> {
       msg!("Participant is deleted successfully :)");
       Ok(())
    }

    pub fn finish_challenge(ctx: Context<FinishChallenge>, challenge_id: u32) -> Result<()> {
      msg!("Challenge is deleted successfully :)");
      Ok(())
    }
}

#[derive(Accounts)]
#[instruction(challenge_id:u32)]
pub struct CreateChallenge<'info> {
    #[account(
      init,
      payer=payer,
      space=8 + Challenge::INIT_SPACE,
      seeds=[b"challenge".as_ref(),challenge_id.to_le_bytes().as_ref()],
      bump
    )]
    pub challenge_account: Account<'info, Challenge>,
    
    #[account(
      mut,
      seeds=[b"global-state".as_ref()],
      bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
#[instruction(challenge_id:u32)]
pub struct UpdateStats<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(mut,seeds=[
      b"challenge".as_ref(),
      challenge_id.to_le_bytes().as_ref()],
      bump,
      realloc=8 + Participant::INIT_SPACE,
      realloc::payer=payer,
      realloc::zero=true,
    )]
    pub challenge_account: Account<'info, Challenge>,
    
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
#[instruction(challenge_id:u32)]
pub struct CreateParticipant<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(
      init,
      payer=payer,
      space=8 + Participant::INIT_SPACE,
      seeds=[b"participant".as_ref(),challenge_id.to_le_bytes().as_ref(),payer.key().as_ref()],
      bump
    )]
    pub participant_account: Account<'info, Participant>,
    
    #[account(
      mut,
      seeds=[b"challenge".as_ref(),challenge_id.to_le_bytes().as_ref()],
      bump
    )]
    pub challenge_account: Account<'info, Challenge>,
    
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
#[instruction(challenge_id:u32)]
pub struct DeleteParticipant<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(
      mut,
      seeds=[b"participant".as_ref(),challenge_id.to_le_bytes().as_ref(),payer.key().as_ref()],
      bump,
      close=payer,
    )]
    pub participant_account: Account<'info, Participant>,
    
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
#[instruction(challenge_id:u32)]
pub struct FinishChallenge<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(
      mut,
      close=payer,
      seeds=[b"challenge".as_ref(),challenge_id.to_le_bytes().as_ref()],
      bump,
    )]
    pub challenge_account: Account<'info, Challenge>,
    
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct CreateGlobalState<'info> {
   #[account(
     init,
     payer=payer,
     space=8 + GlobalState::INIT_SPACE,
     seeds=[b"global-state"],
     bump,
   )]  
   pub global_state: Account<'info, GlobalState>,
   
   #[account(mut)]
   pub payer: Signer<'info>,
   
   pub system_program: Program<'info, System>
}

#[account]
#[derive(InitSpace)]
pub struct Challenge {
   pub owner: Pubkey,
   #[max_len(32)]
   pub name: String,
   #[max_len(70)]
   pub description:String,
   pub entry_fee:u32,
   #[max_len(20)]
   pub status: Option<String>,
   pub participant1: Option<Pubkey>,
   pub participant2: Option<Pubkey>,
   pub winner: Option<Pubkey>,
   pub startTime: Option<i64>,
   pub endTime: Option<i64>
}

#[account]
#[derive(InitSpace)]
pub struct Participant {
   pub owner: Pubkey,
   #[max_len(50)]
   pub user_name:String,
   pub player_id:u32,
}

#[account]
#[derive(InitSpace)]
pub struct GlobalState {
   pub challenge_id: u32,
   pub challenge_key : Option<Pubkey>
}

#[error_code]
pub enum ErrorCode {
   #[msg("The challenge already has two participants.")]
   ParticipantLimitExceeded,

   #[msg("Not able to verify the proof")]
   InvalidProof
}


pub const VERIFYINGKEY: Groth16Verifyingkey =  Groth16Verifyingkey {
	nr_pubinputs: 2,

	vk_alpha_g1: [
		14,214,188,191,108,230,53,155,46,2,191,6,17,169,56,177,184,174,49,218,49,239,204,53,154,212,16,234,50,225,227,242,
		13,210,31,252,133,193,132,248,238,64,96,9,96,252,36,146,10,126,2,173,26,197,48,24,191,223,100,241,14,91,182,46,
	],

	vk_beta_g2: [
		40,208,21,162,42,232,94,12,36,141,127,153,207,208,100,43,38,32,191,23,255,113,163,139,14,80,34,245,56,195,181,12,
		19,155,169,134,212,129,29,234,227,159,250,131,86,229,35,128,191,108,47,47,35,210,204,2,170,245,105,238,184,205,229,13,
		31,40,143,33,210,87,92,174,132,249,139,185,23,41,135,128,94,68,105,148,243,223,146,28,123,56,52,207,218,220,254,149,
		42,215,82,218,192,2,6,170,177,194,210,25,196,5,228,122,151,45,180,233,123,207,114,17,139,42,153,209,97,49,56,220,
	],

	vk_gamme_g2: [
		25,142,147,147,146,13,72,58,114,96,191,183,49,251,93,37,241,170,73,51,53,169,231,18,151,228,133,183,174,243,18,194,
		24,0,222,239,18,31,30,118,66,106,0,102,94,92,68,121,103,67,34,212,247,94,218,221,70,222,189,92,217,146,246,237,
		9,6,137,208,88,95,240,117,236,158,153,173,105,12,51,149,188,75,49,51,112,179,142,243,85,172,218,220,209,34,151,91,
		18,200,94,165,219,140,109,235,74,171,113,128,141,203,64,143,227,209,231,105,12,67,211,123,76,230,204,1,102,250,125,170,
	],

	vk_delta_g2: [
		28,217,161,240,179,40,192,48,143,102,66,101,190,76,16,105,141,2,94,81,6,115,19,129,65,252,175,152,118,201,43,73,
		29,47,224,91,37,80,174,99,73,15,171,64,119,135,212,117,61,8,169,181,213,235,56,74,40,76,118,241,149,102,115,126,
		20,110,168,209,190,68,213,75,41,142,235,157,213,229,134,243,20,217,14,160,102,89,209,197,59,166,65,107,123,40,225,196,
		45,222,47,161,129,148,229,93,66,242,24,66,168,95,132,244,199,19,228,36,66,7,192,47,168,18,174,171,153,142,107,57,
	],

	vk_ic: &[
		[
			6,136,162,71,162,143,201,30,252,231,179,203,248,156,61,138,108,54,155,109,170,98,185,147,174,49,206,119,210,20,242,13,
			36,120,181,103,108,53,96,223,99,242,152,230,218,103,16,216,41,88,144,214,129,91,35,116,166,114,4,5,110,227,211,108,
		],
		[
			44,23,72,183,133,65,186,201,244,28,61,78,65,172,223,235,42,140,71,211,133,95,50,91,205,125,253,136,245,198,114,206,
			26,198,81,118,118,101,206,91,28,72,137,251,41,220,230,255,3,30,22,94,49,138,112,254,213,2,116,153,245,220,136,133,
		],
	]
};