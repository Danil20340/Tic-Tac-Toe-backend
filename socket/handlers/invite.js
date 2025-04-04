const { pendingInvites } = require('../state');
const { TIMEOUTS } = require('../constants');
const { updateOnlinePlayers, updatePlayerStatusInMemory, updateMoveTimer } = require('../utils/utils');
const { prisma } = require("../../prisma/prisma-client"); 

module.exports = (socket, io) => {
    // Обработка события приглашения
    socket.on('invite', ({ fromPlayerId, toPlayerId }) => {

        // Проверка: если игрок toPlayerId уже приглашен другим fromPlayerId
        for (const [inviteKey] of pendingInvites.entries()) {
            const [existingFromPlayerId, existingToPlayerId] = inviteKey.split('-');
            if (existingToPlayerId === toPlayerId && existingFromPlayerId !== fromPlayerId) {
                // console.log(`Игрок ${toPlayerId} уже приглашен игроком ${existingFromPlayerId}. Уведомляем ${fromPlayerId}.`);

                io.to(fromPlayerId).emit('rejected', {
                    fromPlayerId: toPlayerId,
                    message: {
                        text: `Игрок fullName принимает другое приглашение.`,
                        type: 'warning',
                    },
                });

                return; // Выходим, так как игрок уже занят
            }
        }

        // Проверка: если таймер уже существует для этой пары fromPlayerId-toPlayerId
        if (pendingInvites.has(`${fromPlayerId}-${toPlayerId}`)) {
            return; // Игнорируем повторное приглашение
        }

        // Проверяем, есть ли комната для toPlayerId (т.е. игрок онлайн)
        const isOnline = io.sockets.adapter.rooms.has(toPlayerId);

        if (isOnline) {

            // Игрок онлайн — отправляем приглашение
            // console.log('Игрок', fromPlayerId, 'пригласил игрока', toPlayerId);
            io.to(toPlayerId).emit('invite', { fromPlayerId });

            // Устанавливаем таймер на 10 секунд для проверки ответа
            const timeoutId = setTimeout(() => {
                // Уведомляем обе стороны о превышении времени ожидания
                io.to(fromPlayerId).emit('rejected', {
                    fromPlayerId: toPlayerId,
                    message: {
                        text: `Игрок AFK`,
                        type: 'warning',
                    },
                });

                io.to(toPlayerId).emit('rejected', {
                    fromPlayerId,
                    message: {
                        text: `Время ожидания принятия приглашения истекло.`,
                        type: 'error',
                    },
                });

                // Удаляем запись о таймере
                pendingInvites.delete(`${fromPlayerId}-${toPlayerId}`);
            }, TIMEOUTS.INVITE_RESPONSE);

            // Сохраняем таймер для возможной отмены
            pendingInvites.set(`${fromPlayerId}-${toPlayerId}`, timeoutId);
        } else {
            // Игрок оффлайн — уведомляем отправителя
            io.to(fromPlayerId).emit('rejected', {
                fromPlayerId: toPlayerId,
                message: {
                    text: `Игрок fullName не в сети.`,
                    type: 'warning',
                },
            });
        }
    });

    socket.on('accept', async ({ fromPlayerId, toPlayerId }) => {
        // Удаляем таймер, если приглашение принято
        const inviteKey = `${toPlayerId}-${fromPlayerId}`;
        const timeoutId = pendingInvites.get(inviteKey);
        if (timeoutId) {
            clearTimeout(timeoutId);
            pendingInvites.delete(inviteKey);
        }

        try {
            // Проверяем статус игроков в базе данных
            const players = await prisma.player.findMany({
                where: { id: { in: [fromPlayerId, toPlayerId] } },
                select: { id: true, availability: true },
            });

            if (players.some(player => player.availability === "IN_GAME")) {
                return io.to(fromPlayerId).emit('rejected', {
                    fromPlayerId,
                    message: {
                        text: `Игрок fullName уже находится в игре.`,
                        type: 'warning',
                    },
                });
            }

            // Используем транзакцию для обновления статусов игроков
            await prisma.$transaction([
                prisma.player.update({
                    where: { id: fromPlayerId },
                    data: { availability: "IN_GAME" },
                }),
                prisma.player.update({
                    where: { id: toPlayerId },
                    data: { availability: "IN_GAME" },
                }),
            ]);

            // Обновляем статусы в памяти
            updatePlayerStatusInMemory(fromPlayerId, "IN_GAME");
            updatePlayerStatusInMemory(toPlayerId, "IN_GAME");

            // Создаём игру
            const newGame = await prisma.game.create({
                data: {
                    player1Id: fromPlayerId,
                    player2Id: toPlayerId,
                },
            });
            //Уведомляем игроков о старте игры
            io.to(fromPlayerId).emit('gameStart');
            io.to(toPlayerId).emit('gameStart');
            //Создаем таймер хода
            updateMoveTimer(io, newGame.id);
            // Уведомляем клиентов о новом списке игроков
            updateOnlinePlayers(io);
        } catch (error) {
            console.error(`Ошибка при обработке принятия приглашения:`, error);
            socket.emit('error', { message: "Произошла ошибка при принятии приглашения." });
        }
    });
    // Обработка отклонения приглашения
    socket.on('decline', ({ fromPlayerId, toPlayerId }) => {
        // Отменяем таймер, если приглашение отклонено    
        const timeoutId = pendingInvites.get(`${toPlayerId}-${fromPlayerId}`);
        if (timeoutId) {
            clearTimeout(timeoutId);
            pendingInvites.delete(`${toPlayerId}-${fromPlayerId}`);
        }

        // Уведомляем отправителя об отклонении приглашения
        io.to(toPlayerId).emit('rejected', {
            fromPlayerId,
            message: {
                text: `Игрок fullName отклонил приглашение`,
                type: "warning"
            }
        });
    });
};
