const { updateOnlinePlayers } = require('../utils/utils'); 
const { onlinePlayers, disconnectTimers } = require('../state');
const { prisma } = require("../../prisma/prisma-client"); // Модель игрока для обновления в БД
module.exports = (socket, io) => {
    // console.log("Подключение: socket.id =", socket.id, "IP =", socket.handshake.address);

    socket.on('register', async ({ playerId, fullName }) => {
        try {
            // Проверяем таймеры отключения
            if (disconnectTimers.has(playerId)) {
                clearTimeout(disconnectTimers.get(playerId));
                disconnectTimers.delete(playerId);
            }

            // Извлекаем данные игрока из базы
            const player = await prisma.player.findUnique({
                where: { id: playerId }, // Используем `findUnique` с `where`
            });

            if (!player) {
                // console.log(`Игрок с ID ${playerId} не найден в базе данных.`);
                return;
            }

            // Обновляем данные игрока
            onlinePlayers.set(playerId, { 
                fullName: player.fullName,
                availability: player.availability || 'AVAILABLE',
            });

            // Сохраняем данные сокета и присоединяем к комнате
            socket.data.playerId = playerId;
            socket.join(playerId);
            // console.log('При соединение', io.sockets.adapter.rooms);
            // Обновляем список игроков для всех клиентов
            updateOnlinePlayers(io);
            // console.log(`Игрок ${playerId} зарегистрирован. Состояние: ${player.availability}`);
        } catch (error) {
            console.error('Ошибка при регистрации игрока:', error);
        }
    });
};
