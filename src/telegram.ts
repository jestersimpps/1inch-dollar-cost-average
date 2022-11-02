const TelegramBot = require("node-telegram-bot-api");

const TELEGRAM_BOT_TOKEN = "1484464165:AAFc6u5N9eG_t49aOc0ZiAilsJH5VhdwPcg";
const TELEGRAM_CHAT_ID = "-799174803";

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

export const sendPrivateTelegramMessage = (message: string) => {
  bot.sendMessage(TELEGRAM_CHAT_ID, message);
};
