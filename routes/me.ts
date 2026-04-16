import express, { Request, Response } from 'express';
import authMiddleware from '../middlewares/authMiddleware';
const router = express.Router();

import pool from '../db';
import { extractBearerToken } from '../helpers/extractBearerToken';

router.get('/', authMiddleware(), async (req: Request, res: Response) => {
    const token = extractBearerToken(req.headers.authorization);
    if ("error" in token) return res.status(401).json({ error: token.error });
    
    try {
        const { rows }: any = await pool.query('SELECT * FROM users WHERE id = $1', [token.decoded.id]);
        if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });
        const { password, ...data} = rows[0];
        res.json({ data: data });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

router.put('/edit', authMiddleware(), async (req: Request, res: Response) => {
    const token = extractBearerToken(req.headers.authorization);
    if ("error" in token) return res.status(401).json({ error: token.error });

    const { name, email } = req.body;
    
    try {
        const { rows }: any = await pool.query('UPDATE users SET name = $1, email = $2, updated_at = $3 WHERE id = $4 RETURNING *', [name, email, new Date(), token.decoded.id]);
        if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });
        const { password, ...data} = rows[0];
        res.json({ data: data });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

   
export default router;