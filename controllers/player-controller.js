const { prisma } = require("../prisma/prisma-client");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const PlayerController = {
    login: async (req, res) => {
        const { login, password } = req.body;

        if (!login || !password) {
            return res.status(400).json({ error: 'Все поля обязательные' })
        }
        try {
            const player = await prisma.player.findUnique(({ where: { login } }));

            if (!player) return res.status(400).json({ error: 'Неверный логин или пароль' });

            const valid = await bcrypt.compare(password, player.password);

            if (!valid) return res.status(400).json({ error: 'Неверный логин или пароль' });

            const token = jwt.sign({ id: player.id }, process.env.SECRET_KEY, { expiresIn: '2d' });

            res.json({ token })

        } catch (error) {
            console.error('Error in login', error);
            res.status(500).json({
                error: 'Internal server error'
            });
        }

    },
    register: async (req, res) => {
        const { login, password, fullname, age, gender } = req.body;

        if (!login || !password || !fullname || !age || !gender) {
            return res.status(400).json({ error: 'Не все поля заполнены' });
        }

        try {
            const existingUser = await prisma.player.findUnique({
                where: { login }
            });

            if (existingUser) {
                return res.status(400).json({ error: 'Пользователь уже существует' });
            }
            const admin = await prisma.player.findUnique({
                where: { id: req.player.id }
            });

            if (!admin || !admin.isAdmin) {
                return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const newPlayer = await prisma.player.create({
                data: {
                    fullName: fullname,
                    age: parseInt(age),
                    gender,
                    login,
                    password: hashedPassword
                }
            });

            const { password, login, ...playerWithoutPassword } = newPlayer;
            res.json(playerWithoutPassword);

        } catch (error) {
            console.error('Error in register', error);
            res.status(500).json({
                error: 'Internal server error'
            });
        }
    },
    updatePlayer: async (req, res) => {
        const { id } = req.params; // ID игрока для обновления
        const { login, password, fullname, age, gender } = req.body;

        try {
            // Проверка прав администратора
            const admin = await prisma.player.findUnique({
                where: { id: req.player.id }
            });

            if (!admin || !admin.isAdmin) {
                return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора' });
            }

            // Проверка существования игрока
            const existingPlayer = await prisma.player.findUnique({
                where: { id: parseInt(id) }
            });

            if (!existingPlayer) {
                return res.status(404).json({ error: 'Игрок не найден' });
            }

            // Подготовка данных для обновления
            const updateData = {};

            // Добавляем только предоставленные поля
            if (fullname) updateData.fullName = fullname;
            if (age) updateData.age = parseInt(age);
            if (gender) updateData.gender = gender;
            if (login) {
                // Проверка уникальности логина
                const loginExists = await prisma.player.findFirst({
                    where: {
                        login,
                        id: { not: parseInt(id) } // Исключаем текущего игрока
                    }
                });

                if (loginExists) {
                    return res.status(400).json({ error: 'Такой логин уже существует' });
                }
                updateData.login = login;
            }
            if (password) {
                const hashedPassword = await bcrypt.hash(password, 10);
                updateData.password = hashedPassword;
            }

            // Обновление игрока
            const updatedPlayer = await prisma.player.update({
                where: { id: parseInt(id) },
                data: updateData
            });

            // Удаляем пароль из ответа
            const { password, login, ...playerWithoutPassword } = updatedPlayer;

            res.json({
                message: 'Игрок успешно обновлен',
                player: playerWithoutPassword
            });

        } catch (error) {
            console.error('Error in updatePlayer:', error);
            res.status(500).json({
                error: 'Internal server error',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },
    getAllPlayers: async (req, res) => {
        try {
            // Проверка прав администратора
            const admin = await prisma.player.findUnique({
                where: { id: req.player.id }
            });

            if (!admin || !admin.isAdmin) {
                return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора' });
            }

            // Получение всех игроков
            const players = await prisma.player.findMany({
                select: {
                    id: true,
                    fullName: true,
                    age: true,
                    gender: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true
                }
            });

            res.json(players);

        } catch (error) {
            console.error('Error in getPlayers:', error);
            res.status(500).json({
                error: 'Internal server error',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },
    changePlayerStatus: async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;

        try {
            // Проверка прав администратора
            const admin = await prisma.player.findUnique({
                where: { id: req.player.id }
            });

            if (!admin || !admin.isAdmin) {
                return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора' });
            }
            // Проверка существования игрока
            const existingPlayer = await prisma.player.findUnique({
                where: { id: parseInt(id) }
            });

            if (!existingPlayer) {
                return res.status(404).json({ error: 'Игрок не найден' });
            }
            const updatedPlayer = await prisma.player.update({
                where: { id },
                data: { status },
                select: { id: true, fullName: true, status: true }
            });

            res.json({
                message: 'Статус игрока успешно обновлен',
                player: updatedPlayer
            });

        } catch (error) {
            console.error('Error in togglePlayerStatus:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
module.exports = PlayerController;