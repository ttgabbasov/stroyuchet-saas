
import { prisma } from '../src/lib/prisma';

async function main() {
    console.log('Fetching users...');
    const users = await prisma.user.findMany({
        include: {
            company: true
        }
    });

    console.log('Found users:', users.length);
    console.log(JSON.stringify(users.map(u => ({
        id: u.id,
        name: u.name,
        role: u.role,
        companyId: u.companyId
    })), null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
