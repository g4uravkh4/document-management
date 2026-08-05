import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const p = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});
p.user
  .findMany({ select: { email: true, role: true, name: true, isActive: true } })
  .then((u) => {
    console.log(JSON.stringify(u, null, 2));
    return p.$disconnect();
  })
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
