import { Request, Response, NextFunction } from 'express';
import { extractBearerToken } from '../helpers/extractBearerToken';

const jwt = require('jsonwebtoken');

const authMiddleware = (onlyAdmin = false) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const token = extractBearerToken(req.headers.authorization);
        if ("error" in token) return res.status(401).json({ error: token.error });

        jwt.verify(token.token, process.env.JWTSECRETKEY, (err: any, decoded: any) => {
            if (err || !decoded) return res.status(403).send({ error: 'Token inválido' });
            if (onlyAdmin && decoded.role !== "ADMIN") return res.status(403).send({ error: 'Você não tem permissão' });
            // req.userId = decoded.id; // Define o ID do usuário para uso posterior
            return next();
        });
    };
};

export default authMiddleware;