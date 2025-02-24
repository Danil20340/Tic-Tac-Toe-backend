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

            if (!player) return res.status(401).json({ error: 'Неверный логин или пароль' });

            const valid = await bcrypt.compare(password, player.password);

            if (!valid) return res.status(401).json({ error: 'Неверный логин или пароль' });

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
        if (
            !login?.trim() ||
            !password?.trim() ||
            !fullname?.trim() ||
            !age?.toString().trim() ||
            !gender?.trim()
        ) {
            return res.status(400).json({ error: 'Не все поля заполнены' });
        }
        // Проверка что fullName состоит ровно из трех слов
        const nameParts = fullname.trim().split(/\s+/);
        if (nameParts.length !== 3) {
            return res.status(400).json({ error: 'ФИО должно состоять ровно из трех слов' });
        }
        try {
            const existingUser = await prisma.player.findUnique({
                where: { login },
            });

            if (existingUser) {
                return res.status(400).json({ error: 'Пользователь уже существует' });
            }

            const admin = await prisma.player.findUnique({
                where: { id: req.player.id },
            });

            if (!admin || !admin.isAdmin) {
                return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            // Используем транзакцию для создания игрока и его рейтинга
            const [newPlayer] = await prisma.$transaction([
                prisma.player.create({
                    data: {
                        fullName: fullname,
                        age: parseInt(age),
                        gender,
                        login,
                        password: hashedPassword,
                    },
                }),
                prisma.rating.create({
                    data: {
                        player: {
                            connect: { login }, // Связываем рейтинг с игроком по уникальному login
                        },
                        wins: 0,
                        losses: 0,
                        draw: 0,
                    },
                }),
            ]);

            // Убираем пароль из ответа
            const { password: _, login: __, ...playerWithoutPassword } = newPlayer;

            res.json(playerWithoutPassword);

        } catch (error) {
            console.error('Error in register:', error);
            res.status(500).json({
                error: 'Internal server error',
            });
        }
    },
    updatePlayer: async (req, res) => {

        const { id, login, password, fullname, age, gender } = req.body;
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
                where: { id: id }
            });
            if (!existingPlayer) {
                return res.status(404).json({ error: 'Игрок не найден' });
            }

            // Подготовка данных для обновления
            const updateData = {};

            // Добавляем только предоставленные поля
            if (fullname && !(fullname.trim === '')) {
                // Проверка что fullName состоит ровно из трех слов
                const nameParts = fullname.trim().split(/\s+/);
                if (nameParts.length !== 3) {
                    return res.status(400).json({ error: 'ФИО должно состоять ровно из трех слов' });
                }
                updateData.fullName = fullname
            };

            if (age && !(age.trim === '')) updateData.age = parseInt(age);
            if (gender && !(gender.trim === '')) updateData.gender = gender;
            if (login && !(login.trim === '')) {
                // Проверка уникальности логина
                const loginExists = await prisma.player.findFirst({
                    where: {
                        login,
                        id: { not: id } // Исключаем текущего игрока
                    }
                });

                if (loginExists) {
                    return res.status(400).json({ error: 'Такой логин уже существует' });
                }
                updateData.login = login;
            }
            if (password && !(password.trim === '')) {
                const hashedPassword = await bcrypt.hash(password, 10);
                updateData.password = hashedPassword;
            }

            // Обновление игрока
            const updatedPlayer = await prisma.player.update({
                where: { id: id },
                data: updateData
            });

            // Удаляем пароль из ответа
            const { password: _, login: __, ...playerWithoutPassword } = updatedPlayer;

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

            // if (!admin || !admin.isAdmin) {
            //     return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора' });
            // }

            // Получение всех игроков
            const players = await prisma.player.findMany({
                where: {
                    isAdmin: false // Исключаем пользователей с isAdmin: true
                },
                select: {
                    id: true,
                    fullName: true,
                    age: true,
                    gender: true,
                    status: admin.isAdmin ? true : false,
                    availability: true,
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
        const { id } = req.params; // ID игрока

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
                where: { id },
            });

            if (!existingPlayer) {
                return res.status(404).json({ error: 'Игрок не найден' });
            }

            // Переключение статуса
            const newStatus = existingPlayer.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';

            const updatedPlayer = await prisma.player.update({
                where: { id },
                data: { status: newStatus },
                select: { id: true, fullName: true, status: true }
            });

            res.json({
                message: `Статус игрока успешно переключен на ${newStatus}`,
                player: updatedPlayer
            });

        } catch (error) {
            console.error('Error in changePlayerStatus:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
    getPlayerById: async (req, res) => {
        try {
            // Получение данных игрока по переданному id
            const { id } = req.params; // id игрока передается в параметрах запроса
            const player = await prisma.player.findUnique({
                where: { id: id }, // Преобразуем id в число
                select: {
                    id: true,
                    fullName: true,
                    age: true,
                    gender: true
                }
            });

            if (!player) {
                return res.status(404).json({ error: 'Игрок не найден' });
            }

            res.json(player);

        }
        catch (error) {
            console.error('Error in getPlayerById:', error);
            res.status(500).json({
                error: 'Internal server error',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },
    getCurrentPlayer: async (req, res) => {
        try {
            const player = await prisma.player.findUnique({
                where: { id: req.player.id },
                select: {
                    id: true,
                    fullName: true,
                    age: true,
                    availability: true,
                    status: true,
                    gender: true,
                    isAdmin: true
                }
            });

            if (!player) {
                return res.status(404).json({ error: 'Игрок не найден' });
            }
            return res.status(200).json(player);

        }
        catch (error) {
            console.error('Error in getPlayerById:', error);
            res.status(500).json({
                error: 'Internal server error',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

}
module.exports = PlayerController;