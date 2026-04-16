import express, { Request, Response } from 'express';
import cors from 'cors';
import 'dotenv/config';

import authRoutes from './routes/auth';
import meRoutes from './routes/me';
import userRoutes from './routes/users';
import tagsRoutes from './routes/tags';

const app = express();

app.use(cors()); 

app.use(express.json());

app.get('/', (req: Request, res: Response) => res.json({ message: 'API funcionando!' }));

app.use('/auth', authRoutes);
app.use('/me', meRoutes);
app.use('/users', userRoutes);
app.use('/tags', tagsRoutes);

app.listen(process.env.PORT || 3000, () => {
  console.log(`Servidor rodando em http://localhost:${process.env.PORT}`);
});
