const { onlinePlayers } = require('../state');
const updateOnlinePlayers = (io) => {
    const onlinePlayersList = Array.from(onlinePlayers.entries()).map(([id, player]) => ({
        id,
        fullName: player.fullName,
        availability: player.availability,
    }));
    io.emit('online-players', onlinePlayersList);
};

module.exports = { updateOnlinePlayers };
