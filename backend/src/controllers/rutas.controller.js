import pool from '../config/db.js'

const TURNOS_VALIDOS = ['MANANA', 'TARDE', 'NOCHE']

// GET /api/rutas
export const getRutas = async (req, res) => {
  try {
    const { activa, turno, buscar } = req.query

    let query = `
      SELECT
        r.id_ruta,
        r.codigo,
        r.nombre,
        r.turno,
        r.dias_semana,
        r.activa,
        e.id_equipo,
        e.nombre        AS equipo_nombre,
        u.nombres_apellidos AS responsable_nombre,
        v.placa,
        v.tipo_vehiculo,
        COUNT(rs.id_subzona)::int AS total_subzonas
      FROM ruta_programada r
      JOIN equipo_trabajo e ON e.id_equipo    = r.id_equipo
      JOIN usuario        u ON u.id_usuario   = e.id_responsable
      JOIN vehiculo       v ON v.id_vehiculo  = e.id_vehiculo
      LEFT JOIN ruta_subzona rs ON rs.id_ruta = r.id_ruta
      WHERE 1=1
    `
    const params = []

    if (activa !== undefined && activa !== '') {
      params.push(activa === 'true')
      query += ` AND r.activa = $${params.length}`
    }

    if (turno) {
      params.push(turno)
      query += ` AND r.turno = $${params.length}`
    }

    if (buscar) {
      params.push(`%${buscar}%`)
      query += ` AND (
        r.nombre ILIKE $${params.length} OR
        r.codigo ILIKE $${params.length} OR
        e.nombre ILIKE $${params.length}
      )`
    }

    query += ` GROUP BY r.id_ruta, e.id_equipo, u.nombres_apellidos, v.placa, v.tipo_vehiculo
               ORDER BY r.id_ruta ASC`

    const { rows } = await pool.query(query, params)
    res.json({ ok: true, data: rows })
  } catch (err) {
    console.error('getRutas:', err)
    res.status(500).json({ ok: false, mensaje: 'Error al obtener rutas' })
  }
}

// GET /api/rutas/resumen
export const getResumenRutas = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                      AS total,
        COUNT(*) FILTER (WHERE activa = true)         AS activas,
        COUNT(*) FILTER (WHERE turno = 'MANANA')      AS manana,
        COUNT(*) FILTER (WHERE turno = 'TARDE')       AS tarde,
        COUNT(*) FILTER (WHERE turno = 'NOCHE')       AS noche
      FROM ruta_programada
    `)
    res.json({ ok: true, data: rows[0] })
  } catch (err) {
    console.error('getResumenRutas:', err)
    res.status(500).json({ ok: false, mensaje: 'Error al obtener resumen' })
  }
}

// POST /api/rutas
export const crearRuta = async (req, res) => {
  const client = await pool.connect()
  try {
    const { nombre, codigo, turno, dias_semana, id_equipo, subzonas } = req.body

    if (!nombre || !codigo || !turno || !dias_semana || !id_equipo) {
      return res.status(400).json({ ok: false, mensaje: 'nombre, codigo, turno, dias_semana e id_equipo son requeridos' })
    }

    if (!TURNOS_VALIDOS.includes(turno)) {
      return res.status(400).json({ ok: false, mensaje: `Turno inválido. Permitidos: ${TURNOS_VALIDOS.join(', ')}` })
    }

    // Verificar código único
    const { rows: [existe] } = await client.query(
      `SELECT id_ruta FROM ruta_programada WHERE codigo = $1`, [codigo]
    )
    if (existe) {
      return res.status(409).json({ ok: false, mensaje: 'Ya existe una ruta con ese código' })
    }

    await client.query('BEGIN')

    const { rows: [ruta] } = await client.query(
      `INSERT INTO ruta_programada (nombre, codigo, turno, dias_semana, id_equipo, creado_por, activa)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING *`,
      [nombre.trim(), codigo.trim().toUpperCase(), turno, dias_semana, id_equipo, req.usuario.id_usuario]
    )

    // Insertar subzonas con orden
    if (Array.isArray(subzonas) && subzonas.length > 0) {
      for (const sz of subzonas) {
        await client.query(
          `INSERT INTO ruta_subzona (id_ruta, id_subzona, orden_secuencia)
           VALUES ($1, $2, $3)`,
          [ruta.id_ruta, sz.id_subzona, sz.orden_secuencia]
        )
      }
    }

    await client.query('COMMIT')
    res.status(201).json({ ok: true, data: ruta })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('crearRuta:', err)
    res.status(500).json({ ok: false, mensaje: 'Error al crear ruta' })
  } finally {
    client.release()
  }
}

// PUT /api/rutas/:id
export const editarRuta = async (req, res) => {
  const client = await pool.connect()
  try {
    const { id } = req.params
    const { nombre, codigo, turno, dias_semana, id_equipo, subzonas } = req.body

    if (!nombre || !codigo || !turno || !dias_semana || !id_equipo) {
      return res.status(400).json({ ok: false, mensaje: 'nombre, codigo, turno, dias_semana e id_equipo son requeridos' })
    }

    if (!TURNOS_VALIDOS.includes(turno)) {
      return res.status(400).json({ ok: false, mensaje: `Turno inválido. Permitidos: ${TURNOS_VALIDOS.join(', ')}` })
    }

    // Código único excluyendo la ruta actual
    const { rows: [existe] } = await client.query(
      `SELECT id_ruta FROM ruta_programada WHERE codigo = $1 AND id_ruta != $2`,
      [codigo, id]
    )
    if (existe) {
      return res.status(409).json({ ok: false, mensaje: 'Ya existe otra ruta con ese código' })
    }

    await client.query('BEGIN')

    const { rows: [ruta] } = await client.query(
      `UPDATE ruta_programada
       SET nombre = $1, codigo = $2, turno = $3, dias_semana = $4, id_equipo = $5
       WHERE id_ruta = $6
       RETURNING *`,
      [nombre.trim(), codigo.trim().toUpperCase(), turno, dias_semana, id_equipo, id]
    )

    if (!ruta) {
      await client.query('ROLLBACK')
      return res.status(404).json({ ok: false, mensaje: 'Ruta no encontrada' })
    }

    // Reemplazar subzonas
    await client.query(`DELETE FROM ruta_subzona WHERE id_ruta = $1`, [id])

    if (Array.isArray(subzonas) && subzonas.length > 0) {
      for (const sz of subzonas) {
        await client.query(
          `INSERT INTO ruta_subzona (id_ruta, id_subzona, orden_secuencia)
           VALUES ($1, $2, $3)`,
          [ruta.id_ruta, sz.id_subzona, sz.orden_secuencia]
        )
      }
    }

    await client.query('COMMIT')
    res.json({ ok: true, data: ruta })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('editarRuta:', err)
    res.status(500).json({ ok: false, mensaje: 'Error al editar ruta' })
  } finally {
    client.release()
  }
}

// PATCH /api/rutas/:id/estado
export const cambiarEstadoRuta = async (req, res) => {
  try {
    const { id } = req.params
    const { activa } = req.body

    if (typeof activa !== 'boolean') {
      return res.status(400).json({ ok: false, mensaje: 'El campo activa debe ser booleano' })
    }

    const { rows: [actualizada] } = await pool.query(
      `UPDATE ruta_programada SET activa = $1 WHERE id_ruta = $2 RETURNING *`,
      [activa, id]
    )

    if (!actualizada) {
      return res.status(404).json({ ok: false, mensaje: 'Ruta no encontrada' })
    }

    res.json({ ok: true, data: actualizada })
  } catch (err) {
    console.error('cambiarEstadoRuta:', err)
    res.status(500).json({ ok: false, mensaje: 'Error al cambiar estado de la ruta' })
  }
}

// GET /api/rutas/:id/subzonas
export const getSubzonasDeRuta = async (req, res) => {
  try {
    const { id } = req.params
    const { rows } = await pool.query(
      `SELECT
         rs.id_ruta_subzona,
         rs.orden_secuencia,
         s.id_subzona,
         s.codigo,
         s.nombre,
         s.estado
       FROM ruta_subzona rs
       JOIN subzona s ON s.id_subzona = rs.id_subzona
       WHERE rs.id_ruta = $1
       ORDER BY rs.orden_secuencia ASC`,
      [id]
    )
    res.json({ ok: true, data: rows })
  } catch (err) {
    console.error('getSubzonasDeRuta:', err)
    res.status(500).json({ ok: false, mensaje: 'Error al obtener subzonas de la ruta' })
  }
}