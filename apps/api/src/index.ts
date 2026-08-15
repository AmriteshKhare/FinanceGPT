import { createAppFromEnv } from './app.js';

async function main() {
  const { app, env } = await createAppFromEnv();
  await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
  app.log.info(`API listening on :${env.API_PORT} (AI_ENABLED=${env.AI_ENABLED})`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
