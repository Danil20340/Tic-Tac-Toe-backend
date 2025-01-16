const onlinePlayers = new Map();
const playerStates = new Map();
const disconnectTimers = new Map();
const pendingInvites = new Map();

module.exports = {
    onlinePlayers,
    playerStates,
    disconnectTimers,
    pendingInvites
};
