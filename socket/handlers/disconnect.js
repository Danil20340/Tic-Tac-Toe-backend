const { onlinePlayers, disconnectTimers } = require('../state');  
const { TIMEOUTS } = require('../constants');
const { updateOnlinePlayers } = require('../utils/utils');
const { prisma } = require("../../prisma/prisma-client"); // Модель игрока для обновления в БД

module.exports = (socket, io) => {
    socket.on('disconnect', () => {
        const playerId = socket.data.playerId;

        if (playerId) {

            // Удаляем игрока из onlinePlayers
            onlinePlayers.delete(playerId);

            // Проверяем статус игрока в базе данных
            prisma.player
                .findUnique({
                    where: { id: playerId },
                })
                .then((player) => {
                    if (player && player.availability === 'IN_GAME') {
                        // Устанавливаем таймер на 5 минут (300000 мс)
                        const timerId = setTimeout(async () => {
                            try {
                                // Обновляем статус игрока в базе данных
                                await prisma.player.update({
                                    where: { id: playerId },
                                    data: { availability: 'AVAILABLE' },
                                });
                            } catch (error) {
                                console.error(
                                    `Ошибка при обновлении статуса игрока ${playerId} в базе данных:`,
                                    error
                                );
                            }

                            // Удаляем запись о таймере
                            disconnectTimers.delete(playerId);

                            // Обновляем список онлайн игроков
                            updateOnlinePlayers(io);
                        }, TIMEOUTS.DISCONNECT_GRACE_PERIOD);

                        // Сохраняем таймер в disconnectTimers
                        disconnectTimers.set(playerId, timerId);
                    } else {
                    }
                })
                .catch((error) => {
                    console.error(`Ошибка при поиске игрока ${playerId} в базе данных:`, error);
                });

            // Обновляем список онлайн игроков у всех клиентов
            updateOnlinePlayers(io);
        }
    });
};
