const { pendingInvites, onlinePlayers, playerStates } = require('../state');
const { PlayerStatuses, TIMEOUTS } = require('../constants');
const { updateOnlinePlayers } = require('../utils/utils');

module.exports = (socket, io) => {
    // Обработка события приглашения
    socket.on('invite', ({ fromPlayerId, toPlayerId }) => {
        console.log('Игрок', fromPlayerId, 'пригласил игрока', toPlayerId);

        // Проверяем, есть ли комната для toPlayerId (т.е. игрок онлайн)
        const isOnline = io.sockets.adapter.rooms.has(toPlayerId);

        if (isOnline) {
            // Игрок онлайн — отправляем приглашение
            io.to(toPlayerId).emit('invite', { fromPlayerId });

            // Устанавливаем таймер на 10 секунд для проверки ответа
            const timeoutId = setTimeout(() => {
                console.log(`Игрок ${toPlayerId} не ответил. Таймер истёк.`);

                // Уведомляем обе стороны о превышении времени ожидания
                io.to(fromPlayerId).emit('rejected', {
                    fromPlayerId: toPlayerId,
                    message: {
                        text: `Игрок ${toPlayerId} не ответил на приглашение.`,
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
            console.log('Игрок', toPlayerId, 'не в сети. Уведомляем отправителя.');
            io.to(fromPlayerId).emit('rejected', {
                fromPlayerId: toPlayerId,
                message: {
                    text: `Игрок ${toPlayerId} не в сети.`,
                    type: 'warning',
                },
            });
        }
    });

    // Обработка принятия приглашения
    socket.on('accept', ({ fromPlayerId, toPlayerId }) => {
        console.log(`Игрок ${toPlayerId} принял приглашение от игрока ${fromPlayerId}.`);

        // Удаляем таймер, если приглашение принято
        const timeoutId = pendingInvites.get(`${toPlayerId}-${fromPlayerId}`);
        if (timeoutId) {
            clearTimeout(timeoutId);
            pendingInvites.delete(`${toPlayerId}-${fromPlayerId}`);
        }
        // Обновляем статус игроков в onlinePlayers
        if (onlinePlayers.has(fromPlayerId)) {
            const fromPlayer = onlinePlayers.get(fromPlayerId);
            onlinePlayers.set(fromPlayerId, {
                ...fromPlayer,
                availability: PlayerStatuses.IN_GAME,
            });
            playerStates.set(fromPlayerId, "IN_GAME");
        }

        if (onlinePlayers.has(toPlayerId)) {
            const toPlayer = onlinePlayers.get(toPlayerId);
            onlinePlayers.set(toPlayerId, {
                ...toPlayer,
                availability: PlayerStatuses.IN_GAME,
            });
            playerStates.set(toPlayerId, "IN_GAME");
        }

        // Уведомляем всех клиентов о новом списке игроков
        updateOnlinePlayers(io);
    });

    // Обработка отклонения приглашения
    socket.on('decline', ({ fromPlayerId, toPlayerId }) => {
        console.log(`Игрок ${toPlayerId} отклонил приглашение от игрока ${fromPlayerId}.`);

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
