import { Request, Response, NextFunction } from 'express';
import { extractBearerToken } from '../helpers/extractBearerToken';

const jwt = require('jsonwebtoken');

const authMiddleware = (onlyAdmin = false) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = extractBearerToken(req.headers.authorization);
        if ("error" in result) return res.status(401).json({ error: result.error });

        jwt.verify(result.token, process.env.JWTSECRETKEY, (err: any, decoded: any) => {
            if (err || !decoded) return res.status(403).send({ error: 'Invalid token' });
            if (onlyAdmin && decoded.role !== "ADMIN") return res.status(403).send({ error: 'You are not allowed' });
            // req.userId = decoded.id; // Define o ID do usuário para uso posterior
            return next();
        });
    };
};

export default authMiddleware;