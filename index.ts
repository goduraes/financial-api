import express, { Request, Response } from 'express';
import 'dotenv/config';

import userRoutes from './routes/users';
import authRoutes from './routes/auth';

const app = express();

app.use(express.json());

app.get('/', (req: Request, res: Response) => res.json({ message: 'API funcionando!' }));

app.use('/users', userRoutes);
app.use('/auth', authRoutes);

app.listen(process.env.PORT || 3000, () => {
  console.log(`Servidor rodando em http://localhost:${process.env.PORT}`);
});
