import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Checking help items...');
    const count = await prisma.helpItem.count();
    console.log('COUNT:', count);
    const items = await prisma.helpItem.findMany();
    console.log('ITEMS:', JSON.stringify(items, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
