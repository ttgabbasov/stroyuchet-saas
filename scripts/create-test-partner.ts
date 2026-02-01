
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
    console.log('Finding owner...');
    const owner = await prisma.user.findFirst({
        where: { role: 'OWNER' }
    });

    if (!owner) {
        console.error('No owner found!');
        return;
    }

    console.log('Owner found:', owner.name, owner.companyId);

    const partnerEmail = 'partner@stroyuchet.com';
    const existingPartner = await prisma.user.findUnique({
        where: { email: partnerEmail }
    });

    if (existingPartner) {
        console.log('Test partner already exists:', existingPartner.id);
        return;
    }

    console.log('Creating test partner...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    const partner = await prisma.user.create({
        data: {
            name: 'Тестовый Партнер',
            email: partnerEmail,
            passwordHash: hashedPassword,
            role: 'PARTNER',
            companyId: owner.companyId
        }
    });

    console.log('Partner created successfully:', partner.id);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
