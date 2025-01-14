#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
declare_id!("5KQsaWXPEuRHnNnyjaxywTVCx16RjbiykhP3T8vyz3Bh");

#[program]
pub mod game3 {
    use super::*;
    pub fn createChallenge(ctx:Context<CreateChallenge>,challenge_id:u32,name:String, descritpion:String,
      entry_fee:u32)->Result<()>{
        //Logic here
        let challenge=& mut ctx.accounts.challenge_account;
        let global_state_account=& mut ctx.accounts.global_state;
        challenge.owner=ctx.accounts.payer.key();
        challenge.name=name;
        challenge.descritpion=descritpion;
        challenge.entry_fee=entry_fee;
        challenge.status=Some("Yet to start.".to_string());;
        global_state_account.challenge_id=challenge_id;
        global_state_account.challenge_key= Some(challenge.key());
        Ok(())
    }
    //Pending ??
    pub fn createParticipant(ctx:Context<CreateParticipant>,challenge_id:u32,user_name:String,player_id:u32)->Result<()>{
      let challenge=&mut ctx.accounts.challenge_account;
      let participant_account=& mut ctx.accounts.participant_account;
      if challenge.participant1.is_some() && challenge.participant2.is_some() {
        participant_account.owner = Pubkey::default();
        participant_account.user_name.clear();
        participant_account.player_id = 0;
        participant_account.wins = 0;
        participant_account.losses = 0;
        msg!("Participant data has been cleared.");
        return Err(ErrorCode::ParticipantLimitExceeded.into()); // Custom error code for exceeding participant limit
    }

    // Add the participant to the challenge
    if challenge.participant1.is_none() {
      
      participant_account.owner=ctx.accounts.payer.key();
      participant_account.user_name=user_name;
      participant_account.player_id=player_id;
      participant_account.wins=0;
      participant_account.losses=0;
        challenge.participant1 = Some(ctx.accounts.payer.key());
    } else if challenge.participant2.is_none() {
      participant_account.owner=ctx.accounts.payer.key();
      participant_account.user_name=user_name;
      participant_account.player_id=player_id;
      participant_account.wins=0;
      participant_account.losses=0;
        challenge.participant2 = Some(ctx.accounts.payer.key());
        challenge.status=Some("Started (In progress).".to_string());
        msg!("Challenge with id {} is ready for processing", challenge_id)
    }
      //Logic here
      
      Ok(())
    }
    pub fn updateChallengeStatus(ctx:Context<UpdateStats>,challenge_id:u32,typee:String,proof,winner:Pubkey)->Result<()>{
      //Logic here  
      let challenge_account=&mut ctx.accounts.challenge_account;
      //valid the proof
      if true{
      challenge_account.status=Some("Completed.".to_string());
      challenge_account.winner=winner;
      }
      else{
        return Err(ErrorCode::InvalidProof.into()); 
      }
      Ok(())
    }
    pub fn initializeChallengeState(ctx:Context<CreateGlobalState>)->Result<()>{
      let global_state_account=& mut ctx.accounts.global_state;
      global_state_account.challenge_id=0;
      Ok(())
    }

    pub fn delete_participant(ctx:Context<DeleteParticipant>,participant_id:u32)->Result<()>{
       //Logic here
       msg!("Participant is deleted successfully :)");
       Ok(())
    }
    pub fn finishChallenge(ctx:Context<FinishChallenge>,challenge_id:u32)->Result<()>{
      //Logic here
      msg!("Challenge is deleted successfully :)");
      Ok(())
    }
}


#[derive(Accounts)]
#[instruction(challenge_id:u32)]
pub struct CreateChallenge<'info>{
  #[account(
    init,
    payer=payer,
    space=8 + Challenge::INIT_SPACE,
    seeds=[b"challenge".as_ref(),challenge_id.to_le_bytes().as_ref()],
    bump
  )]
  pub challenge_account:Account<'info,Challenge>,
  #[account(
    mut,
    seeds=[b"global-state".as_ref()],
    bump
  )]
  pub global_state:Account<'info,GlobalState>,
  #[account(mut)]
  pub payer :Signer<'info>,
  pub system_program:Program<'info,System>
}

#[derive(Accounts)]
#[instruction(challenge_id:u32)]
pub struct UpdateStats<'info>{
  #[account(mut)]
  pub payer:Signer<'info>,
  #[account(mut,seeds=[
    b"challenge".as_ref(),
  challenge_id.to_le_bytes().as_ref()],
  bump,
  realloc = 8 + Participant::INIT_SPACE,
  realloc::payer = payer, 
  realloc::zero = true, 
)]
  pub challenge_account:Account<'info,Challenge>,
  pub system_program:Program<'info,System>
}

#[derive(Accounts)]
#[instruction(challenge_id:u32)]
pub struct CreateParticipant<'info>{
  #[account(mut)]
  pub payer:Signer<'info>,
  #[account(
    init,
    payer=payer,
    space=8+Participant::INIT_SPACE,
    seeds=[b"participant".as_ref(),challenge_id.to_le_bytes().as_ref(),payer.key.as_ref()],
    bump
  )]
  pub participant_account:Account<'info,Participant>,
  #[
    account(
      mut,
      seeds=[b"challenge".as_ref(),challenge_id.to_le_bytes().as_ref()],
      bump
    )
  ]
  pub challenge_account:Account<'info,Challenge>,
  pub system_program:Program<'info,System>
}

#[derive(Accounts)]
#[instruction(challenge_id:u32)]
pub struct DeleteParticipant<'info>{
  #[account(mut)]
  pub payer:Signer<'info>,
  #[account(
    mut,
    seeds=[b"participant".as_ref(),challenge_id.to_le_bytes().as_ref(),payer.key.as_ref()],
    bump,
    close=payer,
  )]
  pub participant_account:Account<'info,Participant>,
  pub system_program:Program<'info,System>

}
#[derive(Accounts)]
#[instruction(challenge_id:u32)]
pub struct FinishChallenge<'info>{
  #[account(mut)]
  pub payer:Signer<'info>,
  #[account(
    mut,
    close=payer,
    seeds=[b"challenge".as_ref(),challenge_id.to_le_bytes().as_ref()],
    bump,
    
  )]
  pub challenge_account:Account<'info,Challenge>,
  pub system_program:Program<'info,System>
}

#[derive(Accounts)]
pub struct CreateGlobalState<'info>{
  #[account(
    init,
    payer = payer,
    space = 8 + GlobalState::INIT_SPACE,
    seeds = [b"global-state"],
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
  pub descritpion:String,
  pub entry_fee:u32,
  pub start_at:Option<u32>,
  pub end_at:Option<u32>,
  #[max_len(20)]
  pub winner:Option<String>,
  #[max_len(10)]
  pub status:Option<String>,
  pub participant1: Option<Pubkey>,
  pub participant2: Option<Pubkey>,
  pub winner: Option<Pubkey>
}

#[account]
#[derive(InitSpace)]
pub struct Participant{
  pub owner: Pubkey,
  #[max_len(50)]
  pub user_name:String,
  pub player_id:u32,
}

#[account]
#[derive(InitSpace)]
pub struct GlobalState{
  pub challenge_id: u32,
  pub challenge_key :Option<Pubkey>
}
#[error_code]
pub enum ErrorCode {
    #[msg("The challenge already has two participants.")]
    ParticipantLimitExceeded,
    #[msg("Not able to verify the proof")]
    InvalidProof
}

