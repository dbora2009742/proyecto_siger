import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.routes.js';

dotenv.config()
import './config/db.js'

const app = express()
const PORT = process.env.PORT || 3001

// Middlewares globales
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5174',
  credentials: true
}))
app.use(morgan('dev'))
app.use(express.json())
app.use('/api/auth', authRoutes)

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    mensaje: 'Servidor SIGER funcionando ✅',
    fecha: new Date().toISOString()
  })
})

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
})