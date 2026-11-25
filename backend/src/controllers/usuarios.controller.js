import pool from '../config/db.js'
import bcrypt from 'bcrypt'

// GET /api/usuarios
export const listarUsuarios = async (req, res) => {
  try {
    const { rol, activo, buscar } = req.query
    let conditions = []
    let params = []
    let i = 1

    if (rol) { conditions.push(`rol = $${i++}`); params.push(rol) }
    if (activo !== undefined) { conditions.push(`activo = $${i++}`); params.push(activo === 'true') }
    if (buscar) {
      conditions.push(`(nombres_apellidos ILIKE $${i} OR dni ILIKE $${i} OR correo ILIKE $${i})`)
      params.push(`%${buscar}%`); i++
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await pool.query(
      `SELECT id_usuario, nombres_apellidos, dni, correo, telefono,
              rol, nro_licencia, activo, creado_en
       FROM usuario ${where}
       ORDER BY creado_en DESC`,
      params
    )
    res.json({ ok: true, data: result.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, mensaje: 'Error al listar usuarios' })
  }
}

// POST /api/usuarios
export const crearUsuario = async (req, res) => {
  try {
    const { nombres_apellidos, dni, correo, password, rol, nro_licencia, telefono } = req.body

    // Validar duplicados
    const dup = await pool.query(
      `SELECT id_usuario FROM usuario WHERE dni = $1 OR correo = $2`,
      [dni, correo]
    )
    if (dup.rows.length > 0) {
      return res.status(409).json({
        ok: false,
        mensaje: 'Ya existe una cuenta registrada con este DNI o correo electrónico'
      })
    }

    const hash = await bcrypt.hash(password, 10)

    const result = await pool.query(
      `INSERT INTO usuario (nombres_apellidos, dni, correo, password_hash, rol, nro_licencia, telefono, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING id_usuario, nombres_apellidos, dni, correo, rol, nro_licencia, activo, creado_en`,
      [nombres_apellidos, dni, correo, hash, rol, nro_licencia || null, telefono || null]
    )

    const nuevo = result.rows[0]

    await pool.query(
      `INSERT INTO auditoria_usuario (id_actor, id_afectado, accion, detalle_json)
       VALUES ($1, $2, 'CREACION', $3)`,
      [
        req.usuario.id_usuario,
        nuevo.id_usuario,
        JSON.stringify({ nombres_apellidos, dni, rol })
      ]
    )

    res.status(201).json({ ok: true, data: nuevo })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, mensaje: 'Error al crear usuario' })
  }
}

// PUT /api/usuarios/:id
export const editarUsuario = async (req, res) => {
  try {
    const { id } = req.params
    const { nombres_apellidos, correo, rol, nro_licencia, telefono } = req.body

    const dup = await pool.query(
      `SELECT id_usuario FROM usuario WHERE correo = $1 AND id_usuario != $2`,
      [correo, id]
    )
    if (dup.rows.length > 0) {
      return res.status(409).json({
        ok: false,
        mensaje: 'Ya existe una cuenta registrada con este correo electrónico'
      })
    }

    // Detectar si cambió el rol para usar acción correcta
    const anterior = await pool.query(
      `SELECT rol FROM usuario WHERE id_usuario = $1`, [id]
    )
    const rolAnterior = anterior.rows[0]?.rol
    const accion = rol !== rolAnterior ? 'CAMBIO_ROL' : 'EDICION'

    const result = await pool.query(
      `UPDATE usuario
       SET nombres_apellidos = $1, correo = $2, rol = $3,
           nro_licencia = $4, telefono = $5
       WHERE id_usuario = $6
       RETURNING id_usuario, nombres_apellidos, dni, correo, rol, nro_licencia, activo`,
      [nombres_apellidos, correo, rol, nro_licencia || null, telefono || null, id]
    )

    if (result.rows.length === 0)
      return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' })

    await pool.query(
      `INSERT INTO auditoria_usuario (id_actor, id_afectado, accion, detalle_json)
       VALUES ($1, $2, $3, $4)`,
      [
        req.usuario.id_usuario,
        parseInt(id),
        accion,
        JSON.stringify({ nombres_apellidos, correo, rol, rol_anterior: rolAnterior })
      ]
    )

    res.json({ ok: true, data: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, mensaje: 'Error al editar usuario' })
  }
}

// PATCH /api/usuarios/:id/estado
export const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params
    const { activo } = req.body

    const result = await pool.query(
      `UPDATE usuario SET activo = $1 WHERE id_usuario = $2
       RETURNING id_usuario, nombres_apellidos, activo`,
      [activo, id]
    )

    if (result.rows.length === 0)
      return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' })

    const accion = activo ? 'ACTIVACION' : 'BAJA'

    await pool.query(
      `INSERT INTO auditoria_usuario (id_actor, id_afectado, accion, detalle_json)
       VALUES ($1, $2, $3, $4)`,
      [
        req.usuario.id_usuario,
        parseInt(id),
        accion,
        JSON.stringify({ activo })
      ]
    )

    res.json({ ok: true, data: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, mensaje: 'Error al cambiar estado' })
  }
}

// GET /api/usuarios/auditoria
export const listarAuditoria = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         a.id_auditoria,
         a.accion,
         a.detalle_json,
         a.ip_origen,
         a.fecha_hora,
         actor.nombres_apellidos  AS actor,
         afect.nombres_apellidos  AS afectado
       FROM auditoria_usuario a
       JOIN usuario actor ON actor.id_usuario = a.id_actor
       LEFT JOIN usuario afect ON afect.id_usuario = a.id_afectado
       ORDER BY a.fecha_hora DESC
       LIMIT 100`
    )
    res.json({ ok: true, data: result.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, mensaje: 'Error al listar auditoría' })
  }
}
