import express, { Request, Response } from 'express';
const router = express.Router();

import db from '../db/database';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

router.post('/', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.get(sql, [email], async (err: any, row: any) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'User not found' });
        const isMatch = await bcrypt.compare(password, row.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid password' });

        const userPayload = { name: row.name, email: row.email, role: row.role };
        const token = jwt.sign(userPayload, process.env.JWTSECRETKEY, { expiresIn: '1h' });

        return res.json({ data: { token: token } });
    });
});

export default router;