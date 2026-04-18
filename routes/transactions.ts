import express, { Request, Response } from 'express';
import authMiddleware from '../middlewares/authMiddleware';
const router = express.Router();

import pool from '../db';
import { extractBearerToken } from '../helpers/extractBearerToken';

// list
router.get('/', authMiddleware(), async (req: Request, res: Response) => {
    const token = extractBearerToken(req.headers.authorization);
    if ("error" in token) return res.status(401).json({ error: token.error });

    const {
      search,
      type,
      startDate,
      endDate,
      tags,
      page = 1,
      perPage = 10,
      sortBy,
      order,
    } = req.query;

    const tagIds = tags && typeof tags === "string" ? tags.split(",").map(Number) : [];
  
    const limit = Number(perPage);
    const currentPage = Number(page);
    const offset = (currentPage - 1) * limit;
    
    try {
        const countResult = await pool.query(
            `
                SELECT COUNT(*)
                FROM transactions t
                LEFT JOIN tags tag ON tag.id = t.tag_id
                WHERE t.user_id = $6
                AND (
                    $1::text IS NULL
                    OR t.description ILIKE '%' || $1 || '%'
                    OR tag.name ILIKE '%' || $1 || '%'
                )
                AND (
                    NULLIF($2, '') IS NULL
                    OR t.type = $2
                )
                AND (
                    NULLIF($3, '') IS NULL
                    OR t.date >= $3::date
                )
                AND (
                    NULLIF($4, '') IS NULL
                    OR t.date < ($4::date + INTERVAL '1 day')
                )
                AND (
                    COALESCE(array_length($5::int[], 1), 0) = 0
                    OR t.tag_id = ANY($5::int[])
                )
            `,
            [search, type, startDate, endDate, tagIds, token.decoded.id]
        );
    
        const total = Number(countResult.rows[0].count);

        const { rows }: any = await pool.query(
        `
        WITH filtered AS (
            SELECT
                t.*
            FROM transactions t
            WHERE t.user_id = $10
                AND (
                    $1::text IS NULL
                    OR t.description ILIKE '%' || $1 || '%'
                )
                AND (
                    NULLIF($2, '') IS NULL
                    OR t.type = $2
                )
                AND (
                    NULLIF($3, '') IS NULL
                    OR t.date >= $3::date
                )
                AND (
                    NULLIF($4, '') IS NULL
                    OR t.date < ($4::date + INTERVAL '1 day')
                )
                AND (
                    COALESCE(array_length($5::int[], 1), 0) = 0
                    OR t.tag_id = ANY($5::int[])
                )
            ),

            summary AS (
                SELECT
                    COALESCE(SUM(CASE WHEN type = 'INCOME' THEN value ELSE 0 END), 0)::FLOAT AS total_income,
                    COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN value ELSE 0 END), 0)::FLOAT AS total_expense,
                    COALESCE(SUM(CASE WHEN type = 'INCOME' THEN value ELSE -value END), 0)::FLOAT AS balance
                FROM filtered
            ),

            paginated AS (
                SELECT
                    f.*,
                    tag.name AS tag_name,
                    tag.color AS tag_color
                FROM filtered f
                LEFT JOIN tags tag ON tag.id = f.tag_id
                ORDER BY
                    CASE WHEN $8 = 'description' AND $9 = 'asc' THEN f.description END ASC,
                    CASE WHEN $8 = 'description' AND $9 = 'desc' THEN f.description END DESC,

                    CASE 
                        WHEN $8 = 'value' AND $9 = 'asc' 
                        THEN CASE WHEN f.type = 'EXPENSE' THEN -f.value ELSE f.value END 
                    END ASC,

                    CASE 
                        WHEN $8 = 'value' AND $9 = 'desc' 
                        THEN CASE WHEN f.type = 'EXPENSE' THEN -f.value ELSE f.value END 
                    END DESC,

                    CASE WHEN $8 = 'date' AND $9 = 'asc' THEN f.date END ASC,
                    CASE WHEN $8 = 'date' AND $9 = 'desc' THEN f.date END DESC,

                    CASE WHEN $8 = 'tag_name' AND $9 = 'asc' THEN tag.name END ASC,
                    CASE WHEN $8 = 'tag_name' AND $9 = 'desc' THEN tag.name END DESC,

                    f.date DESC
                LIMIT $6
                OFFSET $7
            )

            SELECT
                (SELECT row_to_json(summary) FROM summary) AS summary,
                COALESCE(json_agg(paginated), '[]') AS transactions
            FROM paginated;
        `,
          [search, type, startDate, endDate, tagIds, limit, offset, sortBy, order, token.decoded.id],
        );

        if (!rows.length) return res.status(500).json({ error: 'Não foi possível recuperar os dados' });

        return res.json({
            data: rows[0],
            page: currentPage,
            perPage: limit,
            total,
            totalPages: Math.ceil(total / limit),
        });
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

//edit
router.put('/edit', authMiddleware(), async (req: Request, res: Response) => {
    const token = extractBearerToken(req.headers.authorization);
    if ("error" in token) return res.status(401).json({ error: token.error });
    
    const { id, description, value, date, tag_id, type } = req.body;

    const transactions: any = await pool.query('SELECT * FROM transactions WHERE id = $1', [id]);
    if (!transactions.rows.length) return res.status(403).json({ error: 'Transação não encontrada' });
    const tagUserId = transactions.rows[0].user_id;
    if (tagUserId !== token.decoded.id) return res.status(403).json({ error: 'Você não tem permissão' });

    try {
        const { rows }: any = await pool.query('UPDATE transactions SET description = $1, value = $2, date = $3, tag_id = $4, type = $5, updated_at = $6 WHERE id = $7 RETURNING *', [description, value, date, tag_id, type, new Date(), id]);
        if (!rows.length) return res.status(500).json({ error: 'Não foi possível recuperar a linha editada' });
        res.json({ data: rows[0] });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

// delete
router.delete('/:id', authMiddleware(), async (req: Request, res: Response) => {
    const token = extractBearerToken(req.headers.authorization);
    if ("error" in token) return res.status(401).json({ error: token.error });

    const transactions: any = await pool.query('SELECT * FROM transactions WHERE id = $1', [req.params.id]);
    if (!transactions.rows.length) return res.status(403).json({ error: 'Transação não encontrada' });
    const tagUserId = transactions.rows[0].user_id;
    if (tagUserId !== token.decoded.id) return res.status(403).json({ error: 'Você não tem permissão' });

    try {
        const { rows }: any = await pool.query('DELETE FROM transactions WHERE id = $1 RETURNING *', [req.params.id]);
        if (!rows.length) return res.status(500).json({ error: 'Não foi possível recuperar a linha removida' });
        return res.json({ message: 'Transação excluída com sucesso', data: rows[0] });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

export default router;