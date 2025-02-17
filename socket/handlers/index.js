const connectionHandler = require('./connection');
const disconnectHandler = require('./disconnect');
const inviteHandler = require('./invite');
const getPlayersHandler = require('./initOnlinePlayers');
const getChat = require('./chat');
const gameMove = require('./gameMove');

module.exports = (socket, io) => {
    connectionHandler(socket, io);
    disconnectHandler(socket, io);
    inviteHandler(socket, io);
    getPlayersHandler(socket, io);
    getChat(socket, io);
    gameMove(socket, io);
};
