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
    } = req.query;

    const tagIds = typeof tags === "string" ? tags.split(",").map(Number) : []
  
    const limit = Number(perPage);
    const currentPage = Number(page);
    const offset = (currentPage - 1) * limit;
    
    try {
        // 🔢 total de registros
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
                    OR t.date >= $3
                )
                AND (
                    NULLIF($4, '') IS NULL
                    OR t.date < ($4::date + INTERVAL '1 day')
                )
                AND (
                    $5::int[] IS NULL
                    OR t.tag_id = ANY($5)
                );
            `,
            [search, type, startDate, endDate, tagIds, token.decoded.id]
        );
    
        const total = Number(countResult.rows[0].count);

        const { rows }: any = await pool.query(
          `
            SELECT 
                t.*,
                tag.name AS tag_name,
                tag.color AS tag_color
            FROM transactions t
            LEFT JOIN tags tag ON tag.id = t.tag_id
            WHERE t.user_id = $8
                AND (
                    $1::text IS NULL 
                    OR t.description ILIKE '%' || $1 || '%'
                )
                AND (
                    $2::text IS NULL
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
                    $5::int[] IS NULL
                    OR t.tag_id = ANY($5)
                )
            ORDER BY t.created_at DESC
            LIMIT $6
            OFFSET $7
        `,
          [search, type, startDate, endDate, tagIds, limit, offset, token.decoded.id],
        );

        return res.json({
            data: rows,
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