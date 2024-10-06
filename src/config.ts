import dotenv from 'dotenv';

dotenv.config();

export const config = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN!,
  githubToken: process.env.GITHUB_TOKEN!,
  githubOwner: process.env.GITHUB_OWNER!,
  githubRepo: process.env.GITHUB_REPO!,
  telegramUserId: process.env.TELEGRAM_USER_ID,
  jsonPath: 'links.json',
  markdownPath: 'src/pages/links.md',
};
