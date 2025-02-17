const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const playerList = [
    { FIO: 'Александров Игнат Анатолиевич', age: "24", gender: "woman", state: "blocked", generated: "12 октября 2021", changed: "22 октября 2021", blocked_changed: "AVAILABLE" },
    { FIO: 'Мартынов Остап Фёдорович', age: "12", gender: "woman", state: "active", generated: "12 октября 2021", changed: "22 октября 2021", blocked_changed: "IN_GAME" },
    { FIO: 'Комаров Цефас Александрович', age: "83", gender: "man", state: "active", generated: "12 октября 2021", changed: "22 октября 2021", blocked_changed: "IN_GAME" },
    { FIO: 'Кулаков Станислав Петрович', age: "43", gender: "man", state: "blocked", generated: "12 октября 2021", changed: "22 октября 2021", blocked_changed: "AVAILABLE" },
    { FIO: 'Борисов Йошка Васильевич', age: "32", gender: "woman", state: "active", generated: "12 октября 2021", changed: "22 октября 2021", blocked_changed: "IN_GAME" },
    { FIO: 'Негода Михаил Эдуардович', age: "33", gender: "man", state: "active", generated: "12 октября 2021", changed: "22 октября 2021", blocked_changed: "IN_GAME" },
    { FIO: 'Жданов Зураб Алексеевич', age: "24", gender: "man", state: "active", generated: "12 октября 2021", changed: "22 октября 2021", blocked_changed: "IN_GAME" },
    { FIO: 'Бобров Фёдор Викторович', age: "19", gender: "man", state: "blocked", generated: "12 октября 2021", changed: "22 октября 2021", blocked_changed: "AVAILABLE" },
    { FIO: 'Александров Игнат Анатолиевич', age: "21", gender: "woman", state: "active", generated: "12 октября 2021", changed: "22 октября 2021", blocked_changed: "IN_GAME" },
    { FIO: 'Многогрешный Павел Виталиевич', age: "24", gender: "man", state: "blocked", generated: "12 октября 2021", changed: "22 октября 2021", blocked_changed: "AVAILABLE" }
];

async function main() {
    const hashedPassword = await bcrypt.hash(process.env.TEST_USER_KEY, 10);

    for (const [index, player] of playerList.entries()) {
        const [createdPlayer, createdRating] = await prisma.$transaction([
            prisma.player.create({
                data: {
                    fullName: player.FIO,
                    age: parseInt(player.age, 10),
                    gender: player.gender === "woman" ? "FEMALE" : "MALE",
                    status: player.state.toUpperCase(),
                    availability: player.blocked_changed.toUpperCase(),
                    login: `player${index + 1}`, // Генерация логина
                    password: hashedPassword,   // Общий зашифрованный пароль
                    isAdmin: false,
                },
            }),
            prisma.rating.create({
                data: {
                    player: {
                        connect: { login: `player${index + 1}` }, // Связываем рейтинг с игроком по логину
                    },
                    wins: 0,
                    losses: 0,
                    draw: 0,
                },
            }),
        ]);

        console.log('Player created:', createdPlayer);
        console.log('Rating created:', createdRating);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
