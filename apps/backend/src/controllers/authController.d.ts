import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
export declare const register: (req: Request, res: Response) => Promise<any>;
export declare const login: (req: Request, res: Response) => Promise<any>;
export declare const getMe: (req: AuthRequest, res: Response) => Promise<any>;
//# sourceMappingURL=authController.d.ts.map