import { createApp } from './app';
import { ensureInitialAdmin } from './bootstrap';

const port = Number(process.env.PORT ?? 3001);

async function main() {
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
