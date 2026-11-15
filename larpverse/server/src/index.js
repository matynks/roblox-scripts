import { loadConfig } from './config.js';
import { startServer } from './server.js';

const cfg = loadConfig();
const srv = await startServer(cfg);

const shutdown = async (signal) => {
  console.log(`[larpverse] ${signal} received, shutting down`);
  await srv.close();
  process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
