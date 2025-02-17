const { prisma } = require("../../prisma/prisma-client");
const { updatePlayerStatusInMemory, updateMoveTimer } = require('../utils/utils');
const { moveTimers } = require('../state');
module.exports = (socket, io) => {
    socket.on("playerMove", async ({ board, id }) => {
        try {
            const game = await prisma.game.findUnique({ where: { id } });

            if (!game || game.status !== "ONGOING") return;

            const expectedSymbol = game.nowMove;

            const boardDiffs = game.board.map((cell, i) => (cell !== board[i] ? i : -1)).filter(i => i !== -1);

            if (boardDiffs.length !== 1) {
                return console.error('Некорректный ход. Поле игры подменено');
            }

            const changedIndex = boardDiffs[0];

            if (board[changedIndex] !== expectedSymbol) {
                return console.error('Неверный ход. Сейчас очередь другого игрока');
            }

            if (game.board[changedIndex] !== null) {
                return console.error('Некорректный ход. Ячейка уже занята');
            }

            // Проверка на победу + возврат выигрышного паттерна
            const checkWinner = (board, symbol) => {
                const winPatterns = [
                    [0, 1, 2], [3, 4, 5], [6, 7, 8],
                    [0, 3, 6], [1, 4, 7], [2, 5, 8],
                    [0, 4, 8], [2, 4, 6]
                ];
                const winningPattern = winPatterns.find(pattern =>
                    pattern.every(index => board[index] === symbol)
                );
                return winningPattern || null; // Возвращаем либо массив победных индексов, либо null
            };

            let newStatus = 'ONGOING';
            let winnerId = null;
            let winningPattern = null;

            if ((winningPattern = checkWinner(board, 'X'))) {
                newStatus = 'FINISHED';
                winnerId = game.player1Symbol === 'X' ? game.player1Id : game.player2Id;
            } else if ((winningPattern = checkWinner(board, 'O'))) {
                newStatus = 'FINISHED';
                winnerId = game.player1Symbol === 'O' ? game.player1Id : game.player2Id;
            } else if (!board.includes(null)) {
                newStatus = 'DRAW';
            }

            // Обновляем игру в БД
            const updatedGame = await prisma.game.update({
                where: { id },
                data: {
                    board,
                    nowMove: expectedSymbol === 'X' ? 'O' : 'X',
                    status: newStatus,
                    winnerId
                }
            });
            // Очищаем предыдущий таймер, если он есть
            if (moveTimers.has(id)) {
                const timers = moveTimers.get(id);
                if (timers) {
                    clearTimeout(timers.alertTimeout); // Очистка таймера предупреждения
                    clearTimeout(timers.mainTimeout);  // Очистка основного таймера
                }
                moveTimers.delete(id); // Удаляем запись из мапы
            }
            //Если игра не завершена то назначаем новый таймер хода
            if (updatedGame.status === 'ONGOING') updateMoveTimer(io, id);
            // Отправляем обновлённые данные обоим игрокам
            io.to(id).emit('moveMade', { ...updatedGame, winningPattern });
            // Если игра завершена, обновляем статус игроков
            if (newStatus !== 'ONGOING') {
                await prisma.player.updateMany({
                    where: { id: { in: [game.player1Id, game.player2Id] } },
                    data: { availability: 'AVAILABLE' }
                });
                updatePlayerStatusInMemory(game.player1Id, 'AVAILABLE');
                updatePlayerStatusInMemory(game.player2Id, 'AVAILABLE');
                io.socketsLeave(id);
            }
        } catch (error) {
            console.error("Ошибка обработки хода:", error);
        }
    });
};
