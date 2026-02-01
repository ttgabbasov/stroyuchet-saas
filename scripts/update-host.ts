import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function updateHost() {
    const newHost = process.argv[2];
    if (!newHost) {
        console.error('Usage: npx tsx scripts/update-host.ts <new_host_url>');
        console.error('Example: npx tsx scripts/update-host.ts https://api.stroyuchet.ru');
        process.exit(1);
    }

    // Ensure no trailing slash
    const host = newHost.replace(/\/$/, '');
    console.log(`Updating localhost references in database to: ${host}`);

    try {
        // 1. Update Transaction.receiptUrl
        const transactions = await prisma.transaction.findMany({
            where: {
                receiptUrl: { contains: 'localhost' }
            }
        });

        console.log(`Found ${transactions.length} transactions with localhost in receiptUrl`);

        for (const tx of transactions) {
            if (tx.receiptUrl) {
                const newUrl = tx.receiptUrl.replace(/https?:\/\/localhost:\d+/, host);
                await prisma.transaction.update({
                    where: { id: tx.id },
                    data: { receiptUrl: newUrl }
                });
            }
        }

        console.log('✅ Update completed successfully');
    } catch (error) {
        console.error('❌ Error during update:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateHost();
