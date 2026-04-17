import express, { Request, Response } from 'express';
import pool from '../db';

const router = express.Router();

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

router.post('/', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const { rows }: any = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });

        const row = rows[0];

        if (!row.is_active) return res.status(401).json({ error: 'Esta conta foi bloqueada pelo administrador' });
        
        const isMatch = await bcrypt.compare(password, row.password);
        if (!isMatch) return res.status(401).json({ error: 'Senha inválida' });
    
        const userPayload = { id: row.id, name: row.name, email: row.email, role: row.role };
        const token = jwt.sign(userPayload, process.env.JWTSECRETKEY, { expiresIn: '1h' });
        
        res.json({ data: { token: token } });
    } catch (error: any) {
       res.status(500).json({ error: error.message });
    }
});

export default router;