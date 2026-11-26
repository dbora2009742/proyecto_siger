import pool from '../config/db.js'

// GET /api/equipos
export const getEquipos = async (req, res) => {
  try {
    const { activo, buscar } = req.query

    let query = `
      SELECT
        e.id_equipo,
        e.nombre,
        e.integrantes_detalle,
        e.activo,
        v.id_vehiculo,
        v.placa,
        v.codigo_interno,
        v.tipo_vehiculo,
        v.capacidad_m3,
        v.estado_vehiculo,
        u.id_usuario    AS id_responsable,
        u.nombres_apellidos AS responsable_nombre,
        u.dni           AS responsable_dni,
        u.correo        AS responsable_correo
      FROM equipo_trabajo e
      JOIN vehiculo  v ON v.id_vehiculo  = e.id_vehiculo
      JOIN usuario   u ON u.id_usuario   = e.id_responsable
      WHERE 1=1
    `
    const params = []

    if (activo !== undefined && activo !== '') {
      params.push(activo === 'true')
      query += ` AND e.activo = $${params.length}`
    }

    if (buscar) {
      params.push(`%${buscar}%`)
      query += ` AND (
        e.nombre           ILIKE $${params.length} OR
        u.nombres_apellidos ILIKE $${params.length} OR
        v.placa             ILIKE $${params.length}
      )`
    }

    query += ` ORDER BY e.id_equipo ASC`

    const { rows } = await pool.query(query, params)
    res.json({ ok: true, data: rows })
  } catch (err) {
    console.error('getEquipos:', err)
    res.status(500).json({ ok: false, mensaje: 'Error al obtener equipos' })
  }
}

// POST /api/equipos
export const crearEquipo = async (req, res) => {
  try {
    const { nombre, id_vehiculo, id_responsable, integrantes_detalle } = req.body

    if (!nombre || !id_vehiculo || !id_responsable) {
      return res.status(400).json({ ok: false, mensaje: 'nombre, id_vehiculo e id_responsable son requeridos' })
    }

    // Verificar que el responsable tenga el rol correcto
    const { rows: [usuario] } = await pool.query(
      `SELECT id_usuario, rol FROM usuario WHERE id_usuario = $1 AND activo = true`,
      [id_responsable]
    )
    if (!usuario) {
      return res.status(404).json({ ok: false, mensaje: 'Responsable no encontrado o inactivo' })
    }
    if (usuario.rol !== 'RESPONSABLE_RUTA') {
      return res.status(400).json({ ok: false, mensaje: 'El usuario seleccionado no tiene el rol RESPONSABLE_RUTA' })
    }

    // Verificar que el vehículo exista
    const { rows: [vehiculo] } = await pool.query(
      `SELECT id_vehiculo, estado_vehiculo FROM vehiculo WHERE id_vehiculo = $1`,
      [id_vehiculo]
    )
    if (!vehiculo) {
      return res.status(404).json({ ok: false, mensaje: 'Vehículo no encontrado' })
    }

    const { rows: [nuevo] } = await pool.query(
      `INSERT INTO equipo_trabajo (nombre, id_vehiculo, id_responsable, integrantes_detalle, activo)
       VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      [nombre.trim(), id_vehiculo, id_responsable, integrantes_detalle?.trim() ?? null]
    )

    res.status(201).json({ ok: true, data: nuevo })
  } catch (err) {
    console.error('crearEquipo:', err)
    res.status(500).json({ ok: false, mensaje: 'Error al crear equipo' })
  }
}

// PUT /api/equipos/:id
export const editarEquipo = async (req, res) => {
  try {
    const { id } = req.params
    const { nombre, id_vehiculo, id_responsable, integrantes_detalle } = req.body

    if (!nombre || !id_vehiculo || !id_responsable) {
      return res.status(400).json({ ok: false, mensaje: 'nombre, id_vehiculo e id_responsable son requeridos' })
    }

    const { rows: [usuario] } = await pool.query(
      `SELECT id_usuario, rol FROM usuario WHERE id_usuario = $1 AND activo = true`,
      [id_responsable]
    )
    if (!usuario) {
      return res.status(404).json({ ok: false, mensaje: 'Responsable no encontrado o inactivo' })
    }
    if (usuario.rol !== 'RESPONSABLE_RUTA') {
      return res.status(400).json({ ok: false, mensaje: 'El usuario seleccionado no tiene el rol RESPONSABLE_RUTA' })
    }

    const { rows: [actualizado] } = await pool.query(
      `UPDATE equipo_trabajo
       SET nombre = $1, id_vehiculo = $2, id_responsable = $3, integrantes_detalle = $4
       WHERE id_equipo = $5
       RETURNING *`,
      [nombre.trim(), id_vehiculo, id_responsable, integrantes_detalle?.trim() ?? null, id]
    )

    if (!actualizado) {
      return res.status(404).json({ ok: false, mensaje: 'Equipo no encontrado' })
    }

    res.json({ ok: true, data: actualizado })
  } catch (err) {
    console.error('editarEquipo:', err)
    res.status(500).json({ ok: false, mensaje: 'Error al editar equipo' })
  }
}

// PATCH /api/equipos/:id/estado
export const cambiarEstadoEquipo = async (req, res) => {
  try {
    const { id } = req.params
    const { activo } = req.body

    if (typeof activo !== 'boolean') {
      return res.status(400).json({ ok: false, mensaje: 'El campo activo debe ser booleano' })
    }

    const { rows: [actualizado] } = await pool.query(
      `UPDATE equipo_trabajo SET activo = $1 WHERE id_equipo = $2 RETURNING *`,
      [activo, id]
    )

    if (!actualizado) {
      return res.status(404).json({ ok: false, mensaje: 'Equipo no encontrado' })
    }

    res.json({ ok: true, data: actualizado })
  } catch (err) {
    console.error('cambiarEstadoEquipo:', err)
    res.status(500).json({ ok: false, mensaje: 'Error al cambiar estado del equipo' })
  }
}

// GET /api/equipos/selectores  → vehículos disponibles + responsables activos
export const getSelectores = async (req, res) => {
  try {
    const { rows: vehiculos } = await pool.query(
      `SELECT id_vehiculo, placa, codigo_interno, tipo_vehiculo, capacidad_m3, estado_vehiculo
       FROM vehiculo
       WHERE estado_vehiculo = 'DISPONIBLE'
       ORDER BY placa ASC`
    )

    const { rows: responsables } = await pool.query(
      `SELECT id_usuario, nombres_apellidos, dni
       FROM usuario
       WHERE rol = 'RESPONSABLE_RUTA' AND activo = true
       ORDER BY nombres_apellidos ASC`
    )

    res.json({ ok: true, data: { vehiculos, responsables } })
  } catch (err) {
    console.error('getSelectores:', err)
    res.status(500).json({ ok: false, mensaje: 'Error al obtener selectores' })
  }
}