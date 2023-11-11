require("dotenv").config();
import axios from "axios";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export const sendPrivateTelegramMessage = async (
 text: string
): Promise<any> => {
 const baseUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
 const payload = {
  chat_id: TELEGRAM_CHAT_ID,
  text: text,
  parse_mode: "Markdown",
 };

 try {
  const response = await axios.post(baseUrl, payload);
  return response.data;
 } catch (error) {
  console.error("Error sending message to Telegram:", error);
  throw error;
 }
};
