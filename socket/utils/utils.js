const { onlinePlayers, moveTimers } = require('../state');
const { prisma } = require("../../prisma/prisma-client");
const updateOnlinePlayers = (io) => {
    const onlinePlayersList = Array.from(onlinePlayers.entries()).map(([id, player]) => ({
        id,
        fullName: player.fullName,
        availability: player.availability,
    }));
    io.emit('online-players', onlinePlayersList);
};
function updatePlayerStatusInMemory(playerId, availability) {
    if (onlinePlayers.has(playerId)) {
        const player = onlinePlayers.get(playerId);
        onlinePlayers.set(playerId, {
            ...player,
            availability,
        });
    }
}
//Создаем таймер хода
const updateMoveTimer = async (io, gameId) => {
    // Таймер для предупреждения за минуту до окончания
    const alertTimeout = setTimeout(() => {
        io.to(gameId).emit('alertAboutMove');
    }, 4 * 60 * 1000); // 4 минуты

    // Основной таймер
    const mainTimeout = setTimeout(async () => {
        try {
            const game = await prisma.game.findUnique({ where: { id: gameId } });

            if (!game) return;

            // Определяем проигравшего
            const loserId = game.nowMove === game.player1Symbol ? game.player1Id : game.player2Id;
            const winnerId = loserId === game.player1Id ? game.player2Id : game.player1Id;

            // Обновляем статус игры и назначаем победителя
            const updatedGame = await prisma.game.update({
                where: { id: gameId },
                data: {
                    status: "FINISHED",
                    winnerId: winnerId,
                    endTime: new Date()
                }
            });
            io.to(gameId).emit('moveMade', { ...updatedGame });
            //Обновляем статусы доступности игроков
            await prisma.player.updateMany({
                where: { id: { in: [game.player1Id, game.player2Id] } },
                data: { availability: 'AVAILABLE' }
            });
            updatePlayerStatusInMemory(game.player1Id, 'AVAILABLE');
            updatePlayerStatusInMemory(game.player2Id, 'AVAILABLE');
            io.socketsLeave(gameId);
            
        } catch (error) {
            console.error("Ошибка при обработке таймера хода:", error);
        }
    }, 5 * 60 * 1000); // 5 минут

    moveTimers.set(gameId, { alertTimeout, mainTimeout });
};
module.exports = { updateOnlinePlayers, updatePlayerStatusInMemory, updateMoveTimer };
