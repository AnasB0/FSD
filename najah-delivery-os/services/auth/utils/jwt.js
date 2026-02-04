const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret';
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

function generateAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
}

function verifyToken(token, type = 'access') {
  const secret = type === 'access' ? ACCESS_SECRET : REFRESH_SECRET;
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

function getRefreshTokenExpiry() {
  const expiry = REFRESH_EXPIRY || '7d';
  const match = expiry.match(/^(\d+)([smhd])$/);
  
  if (!match) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  const multipliers = {
    's': 1000,
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000
  };
  
  return new Date(Date.now() + value * multipliers[unit]);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  getRefreshTokenExpiry
};
