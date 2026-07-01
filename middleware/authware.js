import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';

export const authcheck = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.startsWith('Bearer')) {
    res.status(401);
    throw new Error('UnauthorizedError');
  }

  token = authHeader.split(' ')[1];

  if (!token) {
    res.status(401);
    throw new Error('UnauthorizedError');
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      throw new Error('JsonWebTokenError');
    } else {
      req.user = decoded;
      next();
    }
  });
});