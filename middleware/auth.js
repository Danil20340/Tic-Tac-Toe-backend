const jwt = require('jsonwebtoken');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];

        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Invalid token format' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token is required' });
        }

        jwt.verify(token, process.env.SECRET_KEY, (err, player) => {
            if (err) {
                return res.status(403).json({
                    error: 'Invalid token',
                    details: process.env.NODE_ENV === 'development' ? err.message : undefined
                });
            }
            req.player = player;
            next();
        });
    } catch (error) {
        console.error('Error in authentication middleware:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = authenticateToken;