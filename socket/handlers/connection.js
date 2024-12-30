const { updateOnlinePlayers } = require('../utils/utils');
const { onlinePlayers, playerStates, disconnectTimers } = require('../state');

module.exports = (socket, io) => {
    console.log("Подключение: socket.id =", socket.id, "IP =", socket.handshake.address);

    socket.on('register', ({ playerId, fullName }) => {
        // Логика регистрации
        if (disconnectTimers.has(playerId)) {
            clearTimeout(disconnectTimers.get(playerId));
            disconnectTimers.delete(playerId);
        }
        onlinePlayers.set(playerId, {
            fullName,
            availability: playerStates.get(playerId) || 'AVAILABLE',
        });
        socket.data.playerId = playerId;
        socket.join(playerId);

        updateOnlinePlayers(io);
        console.log(`Игрок ${playerId} зарегистрирован.`);
    });
};
