const { chatBuffer } = require('../state');

module.exports = (socket, io) => {
    socket.on('initChat', ({ gameId }) => {
        socket.join(gameId);
    });

    // Отправка сообщения
    socket.on("sendMessage", async ({ gameId, sender, message }) => {
        const chatMessage = {
            sender,
            message,
            timestamp: new Date().toISOString() 
        };

        if (!chatBuffer[gameId]) {
            chatBuffer[gameId] = [];
        }
        chatBuffer[gameId].push(chatMessage);

        io.to(gameId).emit("receiveMessage", chatMessage);
    });

};