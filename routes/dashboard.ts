import express, { Request, Response } from 'express';
import authMiddleware from '../middlewares/authMiddleware';
const router = express.Router();

import pool from '../db';
import { extractBearerToken } from '../helpers/extractBearerToken';

router.get('/summary', authMiddleware(), async (req: Request, res: Response) => {
    const token = extractBearerToken(req.headers.authorization);
    if ("error" in token) return res.status(401).json({ error: token.error });

    const { startDate, endDate } = req.query;
    
    try {
        const { rows }: any = await pool.query(`
            SELECT
                COALESCE(SUM(CASE WHEN type = 'INCOME' THEN value ELSE 0 END), 0)::FLOAT AS total_income,
                COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN value ELSE 0 END), 0)::FLOAT AS total_expense,
                COALESCE(SUM(CASE WHEN type = 'INCOME' THEN value ELSE -value END), 0)::FLOAT AS balance
            FROM transactions
            WHERE user_id = $3
            AND (
                $1::date IS NULL
                OR date >= $1::date
            )
            AND (
                $2::date IS NULL
                OR date < ($2::date + INTERVAL '1 day')
            );
        `, [startDate, endDate, token.decoded.id]);

        if (!rows.length) return res.status(500).json({ error: 'Erro ao buscar dados' });
        
        res.json({ data: rows[0] });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

export default router;