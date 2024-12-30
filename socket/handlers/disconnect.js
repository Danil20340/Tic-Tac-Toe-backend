const { onlinePlayers, playerStates, disconnectTimers } = require('../state');
const { TIMEOUTS } = require('../constants');
const { updateOnlinePlayers } = require('../utils/utils');

module.exports = (socket, io) => {
    socket.on('disconnect', () => {
        const playerId = socket.data.playerId;

        if (playerId) {
            console.log(`Игрок ${playerId} отключился.`);

            // Удаляем игрока из onlinePlayers
            onlinePlayers.delete(playerId);

            // Проверяем, если игрок есть в playerStates
            if (playerStates.has(playerId)) {
                console.log(`Игрок ${playerId} сохраняется в playerStates. Устанавливаем таймер на 5 минут.`);

                // Устанавливаем таймер на 5 минут (300000 мс)
                const timerId = setTimeout(() => {
                    console.log(`Игрок ${playerId} не вернулся за 5 минут. Удаляем из playerStates.`);
                    playerStates.delete(playerId); // Удаляем из playerStates
                    disconnectTimers.delete(playerId); // Удаляем запись о таймере
                }, TIMEOUTS.DISCONNECT_GRACE_PERIOD);

                // Сохраняем таймер в disconnectTimers
                disconnectTimers.set(playerId, timerId);
            }

            // Обновляем список онлайн игроков у всех клиентов
            updateOnlinePlayers(io);
        }
    });
};
