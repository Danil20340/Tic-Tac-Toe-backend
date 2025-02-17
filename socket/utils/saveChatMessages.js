const { chatBuffer } = require('../state');
const { prisma } = require("../../prisma/prisma-client");

const saveChatMessages = async () => {
    for (const gameId in chatBuffer) {
        if (chatBuffer[gameId].length > 0) {
            try {
                // Получаем ID отправителей
                const senderNames = [...new Set(chatBuffer[gameId].map(msg => msg.sender))];
                const players = await prisma.player.findMany({
                    where: { fullName: { in: senderNames } },
                    select: { id: true, fullName: true }
                });

                const playerMap = Object.fromEntries(players.map(p => [p.fullName, p.id]));

                // Записываем в БД
                await prisma.chatMessage.createMany({
                    data: chatBuffer[gameId].map(msg => ({
                        gameId,
                        senderId: playerMap[msg.sender], // Преобразуем имя в ID
                        message: msg.message,
                        timestamp: msg.timestamp
                    }))
                });

                chatBuffer[gameId] = []; // Очищаем буфер
            } catch (error) {
                console.error("Ошибка сохранения сообщений в БД:", error);
            }
        }
    }
};

// Запускаем запись в БД раз в 30 секунд (не привязываем к сокетам)
setInterval(saveChatMessages, 30000);
