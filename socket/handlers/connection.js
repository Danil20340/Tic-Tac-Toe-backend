const { updateOnlinePlayers } = require('../utils/utils');
const { onlinePlayers, disconnectTimers } = require('../state');
const { prisma } = require("../../prisma/prisma-client");
const jwt = require('jsonwebtoken');
module.exports = (socket, io) => {

    socket.on('register', async ({ playerId, token }) => {
        try {
            
            if (!token) {
                return io.emit('tokenError');
            }
            jwt.verify(token, process.env.SECRET_KEY, (err, player) => {
                if (err) {
                    return io.emit('tokenError');
                }
            });
            // Проверяем таймеры отключения
            if (disconnectTimers.has(playerId)) {
                clearTimeout(disconnectTimers.get(playerId));
                disconnectTimers.delete(playerId);
            }

            // Извлекаем данные игрока из базы
            const player = await prisma.player.findUnique({
                where: { id: playerId },
            });

            if (!player) {
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
            // Обновляем список игроков для всех клиентов
            updateOnlinePlayers(io);
        } catch (error) {
            console.error('Ошибка при регистрации игрока:', error);
        }
    });
};
