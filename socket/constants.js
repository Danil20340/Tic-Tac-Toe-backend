const PlayerStatuses = {
    AVAILABLE: 'AVAILABLE',
    IN_GAME: 'IN_GAME',
    DISCONNECTED: 'DISCONNECTED',
};

const TIMEOUTS = {
    INVITE_RESPONSE: 10_000, // 10 секунд
    DISCONNECT_GRACE_PERIOD: 300_000, // 5 минут
};

module.exports = { PlayerStatuses, TIMEOUTS };
