/* ===============================
   IMPORTS & ENV
   =============================== */

import * as dotenv from 'dotenv';
import { Bot, Keyboard } from 'grammy';
import { getBybitClient, initBybitClient } from '../services/bybit.js';
import { initializeOptionsWatcher } from '../options/watcher.js';

type Config = {
  BOT_TOKEN: string;
  BYBIT_API_KEY: string;
  BYBIT_SECRET_KEY: string;
};

function loadConfig(): Config {
  dotenv.config();

  const requiredEnvVars = ['BOT_TOKEN', 'BYBIT_API_KEY', 'BYBIT_SECRET_KEY'] as const;
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);

  if (missingVars.length) {
    console.error('Missing env vars:', missingVars.join(', '));
    process.exit(1);
  }

  return {
    BOT_TOKEN: process.env.BOT_TOKEN!,
    BYBIT_API_KEY: process.env.BYBIT_API_KEY!,
    BYBIT_SECRET_KEY: process.env.BYBIT_SECRET_KEY!,
  };
}

const config = loadConfig();

// Initialize Bybit client

initBybitClient({
  apiKey: config.BYBIT_API_KEY,
  apiSecret: config.BYBIT_SECRET_KEY,
  demoTrading: true,
  testnet: false, // Set to true for testnet
});

export const bybitClient = getBybitClient();

/* ===============================
   BOT INIT
   =============================== */

const bot = new Bot(config.BOT_TOKEN);

const subscribers = new Set<number>();
const activeTimestamps = new Map<number, number>();

/* ===============================
   GLOBAL GUARDS & SHUTDOWN
   =============================== */

const g = global as any;
if (g.__BOT_STARTED__) {
  console.log('Bot already started, skipping');
  process.exit(0);
}
g.__BOT_STARTED__ = true;

let stopWatchers: (() => void) | null = null;

async function startWatchersOnce() {
  if (stopWatchers) {
    console.log('✅ Watchers already running');
    return;
  }

  stopWatchers = await initializeOptionsWatcher('ETH', async msg => {
    for (const chatId of subscribers) {
      try {
        await bot.api.sendMessage(chatId, msg, {
          parse_mode: 'Markdown',
        });
      } catch (e) {
        console.error('Send failed:', chatId, e);
      }
    }
  });

  console.log('🚀 Options watchers started');
}

function registerShutdownHandlers() {
  let isShuttingDown = false;

  async function shutdown(signal: string) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`🛑 Shutdown (${signal})`);

    stopWatchers?.();
    stopWatchers = null;

    try {
      await bot.stop();
    } catch (err) {
      console.error('Bot shutdown error:', err);
    }

    process.exit(0);
  }

  process.on('SIGINT', () => {
    shutdown('SIGINT').catch(console.error);
  });
  process.on('SIGTERM', () => {
    shutdown('SIGTERM').catch(console.error);
  });

  process.on('uncaughtException', err => {
    console.error('UNCAUGHT EXCEPTION:', err);
  });

  process.on('unhandledRejection', reason => {
    console.error('UNHANDLED REJECTION:', reason);
  });
}

/* ===============================
   KEYBOARD
   =============================== */

const mainKeyboard = new Keyboard()
  .text('/start')
  .text('/status')
  .row()
  .text('/stop')
  .text('/download_logs')
  .resized();

/* ===============================
   COMMANDS
   =============================== */

const welcomeMsg = `🚀 *Market Bot Started*\n\n` + `🔔 Signals for market structure`;

function registerCommands() {
  bot.command('start', async ctx => {
    subscribers.add(ctx.chat.id);
    console.log(`➕ Subscribed chat ${ctx.chat.id}`);
    await ctx.reply(welcomeMsg, {
      parse_mode: 'Markdown',
      reply_markup: mainKeyboard,
    });
  });

  bot.command('stop', async ctx => {
    subscribers.delete(ctx.chat.id);
    console.log(`➖ Unsubscribed chat ${ctx.chat.id}`);

    await ctx.reply('🛑 Notifications stopped', {
      reply_markup: mainKeyboard,
    });
  });

  bot.command('status', ctx => {
    const status = `👥 Subscribers: ${subscribers.size}`;
    ctx.reply(status).then();
  });
}

/* ===============================
   FALLBACK & START
   =============================== */

function registerFallback() {
  // Update timestamp on any message
  bot.use(async (ctx, next) => {
    if (ctx.chat) {
      activeTimestamps.set(ctx.chat.id, Date.now());
    }
    await next();
  });

  bot.on('message:text', async ctx => {
    await ctx.reply('👇 Use buttons below', { reply_markup: mainKeyboard });
  });

  bot.catch(err => console.error('Bot error:', err));
}

async function main() {
  registerShutdownHandlers();
  registerCommands();
  registerFallback();

  console.log('🚀 Starting bot...');
  await bot.start({
    onStart: async info => {
      console.log(`🤖 Bot @${info.username} is running!`);
      await startWatchersOnce();
    },
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
