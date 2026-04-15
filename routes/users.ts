import express, { Request, Response } from 'express';
import authMiddleware from '../middlewares/authMiddleware';
const router = express.Router();

import pool from '../db';

const bcrypt = require('bcryptjs');

// All users
router.get('/', authMiddleware(true), async (req: Request, res: Response) => {
    try {
        const { rows }: any = await pool.query('SELECT * FROM users');
        if (!rows.length) return res.status(404).json({ error: 'Users not found' });
        return res.json({ data: rows });
    } catch (error: any) {
       return res.status(500).json({ error: error.message });
    }
});

// User by id
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { rows }: any = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Users not found' });
        res.json({ data: rows[0] });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

// User by email
router.get('/:email', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { rows }: any = await pool.query('SELECT * FROM users WHERE email = $1', [req.params.email]);
        if (!rows.length) return res.status(404).json({ error: 'Users not found' });
        res.json({ data: rows[0] });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

// Add user
router.post('/add', async (req: Request, res: Response) => {
    const saltRounds = 10;
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    try {
        const user: any = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length) return res.status(409).json({ message: 'E-mail já cadastrado!' });
        const { rows } = await pool.query('INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *', [name, email, hashedPassword]);
        if (!rows.length) return res.status(500).json({ error: 'Could not retrieve inserted row id' });
        return res.status(201).json({ id: rows[0].id, message: 'Row added successfully' });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

// Remove user
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { rows }: any = await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        if (!rows.length) return res.status(500).json({ error: 'Could not retrieve affected row count' });
        return res.json({ message: 'Deleted successfully', rowsAffected: rows[0] });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});
   
export default router;