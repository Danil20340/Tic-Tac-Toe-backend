const onlinePlayers = new Map();
const playerStates = new Map();
const disconnectTimers = new Map();
const pendingInvites = new Map();

// Установка таймера отключения
const setDisconnectTimer = (playerId, callback, timeout) => {
    const timerId = setTimeout(callback, timeout);
    disconnectTimers.set(playerId, timerId);
};

// Отмена таймера отключения
const clearDisconnectTimer = (playerId) => {
    if (disconnectTimers.has(playerId)) {
        clearTimeout(disconnectTimers.get(playerId));
        disconnectTimers.delete(playerId);
    }
};

module.exports = {
    onlinePlayers,
    playerStates,
    disconnectTimers,
    pendingInvites,
    setDisconnectTimer,
    clearDisconnectTimer,
};
