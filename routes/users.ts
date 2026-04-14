import express, { Request, Response } from 'express';
import authMiddleware from '../middlewares/authMiddleware';
const router = express.Router();

import db from '../db/database';

const bcrypt = require('bcryptjs');

// All users
router.get('/', authMiddleware(true), (req: Request, res: Response) => {
    const sql = 'SELECT * FROM users';
    db.all(sql, [], (err: any, rows: any) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!rows) return res.status(404).json({ error: 'Users not found' });
        return res.json({ data: rows });
    });
});

// User by id
router.get('/:id', authMiddleware, (req: Request, res: Response) => {
    const sql = 'SELECT * FROM users WHERE id = ?';
    db.get(sql, [req.params.id], (err: any, row: any) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'User not found' });
        res.json({ data: row });
    });
});

// User by email
router.get('/:email', authMiddleware, (req: Request, res: Response) => {
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.get(sql, [req.params.email], (err: any, row: any) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'User not found' });
        res.json({ data: row });
    });
});

// Add user
router.post('/add', async (req: Request, res: Response) => {
    const saltRounds = 10;
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    db.get('SELECT email FROM users WHERE email = ?', [email], (err: any, row: any) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) return res.status(409).json({ message: 'E-mail já cadastrado!' });

        const sql = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';    
        db.run(sql, [name, email, hashedPassword], function(this: { lastID?: number }, err: Error | null) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.lastID === undefined) return res.status(500).json({ error: 'Could not retrieve inserted row id' });
            return res.status(201).json({ id: this.lastID, message: 'Row added successfully' });
        });
    });

});

// Remove user
router.delete('/:id', authMiddleware, (req: Request, res: Response) => {
    const sql = 'DELETE FROM users WHERE id = ?';
    db.run(sql, [req.params.id], function(this: { changes?: number }, err: Error | null) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === undefined) return res.status(500).json({ error: 'Could not retrieve affected row count' });
        return res.json({ message: 'Deleted successfully', rowsAffected: this.changes });
    });
});
   
export default router;