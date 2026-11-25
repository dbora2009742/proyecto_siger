import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import './config/db.js';
import authRoutes from './routes/auth.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js'
import zonificacionRoutes from './routes/zonificacion.routes.js'
import tachosRoutes from './routes/tachos.routes.js'
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5174',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes)
app.use('/api/zonificacion', zonificacionRoutes)
app.use('/api/tachos', tachosRoutes)
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    mensaje: 'Servidor SIGER funcionando ✅',
    fecha: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
