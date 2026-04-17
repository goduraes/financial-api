import express, { Request, Response } from 'express';
import authMiddleware from '../middlewares/authMiddleware';
const router = express.Router();

import pool from '../db';
import { extractBearerToken } from '../helpers/extractBearerToken';

router.get('/summary', authMiddleware(), async (req: Request, res: Response) => {
    console.log(1)
    const token = extractBearerToken(req.headers.authorization);
    if ("error" in token) return res.status(401).json({ error: token.error });
    
    try {
        const { rows }: any = await pool.query(`
            SELECT
                SUM(CASE WHEN type = 'INCOME' THEN value ELSE 0 END)::FLOAT AS total_income,
                SUM(CASE WHEN type = 'EXPENSE' THEN value ELSE 0 END)::FLOAT AS total_expense,
                SUM(CASE WHEN type = 'INCOME' THEN value ELSE -value END)::FLOAT AS balance
            FROM transactions
            WHERE user_id = $1
        `, [token.decoded.id]);

        if (!rows.length) return res.status(500).json({ error: 'Erro ao buscar dados' });
        
        res.json({ data: rows[0] });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

export default router;