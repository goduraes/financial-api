import express, { Request, Response } from 'express';
import authMiddleware from '../middlewares/authMiddleware';
const router = express.Router();

import pool from '../db';
import { extractBearerToken } from '../helpers/extractBearerToken';

// list
router.get('/', authMiddleware(), async (req: Request, res: Response) => {
    const token = extractBearerToken(req.headers.authorization);
    if ("error" in token) return res.status(401).json({ error: token.error });
    
    try {
        const { rows }: any = await pool.query(`
            SELECT 
                t.*,
                tag.name AS tag_name
                tag.color AS tag_color
            FROM transactions t
            LEFT JOIN tags tag ON tag.id = t.tag_id
            WHERE t.user_id = $1;    
        `, [token.decoded.id]);
        res.json({ data: rows });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

//add
router.post('/add', authMiddleware(), async (req: Request, res: Response) => {
    const token = extractBearerToken(req.headers.authorization);
    if ("error" in token) return res.status(401).json({ error: token.error });
    
    const { description, value, date, tag_id, type } = req.body;

    try {
        const { rows } = await pool.query('INSERT INTO transactions (description, value, date, tag_id, type, user_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [description, value, date, tag_id, type, token.decoded.id, new Date()]);
        if (!rows.length) return res.status(500).json({ error: 'Não foi possível recuperar a linha inserida' });
        res.json({ data: rows[0] });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

export default router;