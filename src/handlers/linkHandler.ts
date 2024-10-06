import { Context, InlineKeyboard } from 'grammy';
import type { SessionFlavor } from 'grammy';
import type { JsonData, SessionData, Link } from '../types';
import { fetchJsonFromGitHub, updateGitHubFiles } from '../services/github';
import { generateMarkdown } from '../services/markdown';

type BotContext = Context & SessionFlavor<SessionData>;

export class LinkHandler {
  private jsonData: JsonData | null = null;

  async handleAddLink(ctx: BotContext): Promise<void> {
    if (!ctx.chat) {
      console.error('Chat context is undefined');
      return;
    }

    const waitingMessage = await ctx.reply('Fetching the latest data. Please wait...');
    try {
      this.jsonData = await fetchJsonFromGitHub();
      ctx.session.step = 'choose_section';
      ctx.session.newLink = {};

      const keyboard = new InlineKeyboard();
      this.jsonData.sections.forEach(section => {
        keyboard.text(section.name, `section:${section.name}`).row();
      });

      await ctx.api.deleteMessage(ctx.chat.id, waitingMessage.message_id);
      const message = await ctx.reply('Choose a section to add the link:', { reply_markup: keyboard });
      ctx.session.lastMessageId = message.message_id;
    } catch (error) {
      console.error('Error fetching JSON data:', error);
      await ctx.api.deleteMessage(ctx.chat.id, waitingMessage.message_id);
      await ctx.reply('Sorry, there was an error preparing to add a link. Please try again later.');
    }
  }

  async handleSectionSelection(ctx: BotContext): Promise<void> {
    if (!ctx.callbackQuery?.data || !this.jsonData) {
      console.error('Callback query data is undefined or JSON data not fetched');
      await ctx.reply('An error occurred. Please try /addlink again.');
      return;
    }

    const sectionName = ctx.callbackQuery.data.split(':')[1];
    ctx.session.newLink.section = sectionName;
    ctx.session.step = 'choose_subsection';

    const section = this.jsonData.sections.find(s => s.name === sectionName);
    if (!section) {
      await ctx.answerCallbackQuery('Section not found');
      return;
    }

    const keyboard = new InlineKeyboard();
    section.subsections.forEach(subsection => {
      keyboard.text(subsection.name, `subsection:${subsection.name}`).row();
    });

    const result = await ctx.editMessageText(`Selected section: ${sectionName}\nNow choose a subsection:`, { reply_markup: keyboard });
    if (result && typeof result !== 'boolean') {
      ctx.session.lastMessageId = result.message_id;
    }
  }

  async handleSubsectionSelection(ctx: BotContext): Promise<void> {
    if (!ctx.callbackQuery?.data) {
      console.error('Callback query data is undefined');
      await ctx.reply('An error occurred. Please try /addlink again.');
      return;
    }

    const subsectionName = ctx.callbackQuery.data.split(':')[1];
    ctx.session.newLink.subsection = subsectionName;
    ctx.session.step = 'enter_title';

    const result = await ctx.editMessageText(`Selected subsection: ${subsectionName}\nNow enter the title of the link:`);
    if (result && typeof result !== 'boolean') {
      ctx.session.lastMessageId = result.message_id;
    }
  } async handleMessage(ctx: BotContext): Promise<void> {
    if (!ctx.message || !('text' in ctx.message)) {
      console.error('Message text is undefined');
      await ctx.reply('An error occurred. Please try /addlink again.');
      return;
    }

    if (ctx.session.step === 'enter_title') {
      ctx.session.newLink.title = ctx.message.text;
      ctx.session.step = 'enter_type';
      const message = await ctx.reply('Enter the type of the link (e.g., Video, Blog, etc.):');
      ctx.session.lastMessageId = message.message_id;
    } else if (ctx.session.step === 'enter_type') {
      ctx.session.newLink.type = ctx.message.text;
      ctx.session.step = 'enter_url';
      const message = await ctx.reply('Enter the URL of the link:');
      ctx.session.lastMessageId = message.message_id;
    } else if (ctx.session.step === 'enter_url') {
      ctx.session.newLink.url = ctx.message.text;
      await this.showConfirmation(ctx);
    }
  }

  private async showConfirmation(ctx: BotContext): Promise<void> {
    const { section, subsection, title, type, url } = ctx.session.newLink as Link & { section: string; subsection: string };
    const confirmationMessage = `Please confirm the details:\n\nSection: ${section}\nSubsection: ${subsection}\nTitle: ${title}\nType: ${type}\nURL: ${url}`;

    const keyboard = new InlineKeyboard()
      .text('Confirm', 'confirm_link')
      .text('Cancel', 'cancel_link');

    const message = await ctx.reply(confirmationMessage, { reply_markup: keyboard });
    ctx.session.lastMessageId = message.message_id;
    ctx.session.step = 'confirm';
  }

  async handleConfirmation(ctx: BotContext): Promise<void> {
    if (!ctx.chat || !ctx.callbackQuery?.data || !this.jsonData) {
      console.error('Chat context, callback query data is undefined, or JSON data not fetched');
      await ctx.reply('An error occurred. Please try /addlink again.');
      return;
    }

    // Delete the confirmation message
    if (ctx.session.lastMessageId) {
      try {
        await ctx.api.deleteMessage(ctx.chat.id, ctx.session.lastMessageId);
      } catch (error) {
        console.error('Error deleting confirmation message:', error);
      }
    }

    if (ctx.callbackQuery.data === 'confirm_link') {
      const waitingMessage = await ctx.reply('Adding link and updating repository. Please wait...');
      this.addLinkToJson(ctx);
      const markdown = generateMarkdown(this.jsonData);
      await updateGitHubFiles(this.jsonData, markdown);
      await ctx.api.deleteMessage(ctx.chat.id, waitingMessage.message_id);
      await ctx.reply('Link added successfully and GitHub repository updated!');
    } else {
      await ctx.reply('Link addition cancelled. Use /addlink to start over.');
    }
    ctx.session.step = 'idle';
    ctx.session.newLink = {};
    ctx.session.lastMessageId = undefined;
  }

  async cancelOperation(ctx: BotContext): Promise<void> {
    if (ctx.chat && ctx.session.lastMessageId) {
      try {
        await ctx.api.deleteMessage(ctx.chat.id, ctx.session.lastMessageId);
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    }

    ctx.session.step = 'idle';
    ctx.session.newLink = {};
    ctx.session.lastMessageId = undefined;
    this.jsonData = null;

    await ctx.reply("Session flushed. Operation cancelled.");
  }

  private addLinkToJson(ctx: BotContext): void {
    if (!this.jsonData) {
      console.error('JSON data not fetched');
      return;
    }

    const { section, subsection, title, type, url } = ctx.session.newLink as Link & { section: string; subsection: string };
    const sectionIndex = this.jsonData.sections.findIndex(s => s.name === section);
    if (sectionIndex === -1) {
      console.error('Section not found');
      return;
    }

    const subsectionIndex = this.jsonData.sections[sectionIndex].subsections.findIndex(s => s.name === subsection);
    if (subsectionIndex === -1) {
      console.error('Subsection not found');
      return;
    }

    this.jsonData.sections[sectionIndex].subsections[subsectionIndex].links.push({ title, type, url });
  }
}
