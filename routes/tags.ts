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
        const { rows }: any = await pool.query('SELECT * FROM tags WHERE id = $1', [token.decoded.id]);
        res.json({ data: rows });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

//add
router.post('/add', authMiddleware(), async (req: Request, res: Response) => {
    const token = extractBearerToken(req.headers.authorization);
    if ("error" in token) return res.status(401).json({ error: token.error });
    
    const { name, color } = req.body;

    try {
        const { rows } = await pool.query('INSERT INTO tags (name, color, user_id, created_at) VALUES ($1, $2, $3, $4) RETURNING *', [name, color, token.decoded.id, new Date()]);
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
    
    const { id, name, color } = req.body;

    const tag: any = await pool.query('SELECT * FROM tags WHERE id = $1', [id]);
    if (!tag.rows.length) return res.status(403).json({ error: 'Tag não encontrada' });
    const tagUserId = tag.rows[0].user_id;
    if (tagUserId !== token.decoded.id) return res.status(403).json({ error: 'Você não tem permissão' });

    try {
        const { rows }: any = await pool.query('UPDATE tags SET name = $1, color = $2, updated_at = $3 WHERE id = $4 RETURNING *', [name, color, new Date(), id]);
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

    const tag: any = await pool.query('SELECT * FROM tags WHERE id = $1', [req.params.id]);
    if (!tag.rows.length) return res.status(403).json({ error: 'Tag não encontrada' });
    const tagUserId = tag.rows[0].user_id;
    if (tagUserId !== token.decoded.id) return res.status(403).json({ error: 'Você não tem permissão' });

    try {
        const { rows }: any = await pool.query('DELETE FROM tags WHERE id = $1', [req.params.id]);
        if (!rows.length) return res.status(500).json({ error: 'Não foi possível recuperar a linha removida' });
        return res.json({ message: 'Tag excluída com sucesso', data: rows[0] });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

export default router;