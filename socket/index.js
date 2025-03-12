const { Server } = require('socket.io');
const handlers = require('./handlers/index');
require('./utils/saveChatMessages');
let io;

module.exports = {
    init: (server) => {
        io = new Server(server, { cors: { origin: '*' } });

        io.on('connection', (socket) => {
            handlers(socket, io); // Подключаем все обработчики
        });

        return io;
    }
};
