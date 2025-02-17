const { prisma } = require("../prisma/prisma-client");

const GameController = {
    getPlayerRatings: async (req, res) => {
        try {
            // Получение рейтинга игроков с расчётом процента побед
            const ratings = await prisma.rating.findMany({
                where: {
                    player: {
                        isAdmin: false // Исключаем пользователей с isAdmin: true
                    }
                },
                select: {
                    id: true,
                    player: {
                        select: {
                            fullName: true,
                        },
                    },
                    totalGames: true,
                    wins: true,
                    losses: true,
                    draw: true,
                },
            });

            // Добавление расчёта процента побед
            const result = ratings.map((rating) => {
                const winPercentage = rating.totalGames > 0
                    ? ((rating.wins / rating.totalGames) * 100).toFixed(2)
                    : 0;
                return {
                    id: rating.id,
                    playerName: rating.player.fullName,
                    totalGames: rating.totalGames,
                    wins: rating.wins,
                    losses: rating.losses,
                    draw: rating.draw,
                    winPercentage: parseFloat(winPercentage), // Преобразуем в число с фиксированной точностью
                };
            });

            res.json(result);
        } catch (error) {
            console.error('Error in getPlayerRatings:', error);
            res.status(500).json({
                error: 'Internal server error',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    },
    getCurrentGame: async (req, res) => {
        try {
            const { id } = req.params; // Получаем ID игрока из запроса

            const game = await prisma.game.findFirst({
                where: {
                    AND: [
                        { status: "ONGOING" }, // Статус игры должен быть "ONGOING"
                        {
                            OR: [
                                { player1Id: id }, // Игрок может быть в игре как player1
                                { player2Id: id }  // Или как player2
                            ]
                        }
                    ]
                },
                select: {
                    id: true,
                    nowMove: true,
                    createTime: true,
                    board: true,
                    player1Id: true,
                    player2Id: true,
                    player1Symbol: true,
                    player2Symbol: true,
                    player1: {
                        select: {
                            fullName: true,
                            ratings: { select: { wins: true, totalGames: true } }
                        }
                    },
                    player2: {
                        select: {
                            fullName: true,
                            ratings: { select: { wins: true, totalGames: true } }
                        }
                    }
                }
            });

            if (!game) {
                return res.status(404).json({ error: 'Нет активной игры для этого игрока' });
            }

            // Функция расчета процента побед
            const calculateWinRate = (rating) => {
                if (!rating || rating.totalGames === 0) return 0;
                return Math.round((rating.wins / rating.totalGames) * 100);
            };

            // Определяем символ текущего игрока
            const playerSymbol = game.player1Id === id ? game.player1Symbol : game.player2Symbol;
            return res.status(200).json({
                id: game.id,
                nowMove: game.nowMove,
                createTime: game.createTime,
                board: game.board,
                playerSymbol, // Символ текущего игрока
                player1: {
                    fullName: game.player1.fullName,
                    winRate: calculateWinRate(game.player1.ratings[0]) // Учитываем массив ratings
                },
                player2: {
                    fullName: game.player2.fullName,
                    winRate: calculateWinRate(game.player2.ratings[0])
                }
            });

        } catch (error) {
            console.error('Ошибка в getCurrentGame:', error);
            res.status(500).json({
                error: 'Внутренняя ошибка сервера',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },
    getGameMessages: async (req, res) => {
        try {
            const { id } = req.params;
            console.log(id);

            // Проверяем, существует ли игра
            const game = await prisma.game.findUnique({
                where: { id: id },
            });

            if (!game) return;

            // Получаем сообщения
            const messages = await prisma.chatMessage.findMany({
                where: { gameId: id }, // исправлено с id на gameId
                include: {
                    sender: { select: { id: true, fullName: true } } // Подключаем данные отправителя
                },
                orderBy: { timestamp: "asc" } // Сортируем по времени
            });

            res.json(messages);
            console.log(messages);
        } catch (error) {
            console.error("Ошибка получения сообщений чата:", error);
            res.status(500).json({ error: "Ошибка сервера" });
        }
    }
};

module.exports = GameController;