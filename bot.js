const TelegramBot = require('node-telegram-bot-api');

const dotenv = require('dotenv');

const { initBot, monitorWallet, setState } = require('./monitor.js')

dotenv.config();

// Replace YOUR_TELEGRAM_BOT_TOKEN with the token you received from the BotFather
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Track if the bot is actively monitoring
let isMonitoring = false;

// first flag to check running status
let firstRunning = true;

// Handle /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  if (!isMonitoring) {
    isMonitoring = true;
    bot.sendMessage(chatId, 'Monitoring started.');

    if (firstRunning) {
      firstRunning = false;
      setState(true);
      monitorWallet();
    }

    initBot(bot, msg.chat.id)
  } else {
    bot.sendMessage(chatId, 'Already monitoring.');
  }
});

// Handle /stop command
bot.onText(/\/stop/, (msg) => {
  const chatId = msg.chat.id;

  if (isMonitoring) {
    isMonitoring = false;
    bot.sendMessage(chatId, 'Monitoring stopped.');
    setState(false);
  } else {
    bot.sendMessage(chatId, 'Monitoring is not active.');
  }
});

// Respond to any other messages
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  if (msg.text !== '/start' && msg.text !== '/stop') {
    bot.sendMessage(chatId, 'Use /start to begin monitoring and /stop to stop monitoring.');
  }
});

console.log('Bot is running...');
