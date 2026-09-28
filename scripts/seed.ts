import { promises as fs } from 'fs';
import path from 'path';
import { seedCustomers } from '../lib/data';

async function main() {
  const dataDir = path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(path.join(dataDir, 'app-data.json'), JSON.stringify({ customers: seedCustomers }, null, 2));
  console.log('Seed data written to data/app-data.json');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
