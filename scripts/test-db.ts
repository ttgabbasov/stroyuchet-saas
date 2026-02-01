import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Testing database connection...');
    try {
        await prisma.$connect();
        console.log('✅ Successfully connected to the database server.');

        // Check if expected tables exist by counting users (or any core table)
        try {
            const count = await prisma.user.count();
            console.log(`✅ Database schema appears valid. Found ${count} users.`);
        } catch (err: any) {
            if (err.code === 'P2021') {
                console.log('⚠️ Database connected, but tables are missing (Need Migrations).');
            } else {
                console.error('❌ Error querying tables:', err.message);
            }
        }

    } catch (error: any) {
        console.error('❌ Connection Failed:', error.message);
        console.log('\nTroubleshooting:');
        if (error.message.includes('P1001')) {
            console.log('  - Is PostgreSQL running?');
            console.log('  - Is port 5432 correct?');
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
