import { Request, Response, NextFunction } from 'express';

const jwt = require('jsonwebtoken');

const authMiddleware = (onlyAdmin = false) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).send({ error: 'Token not provided' });

        const parts = authHeader.split(' ');
        if (parts.length !== 2) return res.status(401).send({ error: 'Token error' });

        const [scheme, token] = parts;
        if (!/^Bearer$/i.test(scheme)) return res.status(401).send({ error: 'Malformatted token' });

        jwt.verify(token, process.env.JWTSECRETKEY, (err: any, decoded: any) => {
            if (onlyAdmin && decoded.role !== "ADMIN") return res.status(401).send({ error: 'You are not allowed' });
            if (err) return res.status(401).send({ error: 'Invalid token' });
            // req.userId = decoded.id; // Define o ID do usuário para uso posterior
            return next();
        });
    };
};

export default authMiddleware;