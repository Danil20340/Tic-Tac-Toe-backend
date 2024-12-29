const { Server } = require('socket.io');

let io;
const pendingInvites = new Map(); // Хранилище для таймеров по каждому приглашению
const onlinePlayers = new Map();
module.exports = {
    init: (server) => {
        io = new Server(server, {
            cors: { origin: '*' }, // Разрешите доступ с любых источников (или укажите конкретные)
        });

        io.on('connection', (socket) => {
            console.log("Подключение: socket.id =", socket.id, "IP =", socket.handshake.address);

            // Регистрация игрока

            socket.on('register', ({ playerId, fullName }) => {
                // Сохраняем данные игрока в onlinePlayers
                onlinePlayers.set(playerId, {
                    fullName,
                    availability: 'AVAILABLE'
                });
                
                // Сохраняем playerId в данных сокета
                socket.data.playerId = playerId;
                socket.join(playerId); // Присоединяем игрока к комнате с его playerId

                // Обновляем список онлайн игроков у всех клиентов
                io.emit('online-players', Array.from(onlinePlayers.entries()));
                console.log(`Обновлен список онлайн игроков: ${Array.from(onlinePlayers.entries())}`);
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
                    onlinePlayers.delete(playerId);
                    console.log(`Игрок ${playerId} отключился`);

                    // Обновляем список онлайн игроков у всех клиентов
                    io.emit('online-players', Array.from(onlinePlayers.entries()));
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
