import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    isReadOnly?: boolean;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const bearerToken = req.header('Authorization')?.replace('Bearer ', '');
  const cookieToken = (req as any).cookies?.auth_token as string | undefined;
  const token = bearerToken || cookieToken;

  if (!token) {
    return res.status(401).json({ message: 'No authentication token, access denied' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key_123') as {
      id: string;
      role: string;
      isReadOnly?: boolean;
    };
    req.user = verified;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token verification failed, authorization denied' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient privileges' });
    }
    next();
  };
};

export const requireWritable = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  if (req.user.isReadOnly) {
    return res.status(403).json({ message: 'Demo account is read-only' });
  }
  next();
};
