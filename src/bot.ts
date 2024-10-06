import { Bot, session, Context, } from 'grammy';
import type { SessionFlavor } from 'grammy';
import { config } from './config';
import type { SessionData } from './types';
import { LinkHandler } from './handlers/linkHandler';
import { authMiddleware } from './middleware/authMiddleware';

type BotContext = Context & SessionFlavor<SessionData>;

const bot = new Bot<BotContext>(config.telegramToken);
const linkHandler = new LinkHandler();

// Auth Middleware
bot.use(authMiddleware);

// Session middleware
bot.use(session({
  initial: (): SessionData => ({
    step: 'idle',
    newLink: {}
  })
}));

// Start command
bot.command('start', async (ctx) => {
  const welcomeGif = "CgACAgQAAxkBAAKCamcCRaKXR2vwEzmiM-hBSG5g9gFGAAIfBAACnf6VUOO6svxrmXlmNgQ";
  await ctx.replyWithAnimation(welcomeGif, {
    caption: "Yes. I'm alive."
  });
});

// Add link command
bot.command('addlink', (ctx) => linkHandler.handleAddLink(ctx));

// Handle section selection
bot.callbackQuery(/^section:/, (ctx) => linkHandler.handleSectionSelection(ctx));

// Handle subsection selection
bot.callbackQuery(/^subsection:/, (ctx) => linkHandler.handleSubsectionSelection(ctx));

// Handle confirmation
bot.callbackQuery(/^confirm_link|cancel_link/, (ctx) => linkHandler.handleConfirmation(ctx));

// Cancel command
bot.command('cancel', (ctx) => linkHandler.cancelOperation(ctx));

// Handle message input
bot.on('message', (ctx) => linkHandler.handleMessage(ctx));

// Error handling
bot.catch((err) => {
  console.error('An error occurred:', err);
});

// Start the bot
bot.start();

console.log('Bot is alive. Do whatever you want now.');
