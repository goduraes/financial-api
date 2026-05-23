import express, { Request, Response } from 'express';
import authMiddleware from '../middlewares/authMiddleware';
const router = express.Router();

import pool from '../db';
import { extractBearerToken } from '../helpers/extractBearerToken';
import { groupByTagAndSum } from '../helpers/groupByTag';

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

router.get('/transactions-tags-chart', authMiddleware(), async (req: Request, res: Response) => {
    const token = extractBearerToken(req.headers.authorization);
    if ("error" in token) return res.status(401).json({ error: token.error });

    const { startDate, endDate } = req.query;
    
    try {
        const { rows }: any = await pool.query(`
            SELECT 
                t.*,
                tg.id as tag_id,
                tg.name as tag_name,
                tg.color as tag_color
            FROM transactions t
            LEFT JOIN tags tg ON t.tag_id = tg.id
            WHERE t.user_id = $3
                AND t.date BETWEEN $1 AND $2
            ORDER BY t.date DESC;
        `, [startDate, endDate, token.decoded.id]);

        if (!rows.length) return res.status(404).json({ error: 'Nenhum dado encontrado' });

        const income = rows.filter((t: any) => t.type === 'INCOME');
        const expense = rows.filter((t: any) => t.type === 'EXPENSE');
        
        
        res.json({ data: {
            income: groupByTagAndSum(income),
            expense: groupByTagAndSum(expense)
        } });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

router.get('/transactions-history-chart', authMiddleware(), async (req: Request, res: Response) => {
    const token = extractBearerToken(req.headers.authorization);
    if ("error" in token) return res.status(401).json({ error: token.error });
    
    try {
        const { rows }: any = await pool.query(`
            WITH months AS (
                SELECT TO_CHAR(generate_series(NOW() - INTERVAL '11 months', NOW(), '1 month'::interval), 'MM/YY') AS mes
            ),
            transactions_summary AS (
            SELECT 
                TO_CHAR(t.date, 'MM/YY') AS mes,
                (SUM(CASE WHEN t.type = 'INCOME' THEN t.value ELSE 0 END)::DECIMAL)::FLOAT AS income,
                (SUM(CASE WHEN t.type = 'EXPENSE' THEN t.value ELSE 0 END)::DECIMAL)::FLOAT AS expense,
                CAST(SUM(CASE WHEN t.type = 'INCOME' THEN 1 ELSE 0 END) AS INTEGER) AS count_income,
                CAST(SUM(CASE WHEN t.type = 'EXPENSE' THEN 1 ELSE 0 END) AS INTEGER) AS count_expense
            FROM transactions t
            WHERE t.user_id = $1
                AND t.date >= NOW() - INTERVAL '12 months'
            GROUP BY TO_CHAR(t.date, 'MM/YY')
            )
            SELECT 
                m.mes,
                COALESCE(ts.income, 0) AS income,
                COALESCE(ts.expense, 0) AS expense,
                COALESCE(ts.count_income, 0) AS count_income,
                COALESCE(ts.count_expense, 0) AS count_expense
            FROM months m
            LEFT JOIN transactions_summary ts ON m.mes = ts.mes
            ORDER BY TO_DATE(m.mes, 'MM/YY') ASC;
        `, [token.decoded.id]);

        if (!rows.length) return res.status(404).json({ error: 'Nenhum dado encontrado' });
        
        res.json({ data: rows });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

export default router;