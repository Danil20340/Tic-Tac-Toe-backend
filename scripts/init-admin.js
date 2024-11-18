const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_KEY, 10);

    const admin = await prisma.player.create({
        data: {
            fullName: 'Admin User',
            age: 30,
            gender: 'Male',
            status: 'ACTIVE',
            availability: 'AVAILABLE',
            login: 'admin',
            password: hashedPassword,
            isAdmin: true,
            ratings: {
                create: {
                    totalGames: 0,
                    wins: 0,
                    losses: 0
                }
            }
        }
    });

    console.log('Admin created:', admin);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });