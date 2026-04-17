import express, { Request, Response } from 'express';
import authMiddleware from '../middlewares/authMiddleware';
const router = express.Router();

import pool from '../db';

const bcrypt = require('bcryptjs');

// All users
router.get('/', authMiddleware(true), async (req: Request, res: Response) => {
    const { page = 1, perPage = 10, search = '' } = req.query;
  
    const limit = Number(perPage);
    const currentPage = Number(page);
    const offset = (currentPage - 1) * limit;
  
    try {
      // 🔢 total de registros
      const countResult = await pool.query(
        `
        SELECT COUNT(*) 
        FROM users
        WHERE 
          name ILIKE '%' || $1 || '%'
          OR email ILIKE '%' || $1 || '%'
        `,
        [search]
      );
  
      const total = Number(countResult.rows[0].count);
  
      // 📄 dados paginados
      const { rows } = await pool.query(
        `
        SELECT id, name, email, role, is_active, created_at, updated_at
        FROM users
        WHERE 
          name ILIKE '%' || $1 || '%'
          OR email ILIKE '%' || $1 || '%'
        ORDER BY id
        LIMIT $2
        OFFSET $3;
        `,
        [search, limit, offset]
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

// User by id
router.get('/:id', authMiddleware(true), async (req: Request, res: Response) => {
    try {
        const { rows }: any = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });
        const { password, ...data} = rows[0];
        return res.json({ data: data });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

// User by email
router.get('/:email', authMiddleware(true), async (req: Request, res: Response) => {
    try {
        const { rows }: any = await pool.query('SELECT * FROM users WHERE email = $1', [req.params.email]);
        if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });
        const { password, ...data} = rows[0];
        return res.json({ data: data });
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
        const { rows } = await pool.query('INSERT INTO users (name, email, password, created_at) VALUES ($1, $2, $3, $4) RETURNING *', [name, email, hashedPassword, new Date()]);
        if (!rows.length) return res.status(500).json({ error: 'Não foi possível recuperar a linha inserida' });
        const { password, ...data} = rows[0];
        return res.status(201).json({ data: data, message: 'Usuário adicionado com sucesso' });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

// disable user
router.patch('/toggle-status/:id', authMiddleware(true), async (req: Request, res: Response) => {
    const { is_active } = req.body;
    try {
        const { rows }: any = await pool.query('UPDATE users SET is_active = $1 WHERE id = $2 RETURNING *', [is_active, req.params.id]);
        if (!rows.length) return res.status(500).json({ error: 'Não foi possível recuperar a linha removida' });
        const { password, ...data} = rows[0];
        return res.json({ message: `Usuário ${is_active ? 'ativado' : 'desativado'} com sucesso`, data: data });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

// change role user
router.patch('/change-role/:id', authMiddleware(true), async (req: Request, res: Response) => {
  const { role } = req.body;
  try {
      const { rows }: any = await pool.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING *', [role, req.params.id]);
      if (!rows.length) return res.status(500).json({ error: 'Não foi possível recuperar a linha removida' });
      const { password, ...data} = rows[0];
      return res.json({ message: `Role do usuário alterada com sucesso`, data: data });
  } catch (error: any) {
      return res.status(500).json({ error: error.message });
  }
});
   
export default router;