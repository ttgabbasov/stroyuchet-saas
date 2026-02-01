import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function search() {
    console.log('--- Database Search for "localhost" ---');

    const models = ['company', 'user', 'project', 'moneySource', 'category', 'categoryGroup', 'transaction', 'invite', 'planConfig'];
    let totalFound = 0;

    for (const model of models) {
        try {
            // @ts-ignore
            const records = await prisma[model].findMany();
            for (const record of records) {
                const str = JSON.stringify(record);
                if (str.toLowerCase().includes('localhost')) {
                    totalFound++;
                    console.log(`[${model.toUpperCase()}] ID: ${record.id || 'N/A'}`);
                    // Find which field(s) contain it
                    for (const [key, value] of Object.entries(record)) {
                        if (typeof value === 'string' && value.toLowerCase().includes('localhost')) {
                            console.log(`  - Field "${key}": ${value}`);
                        }
                    }
                }
            }
        } catch (e) {
            console.error(`Error searching ${model}:`, e);
        }
    }

    console.log(`\nTotal occurrences found: ${totalFound}`);
}

search().finally(() => prisma.$disconnect());
