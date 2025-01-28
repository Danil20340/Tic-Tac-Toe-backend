const { onlinePlayers, disconnectTimers } = require('../state');  
const { TIMEOUTS } = require('../constants');
const { updateOnlinePlayers } = require('../utils/utils');
const { prisma } = require("../../prisma/prisma-client"); // Модель игрока для обновления в БД

module.exports = (socket, io) => {
    socket.on('disconnect', () => {
        const playerId = socket.data.playerId;

        if (playerId) {
            console.log(`Игрок ${playerId} отключился.`);

            // Удаляем игрока из onlinePlayers
            onlinePlayers.delete(playerId);

            // Проверяем статус игрока в базе данных
            prisma.player
                .findUnique({
                    where: { id: playerId },
                })
                .then((player) => {
                    if (player && player.availability === 'IN_GAME') {
                        console.log(
                            `Игрок ${playerId} найден в базе данных со статусом 'IN_GAME'. Устанавливаем таймер на 5 минут.`
                        );

                        // Устанавливаем таймер на 5 минут (300000 мс)
                        const timerId = setTimeout(async () => {
                            console.log(
                                `Игрок ${playerId} не вернулся за 5 минут. Меняем статус на 'AVAILABLE'.`
                            );

                            try {
                                // Обновляем статус игрока в базе данных
                                await prisma.player.update({
                                    where: { id: playerId },
                                    data: { availability: 'AVAILABLE' },
                                });

                                console.log(
                                    `Статус игрока ${playerId} успешно обновлён в базе данных на 'AVAILABLE'.`
                                );
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
                        console.log(
                            `Игрок ${playerId} не найден или имеет статус, отличный от 'IN_GAME'.`
                        );
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
