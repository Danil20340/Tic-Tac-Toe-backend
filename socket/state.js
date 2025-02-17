const onlinePlayers = new Map();
const disconnectTimers = new Map();
const pendingInvites = new Map();
const moveTimers = new Map();
const chatBuffer = {};

module.exports = {
    onlinePlayers,
    disconnectTimers,
    pendingInvites,
    chatBuffer,
    moveTimers
};
