import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
export declare const createTicketType: (req: AuthRequest, res: Response) => Promise<any>;
export declare const getTicketTypes: (req: Request, res: Response) => Promise<any>;
export declare const registerForEvent: (req: AuthRequest, res: Response) => Promise<any>;
export declare const verifyPayment: (req: AuthRequest, res: Response) => Promise<any>;
export declare const getUserRegistrations: (req: AuthRequest, res: Response) => Promise<any>;
//# sourceMappingURL=ticketController.d.ts.map