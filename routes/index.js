const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const { PlayerController } = require('../controllers')
const { GameController } = require('../controllers')

router.post('/login', PlayerController.login)
router.post('/register', authenticateToken, PlayerController.register)
router.patch('/players', authenticateToken, PlayerController.updatePlayer)
router.get('/players', authenticateToken, PlayerController.getAllPlayers)
router.patch('/change/:id', authenticateToken, PlayerController.changePlayerStatus)
router.get('/player/:id', authenticateToken, PlayerController.getPlayerById)
router.get('/current', authenticateToken, PlayerController.getCurrentPlayer)

router.get('/rating', authenticateToken, GameController.getPlayerRatings)
router.get('/game/:id', authenticateToken, GameController.getCurrentGame)
router.get('/messages/:id', authenticateToken, GameController.getGameMessages)
router.get('/games', authenticateToken, GameController.getGamesTable)

module.exports = router;