import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
export declare const createEvent: (req: AuthRequest, res: Response) => Promise<any>;
export declare const getEvents: (req: Request, res: Response) => Promise<any>;
export declare const getEventById: (req: Request, res: Response) => Promise<any>;
export declare const updateEvent: (req: AuthRequest, res: Response) => Promise<any>;
export declare const updateEventStatus: (req: AuthRequest, res: Response) => Promise<any>;
//# sourceMappingURL=eventController.d.ts.map