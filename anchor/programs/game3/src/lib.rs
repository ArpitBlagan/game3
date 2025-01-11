#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

declare_id!("coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF");

#[program]
pub mod game3 {
    use super::*;

  pub fn close(_ctx: Context<CloseGame3>) -> Result<()> {
    Ok(())
  }

  pub fn decrement(ctx: Context<Update>) -> Result<()> {
    ctx.accounts.game3.count = ctx.accounts.game3.count.checked_sub(1).unwrap();
    Ok(())
  }

  pub fn increment(ctx: Context<Update>) -> Result<()> {
    ctx.accounts.game3.count = ctx.accounts.game3.count.checked_add(1).unwrap();
    Ok(())
  }

  pub fn initialize(_ctx: Context<InitializeGame3>) -> Result<()> {
    Ok(())
  }

  pub fn set(ctx: Context<Update>, value: u8) -> Result<()> {
    ctx.accounts.game3.count = value.clone();
    Ok(())
  }
}

#[derive(Accounts)]
pub struct InitializeGame3<'info> {
  #[account(mut)]
  pub payer: Signer<'info>,

  #[account(
  init,
  space = 8 + Game3::INIT_SPACE,
  payer = payer
  )]
  pub game3: Account<'info, Game3>,
  pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct CloseGame3<'info> {
  #[account(mut)]
  pub payer: Signer<'info>,

  #[account(
  mut,
  close = payer, // close account and return lamports to payer
  )]
  pub game3: Account<'info, Game3>,
}

#[derive(Accounts)]
pub struct Update<'info> {
  #[account(mut)]
  pub game3: Account<'info, Game3>,
}

#[account]
#[derive(InitSpace)]
pub struct Game3 {
  count: u8,
}
