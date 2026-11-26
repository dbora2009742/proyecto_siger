import pool from '../config/db.js'

// GET /api/flota
export const listarVehiculos = async (req, res) => {
  try {
    const { tipo, estado, buscar } = req.query
    let conditions = []
    let params = []
    let i = 1

    if (tipo) { conditions.push(`tipo_vehiculo = $${i++}`); params.push(tipo) }
    if (estado) { conditions.push(`estado_vehiculo = $${i++}`); params.push(estado) }
    if (buscar) {
      conditions.push(`(placa ILIKE $${i} OR codigo_interno ILIKE $${i})`)
      params.push(`%${buscar}%`); i++
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await pool.query(
      `SELECT id_vehiculo, placa, codigo_interno, tipo_vehiculo,
              capacidad_m3, tara_kg, estado_vehiculo, kilometraje_actual
       FROM vehiculo ${where}
       ORDER BY id_vehiculo DESC`,
      params
    )
    res.json({ ok: true, data: result.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, mensaje: 'Error al listar vehículos' })
  }
}

// GET /api/flota/resumen
export const resumenFlota = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)                                                      AS total,
        COUNT(*) FILTER (WHERE estado_vehiculo = 'DISPONIBLE')       AS disponibles,
        COUNT(*) FILTER (WHERE estado_vehiculo = 'EN_SERVICIO')      AS en_servicio,
        COUNT(*) FILTER (WHERE estado_vehiculo = 'EN_MANTENIMIENTO') AS en_mantenimiento,
        COUNT(*) FILTER (WHERE estado_vehiculo = 'BAJA')             AS baja
      FROM vehiculo
    `)
    res.json({ ok: true, data: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, mensaje: 'Error al obtener resumen' })
  }
}

// POST /api/flota
export const crearVehiculo = async (req, res) => {
  try {
    const {
      placa, codigo_interno, tipo_vehiculo,
      capacidad_m3, tara_kg,
      estado_vehiculo = 'DISPONIBLE',
      kilometraje_actual = 0
    } = req.body

    if (!placa || !tipo_vehiculo || !capacidad_m3 || !tara_kg) {
      return res.status(400).json({ ok: false, mensaje: 'Faltan campos obligatorios' })
    }

    // Validar duplicados
    const dup = await pool.query(
      `SELECT id_vehiculo FROM vehiculo WHERE placa = $1 OR (codigo_interno = $2 AND codigo_interno IS NOT NULL)`,
      [placa.toUpperCase().trim(), codigo_interno ? codigo_interno.toUpperCase().trim() : null]
    )
    if (dup.rows.length > 0) {
      return res.status(409).json({
        ok: false,
        mensaje: 'Ya existe un vehículo registrado con esta placa o código interno'
      })
    }

    const result = await pool.query(
      `INSERT INTO vehiculo
         (placa, codigo_interno, tipo_vehiculo, capacidad_m3, tara_kg, estado_vehiculo, kilometraje_actual)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        placa.toUpperCase().trim(),
        codigo_interno ? codigo_interno.toUpperCase().trim() : null,
        tipo_vehiculo,
        capacidad_m3,
        tara_kg,
        estado_vehiculo,
        kilometraje_actual
      ]
    )

    res.status(201).json({ ok: true, data: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, mensaje: 'Error al crear vehículo' })
  }
}

// PUT /api/flota/:id
export const editarVehiculo = async (req, res) => {
  try {
    const { id } = req.params
    const {
      placa, codigo_interno, tipo_vehiculo,
      capacidad_m3, tara_kg, kilometraje_actual
    } = req.body

    // Validar duplicado de placa o código en otro vehículo
    const dup = await pool.query(
      `SELECT id_vehiculo FROM vehiculo
       WHERE (placa = $1 OR (codigo_interno = $2 AND codigo_interno IS NOT NULL))
         AND id_vehiculo != $3`,
      [
        placa.toUpperCase().trim(),
        codigo_interno ? codigo_interno.toUpperCase().trim() : null,
        id
      ]
    )
    if (dup.rows.length > 0) {
      return res.status(409).json({
        ok: false,
        mensaje: 'Ya existe un vehículo registrado con esta placa o código interno'
      })
    }

    const result = await pool.query(
      `UPDATE vehiculo SET
         placa              = $1,
         codigo_interno     = $2,
         tipo_vehiculo      = $3,
         capacidad_m3       = $4,
         tara_kg            = $5,
         kilometraje_actual = $6
       WHERE id_vehiculo = $7
       RETURNING *`,
      [
        placa.toUpperCase().trim(),
        codigo_interno ? codigo_interno.toUpperCase().trim() : null,
        tipo_vehiculo,
        capacidad_m3,
        tara_kg,
        kilometraje_actual,
        id
      ]
    )

    if (result.rows.length === 0)
      return res.status(404).json({ ok: false, mensaje: 'Vehículo no encontrado' })

    res.json({ ok: true, data: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, mensaje: 'Error al editar vehículo' })
  }
}

// PATCH /api/flota/:id/estado
export const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params
    const { estado_vehiculo } = req.body

    const validos = ['DISPONIBLE', 'EN_SERVICIO', 'EN_MANTENIMIENTO', 'BAJA']
    if (!validos.includes(estado_vehiculo)) {
      return res.status(400).json({
        ok: false,
        mensaje: `Estado inválido. Permitidos: ${validos.join(', ')}`
      })
    }

    const result = await pool.query(
      `UPDATE vehiculo SET estado_vehiculo = $1
       WHERE id_vehiculo = $2
       RETURNING id_vehiculo, placa, codigo_interno, estado_vehiculo`,
      [estado_vehiculo, id]
    )

    if (result.rows.length === 0)
      return res.status(404).json({ ok: false, mensaje: 'Vehículo no encontrado' })

    res.json({ ok: true, data: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, mensaje: 'Error al cambiar estado' })
  }
}