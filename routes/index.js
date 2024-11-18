const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const { PlayerController } = require('../controllers')

router.post('/login', PlayerController.login)
router.post('/register', authenticateToken, PlayerController.register)
router.put('/players/:id', authenticateToken, PlayerController.updatePlayer)
router.get('/players', authenticateToken, PlayerController.getAllPlayers)
router.put('/players/:id', authenticateToken, PlayerController.changePlayerStatus)
module.exports = router;