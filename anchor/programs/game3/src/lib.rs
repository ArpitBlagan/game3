#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
declare_id!("DEjo3Tdg9vsXKY4CHv97WWXEPAFzHRMe6Z8BgczX6moB");

#[program]
pub mod game3 {
    use super::*;
    pub fn createChallenge(ctx:Context<CreateChallenge>,name:String, descritpion:String,
      entry_fee:u32)->Result<()>{
        //Logic here
        let challenge=& mut ctx.accounts.challenge_account;
        challenge.owner=ctx.accounts.payer.key();
        challenge.name=name;
        challenge.descritpion=descritpion;
        challenge.entry_fee=entry_fee;
        Ok(())
    }
    //Pending ??
    pub fn createParticipant(ctx:Context<CreateParticipant>,user_name:String,player_id:u32)->Result<()>{
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
    }
      //Logic here
      
      Ok(())
    }
    pub fn updateParticipantInfo(ctx:Context<UpdateStats>,_player_id:String,
      _user_name:String,typee:String)->Result<()>{
      //Logic here  
      let participant_account=&mut ctx.accounts.participant_account;
      if typee=="win"{
        participant_account.wins+=1;
      }
      else if typee=="loss"{
        participant_account.losses+=1;
      }
      else{
        return Err(ProgramError::InvalidArgument.into());
      }
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
  #[account(mut)]
  pub payer :Signer<'info>,
  pub system_program:Program<'info,System>
}

#[derive(Accounts)]
#[instruction(participant_id:u32)]
pub struct UpdateStats<'info>{
  #[account(mut)]
  pub payer:Signer<'info>,
  #[account(
    mut,
    seeds=[b"participant".as_ref(),participant_id.to_le_bytes().as_ref(),payer.key.as_ref()],
    bump,
    realloc = 8 + Participant::INIT_SPACE,
    realloc::payer = payer, 
    realloc::zero = true, 
  )]
  pub participant_account:Account<'info,Participant>,
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
      seeds=[b"challenge".as_ref(),payer.key.as_ref(),challenge_id.to_le_bytes().as_ref()],
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
  pub participant1: Option<Pubkey>,
  pub participant2: Option<Pubkey>,
}

#[account]
#[derive(InitSpace)]
pub struct Participant{
  pub owner: Pubkey,
  #[max_len(50)]
  pub user_name:String,
  pub wins:u32,
  pub losses:u32,
  pub player_id:u32,
}
#[error_code]
pub enum ErrorCode {
    #[msg("The challenge already has two participants.")]
    ParticipantLimitExceeded,
}