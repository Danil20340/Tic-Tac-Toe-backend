const { Server } = require('socket.io');

let io;
const pendingInvites = new Map(); // Хранилище для таймеров по каждому приглашению
const onlinePlayers = new Map();
const playerStates = new Map(); // Состояния всех игроков (включая отключившихся): playerId -> status
const disconnectTimers = new Map(); // Хранилище таймеров отключённых игроков

module.exports = {
    init: (server) => {
        io = new Server(server, {
            cors: { origin: '*' }, // Разрешите доступ с любых источников (или укажите конкретные)
        });
        const updateOnlinePlayers = () => {
            io.emit(
                'online-players',
                Array.from(onlinePlayers.entries()).map(([id, player]) => ({
                    id,
                    fullName: player.fullName,
                    availability: player.availability,
                }))
            );
        };

        io.on('connection', (socket) => {
            console.log("Подключение: socket.id =", socket.id, "IP =", socket.handshake.address);

            // Регистрация игрока
            socket.on('register', ({ playerId, fullName }) => {
                // Если игрок переподключается, удаляем таймер
                if (disconnectTimers.has(playerId)) {
                    clearTimeout(disconnectTimers.get(playerId)); // Отменяем таймер
                    disconnectTimers.delete(playerId); // Удаляем запись о таймере
                    console.log(`Игрок ${playerId} переподключился. Таймер отменён.`);
                }

                // Восстанавливаем его статус в onlinePlayers
                onlinePlayers.set(playerId, {
                    fullName,
                    availability: playerStates.get(playerId) || 'AVAILABLE', // Если игрок остался в playerStates, сохраняем его состояние
                });

                socket.data.playerId = playerId; // Сохраняем playerId в данных сокета
                socket.join(playerId); // Присоединяем игрока к комнате с его playerId

                // Обновляем список онлайн игроков у всех клиентов
                updateOnlinePlayers();
                console.log(`Игрок ${playerId} зарегистрирован и добавлен обратно в список.`);
            });
            // Обработка приглашений
            socket.on('invite', ({ fromPlayerId, toPlayerId }) => {
                console.log('Игрок', fromPlayerId, 'пригласил игрока', toPlayerId);

                // Проверяем, есть ли комната для toPlayerId (т.е. игрок онлайн)
                const isOnline = io.sockets.adapter.rooms.has(toPlayerId);

                if (isOnline) {
                    // Игрок онлайн — отправляем приглашение
                    io.to(toPlayerId).emit('invite', { fromPlayerId });

                    // Устанавливаем таймер на 10 секунд для проверки ответа
                    const timeoutId = setTimeout(() => {
                        console.log(`Игрок ${toPlayerId} не ответил. Отправляем уведомление об отказе.`);
                        io.to(fromPlayerId).emit('rejected', {
                            fromPlayerId: toPlayerId,
                            message: {
                                text: `Игрок fullName отошёл`,
                                type: "warning"
                            }
                        });
                        io.to(toPlayerId).emit('rejected', {
                            fromPlayerId: toPlayerId,
                            message: {
                                text: `Превышено время ожидания принятия приглашения`,
                                type: "error"
                            }
                        });
                        // Удаляем запись о таймере
                        pendingInvites.delete(`${fromPlayerId}-${toPlayerId}`);
                    }, 10000); // 10 секунд

                    // Сохраняем таймер для возможной отмены
                    pendingInvites.set(`${fromPlayerId}-${toPlayerId}`, timeoutId);
                } else {
                    // Игрок оффлайн — уведомляем отправителя
                    console.log('Игрок', toPlayerId, 'не в сети. Уведомляем отправителя.');
                    io.to(fromPlayerId).emit('rejected', {
                        fromPlayerId: toPlayerId,
                        message: {
                            text: `Игрок fullName не в сети`,
                            type: "warning"
                        }
                    });
                }
            });
            // Обновление статуса игрока
            socket.on('accept', ({ fromPlayerId, toPlayerId }) => {
                // Удаляем запись о таймере
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
                        availability: "IN_GAME", // Обновляем статус
                    });
                }

                if (onlinePlayers.has(toPlayerId)) {
                    const toPlayer = onlinePlayers.get(toPlayerId);
                    onlinePlayers.set(toPlayerId, {
                        ...toPlayer,
                        availability: "IN_GAME", // Обновляем статус
                    });
                }

                console.log(`Игрок ${fromPlayerId} и игрок ${toPlayerId} обновили статус для игры`);

                // Уведомляем всех клиентов о новом списке игроков
                updateOnlinePlayers();
            });

            // Обработка отклонения приглашения
            socket.on('decline', ({ fromPlayerId, toPlayerId }) => {
                console.log('Игрок', fromPlayerId, 'отклонил приглашение игрока', toPlayerId);

                // Отменяем таймер, если приглашение отклонено
                const timeoutId = pendingInvites.get(`${toPlayerId}-${fromPlayerId}`);
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    pendingInvites.delete(`${toPlayerId}-${fromPlayerId}`);
                }

                io.to(toPlayerId).emit('rejected', {
                    fromPlayerId,
                    message: {
                        text: `Игрок fullName отклонил приглашение`,
                        type: "warning"
                    }
                });
            });

            // Обработка отключения игрока
            socket.on("disconnect", () => {
                const playerId = socket.data.playerId;
                if (playerId) {
                    onlinePlayers.delete(playerId); // Удаляем игрока из onlinePlayers
                    console.log(`Игрок ${playerId} отключился`);

                    // Проверяем, если игрок есть в playerStates
                    if (playerStates.has(playerId)) {
                        console.log(`Игрок ${playerId} находится в playerStates. Устанавливаем таймер на 5 минут.`);

                        // Устанавливаем таймер на 5 минут (300000 мс)
                        const timerId = setTimeout(() => {
                            console.log(`Игрок ${playerId} не вернулся за 5 минут. Удаляем из playerStates.`);
                            playerStates.delete(playerId); // Удаляем из playerStates
                            disconnectTimers.delete(playerId); // Удаляем запись о таймере
                        }, 5 * 60 * 1000); // 5 минут

                        // Сохраняем таймер в disconnectTimers
                        disconnectTimers.set(playerId, timerId);
                    }

                    // Обновляем список онлайн игроков у всех клиентов
                    updateOnlinePlayers();
                }
            });
            // Обработка ошибок сокета
            socket.on("error", (error) => {
                console.log("Ошибка: socket.id =", socket.id, "error =", error);
            });
        });

        return io;
    },

    getIO: () => {
        if (!io) {
            throw new Error('Socket.io не инициализирован!');
        }
        return io;
    },
};
