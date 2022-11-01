import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from "./constants";

const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

export const sendPrivateTelegramMessage = (message: string) => {
  bot.sendMessage(TELEGRAM_CHAT_ID, message);
};
