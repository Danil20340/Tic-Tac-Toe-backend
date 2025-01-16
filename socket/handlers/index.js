const disconnectHandler = require('./disconnect');
const connectionHandler = require('./connection');
const inviteHandler = require('./invite');
const getPlayersHandler = require('./initOnlinePlayers');

module.exports = (socket, io) => {
    inviteHandler(socket, io);
    disconnectHandler(socket, io);
    connectionHandler(socket, io);
    getPlayersHandler(socket, io);
};
