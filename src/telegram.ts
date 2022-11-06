require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

export const sendPrivateTelegramMessage = (message: string) => {
  bot.sendMessage(TELEGRAM_CHAT_ID, message);
};
