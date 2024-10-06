import type { Context, MiddlewareFn } from "grammy";
import type { SessionFlavor } from "grammy";
import type { SessionData } from "../types";
import { config } from "../config"

type BotContext = Context & SessionFlavor<SessionData>;

export const authMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  const authorizedUserId = config.telegramUserId;

  if (ctx.from?.id.toString() === authorizedUserId) {
    // Authorized user, allow access
    await next();
  } else {
    // Unauthorized access attempt
    const unauthorizedGif = "CgACAgQAAxkBAAKCZWcCRIh6SY59FDKS73LpYS3grPqyAALpBQACH6fkU4clDg0VOMwHNgQ";
    await ctx.replyWithAnimation(unauthorizedGif, {
      caption: "Athin nee etha?",
    });
  }
};
