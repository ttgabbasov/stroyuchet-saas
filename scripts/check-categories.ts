import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking categories...\n');

    // Get all categories
    const categories = await prisma.category.findMany({
        select: {
            id: true,
            name: true,
            allowedTypes: true,
            isSystem: true,
        },
    });

    console.log(`Found ${categories.length} categories:\n`);

    for (const cat of categories) {
        console.log(`- ${cat.name}: allowedTypes = [${cat.allowedTypes.join(', ')}]`);
    }

    // Find categories with empty allowedTypes
    const emptyCategories = categories.filter(c => c.allowedTypes.length === 0);

    if (emptyCategories.length > 0) {
        console.log(`\n⚠️  Found ${emptyCategories.length} categories with empty allowedTypes!`);
        console.log('These categories will not appear in the UI.');
    } else {
        console.log('\n✅ All categories have allowedTypes set.');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
