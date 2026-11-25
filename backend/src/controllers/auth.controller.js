import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

export const login = async (req, res) => {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({ ok: false, mensaje: 'Correo y contraseña son requeridos' });
    }

    const resultado = await pool.query(
      `SELECT id_usuario, nombres_apellidos, correo, rol, password_hash, activo
       FROM usuario
       WHERE correo = $1`,
      [correo]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({ ok: false, mensaje: 'Credenciales inválidas' });
    }

    const usuario = resultado.rows[0];

    if (!usuario.activo) {
      return res.status(403).json({ ok: false, mensaje: 'Usuario inactivo. Contacte al administrador' });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValida) {
      return res.status(401).json({ ok: false, mensaje: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      {
        id: usuario.id_usuario,
        correo: usuario.correo,
        rol: usuario.rol
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return res.json({
      ok: true,
      token,
      usuario: {
        id: usuario.id_usuario,
        nombres_apellidos: usuario.nombres_apellidos,
        correo: usuario.correo,
        rol: usuario.rol
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

export const perfil = async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT id_usuario, nombres_apellidos, correo, rol, dni, telefono, activo, creado_en
       FROM usuario
       WHERE id_usuario = $1`,
      [req.usuario.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
    }

    return res.json({ ok: true, usuario: resultado.rows[0] });

  } catch (error) {
    console.error('Error en perfil:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};
