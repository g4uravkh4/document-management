import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { fiscalYearForStartYear } from '@ca-firm/shared';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@cafirm.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@1234';

function toDate(ad: { year: number; month: number; day: number }): Date {
  return new Date(ad.year, ad.month - 1, ad.day);
}

async function main() {
  // 1. Admin user
  const existingAdmin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const admin = await prisma.user.create({
      data: { email: ADMIN_EMAIL, name: 'System Admin', passwordHash, role: 'ADMIN' },
    });
    await prisma.userSetting.create({ data: { userId: admin.id } });
    console.log(`Created admin user: ${ADMIN_EMAIL}`);
  } else {
    console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
  }

  // 2. Fiscal years (2081/82, 2082/83, 2083/84 — active)
  for (const startYear of [2081, 2082, 2083]) {
    const fy = fiscalYearForStartYear(startYear);
    const existing = await prisma.fiscalYear.findUnique({ where: { label: fy.label } });
    if (!existing) {
      await prisma.fiscalYear.create({
        data: {
          label: fy.label,
          startDate: toDate(fy.startAd),
          endDate: toDate(fy.endAd),
          isActive: startYear === 2083,
        },
      });
      console.log(`Created fiscal year: ${fy.label}`);
    }
  }
  await prisma.fiscalYear.updateMany({
    where: { label: { not: '2083/84' } },
    data: { isActive: false },
  });
  await prisma.fiscalYear.updateMany({
    where: { label: '2083/84' },
    data: { isActive: true },
  });
  console.log('Active fiscal year: 2083/84');

  // 3. Document categories
  const categories = ['Audit', 'Income Tax', 'VAT', 'TDS', 'Financial Statements', 'Others'];
  for (const name of categories) {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const existing = await prisma.documentCategory.findUnique({ where: { slug } });
    if (!existing) {
      await prisma.documentCategory.create({ data: { name, slug } });
      console.log(`Created category: ${name}`);
    }
  }

  console.log('Seed complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
