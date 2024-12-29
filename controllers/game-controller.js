const { prisma } = require("../prisma/prisma-client");


const { getIO } = require('../socket'); // Импортируйте экземпляр io

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
    }
};

module.exports = GameController;