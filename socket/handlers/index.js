// const inviteHandler = require('./invite');
const disconnectHandler = require('./disconnect');
const connectionHandler = require('./connection');
const inviteHandler = require('./invite');

module.exports = (socket, io) => {
    inviteHandler(socket, io);
    disconnectHandler(socket, io);
    connectionHandler(socket, io);
};
