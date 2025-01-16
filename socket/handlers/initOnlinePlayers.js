const { onlinePlayers } = require('../state');
module.exports = (socket, io) => {
    socket.on('getOnlinePlayers', ({ fromPlayerId }) => {
        io.to(fromPlayerId).emit('players', Array.from(onlinePlayers.entries()).map(([id, player]) => ({
            id,
            fullName: player.fullName,
            availability: player.availability,
        })));
    });
}; 