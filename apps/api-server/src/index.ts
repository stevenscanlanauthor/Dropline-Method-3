import { createApp } from './app';
import { ensureInitialAdmin } from './bootstrap';
import { ensureUserActivityColumn } from './lib/userActivity';

const port = Number(process.env.PORT ?? 3001);

async function main() {
  await ensureUserActivityColumn();
  await ensureInitialAdmin();
  const app = createApp();
  app.listen(port, () => {
    console.log(`Dropline API listening on port ${port}`);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
