import pool from '../config/db.js'

/* ── helpers ── */
const TIPOS   = ['ORGANICO', 'INORGANICO', 'RECICLABLE', 'PELIGROSO', 'GENERAL']
const EST_FIS = ['BUENO', 'DETERIORADO', 'DAÑADO']
const EST_OP  = ['OPERATIVO', 'FUERA_DE_SERVICIO', 'EN_MANTENIMIENTO']

/* ══════════════════════════════════════════════════════════
   GET /api/tachos
   Devuelve todos los tachos activos con subzona detectada
══════════════════════════════════════════════════════════ */
export const getTachos = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        t.id_tacho,
        t.id_subzona,
        t.codigo_qr,
        t.codigo_visible,
        t.tipo_tacho,
        t.capacidad_litros,
        t.estado_fisico,
        t.estado_operativo,
        t.direccion_referencia,
        t.ultimo_vaciado,
        t.activo,
        ST_AsGeoJSON(t.ubicacion_punto)::json AS geojson_punto,
        ST_Y(t.ubicacion_punto) AS lat,
        ST_X(t.ubicacion_punto) AS lng,
        s.codigo  AS subzona_codigo,
        s.nombre  AS subzona_nombre,
        zm.codigo AS zona_macro_codigo,
        zm.nombre AS zona_macro_nombre
      FROM tacho t
      JOIN subzona s   ON s.id_subzona   = t.id_subzona
      JOIN zona_macro zm ON zm.id_zona_macro = s.id_zona_macro
      WHERE t.activo = true
      ORDER BY t.codigo_visible
    `)
    res.json({ ok: true, data: rows })
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message })
  }
}

/* ══════════════════════════════════════════════════════════
   POST /api/tachos
   Crea tacho — la subzona se detecta automáticamente por PostGIS
   Si el punto no cae en ninguna subzona, se rechaza
══════════════════════════════════════════════════════════ */
export const crearTacho = async (req, res) => {
  const { codigo_visible, tipo_tacho, capacidad_litros,
          estado_fisico, estado_operativo,
          direccion_referencia, lat, lng } = req.body

  // Validaciones básicas
  if (!codigo_visible?.trim())
    return res.status(400).json({ ok: false, message: 'El código visible es obligatorio.' })
  if (!TIPOS.includes(tipo_tacho))
    return res.status(400).json({ ok: false, message: 'Tipo de tacho inválido.' })
  if (!capacidad_litros || capacidad_litros <= 0)
    return res.status(400).json({ ok: false, message: 'La capacidad debe ser mayor a 0.' })
  if (lat == null || lng == null)
    return res.status(400).json({ ok: false, message: 'Se requiere ubicación en el mapa.' })

  try {
    // 1. Detectar subzona automáticamente con ST_Within
    const { rows: subzonas } = await pool.query(
      `SELECT id_subzona, codigo, nombre
       FROM subzona
       WHERE estado = 'ACTIVA'
         AND geometria_poligono IS NOT NULL
         AND ST_Within(
           ST_SetSRID(ST_MakePoint($1, $2), 4326),
           geometria_poligono
         )
       LIMIT 1`,
      [lng, lat]
    )

    if (subzonas.length === 0)
      return res.status(422).json({
        ok: false,
        message: 'El punto no está dentro de ninguna subzona activa. Mueve el marcador a una zona delimitada.',
      })

    const { id_subzona, codigo: sz_codigo, nombre: sz_nombre } = subzonas[0]

    // 2. Insertar
    const { rows } = await pool.query(
      `INSERT INTO tacho (
         id_subzona, codigo_visible, tipo_tacho,
         capacidad_litros, estado_fisico, estado_operativo,
         direccion_referencia, ubicacion_punto
       ) VALUES (
         $1, $2, $3, $4,
         $5::estado_fisico_tacho,
         $6::estado_operativo_tacho,
         $7,
         ST_SetSRID(ST_MakePoint($8, $9), 4326)
       )
       RETURNING id_tacho, codigo_visible, codigo_qr`,
      [
        id_subzona,
        codigo_visible.trim().toUpperCase(),
        tipo_tacho,
        capacidad_litros,
        estado_fisico  ?? 'BUENO',
        estado_operativo ?? 'OPERATIVO',
        direccion_referencia?.trim() ?? null,
        lng, lat,
      ]
    )

    res.status(201).json({
      ok: true,
      message: `Tacho registrado en subzona ${sz_codigo} – ${sz_nombre}.`,
      data: rows[0],
    })
  } catch (e) {
    if (e.code === '23505')
      return res.status(409).json({ ok: false, message: `El código ${codigo_visible} ya existe.` })
    res.status(500).json({ ok: false, message: e.message })
  }
}

/* ══════════════════════════════════════════════════════════
   PUT /api/tachos/:id
   Edita datos del tacho (puede reubicar el punto)
══════════════════════════════════════════════════════════ */
export const editarTacho = async (req, res) => {
  const { id } = req.params
  const { codigo_visible, tipo_tacho, capacidad_litros,
          estado_fisico, estado_operativo,
          direccion_referencia, lat, lng } = req.body

  if (!codigo_visible?.trim())
    return res.status(400).json({ ok: false, message: 'El código visible es obligatorio.' })

  try {
    let id_subzona = null

    // Si se reubica el punto, re-detectar subzona
    if (lat != null && lng != null) {
      const { rows: subzonas } = await pool.query(
        `SELECT id_subzona, codigo, nombre
         FROM subzona
         WHERE estado = 'ACTIVA'
           AND geometria_poligono IS NOT NULL
           AND ST_Within(
             ST_SetSRID(ST_MakePoint($1, $2), 4326),
             geometria_poligono
           )
         LIMIT 1`,
        [lng, lat]
      )
      if (subzonas.length === 0)
        return res.status(422).json({
          ok: false,
          message: 'El punto no está dentro de ninguna subzona activa.',
        })
      id_subzona = subzonas[0].id_subzona
    }

    const { rowCount } = await pool.query(
      `UPDATE tacho SET
         codigo_visible       = $1,
         tipo_tacho           = $2,
         capacidad_litros     = $3,
         estado_fisico        = $4::estado_fisico_tacho,
         estado_operativo     = $5::estado_operativo_tacho,
         direccion_referencia = $6,
         id_subzona           = CASE WHEN $7::int IS NULL THEN id_subzona ELSE $7 END,
         ubicacion_punto      = CASE
           WHEN $8::float IS NULL THEN ubicacion_punto
           ELSE ST_SetSRID(ST_MakePoint($8, $9), 4326)
         END
       WHERE id_tacho = $10 AND activo = true`,
      [
        codigo_visible.trim().toUpperCase(),
        tipo_tacho,
        capacidad_litros,
        estado_fisico,
        estado_operativo,
        direccion_referencia?.trim() ?? null,
        id_subzona,
        lng ?? null,
        lat ?? null,
        id,
      ]
    )

    if (rowCount === 0)
      return res.status(404).json({ ok: false, message: 'Tacho no encontrado.' })

    res.json({ ok: true, message: 'Tacho actualizado.' })
  } catch (e) {
    if (e.code === '23505')
      return res.status(409).json({ ok: false, message: `El código ${codigo_visible} ya existe.` })
    res.status(500).json({ ok: false, message: e.message })
  }
}

/* ══════════════════════════════════════════════════════════
   PATCH /api/tachos/:id/estado
   Cambia estado operativo
══════════════════════════════════════════════════════════ */
export const cambiarEstadoTacho = async (req, res) => {
  const { id } = req.params
  const { estado_operativo } = req.body
  if (!EST_OP.includes(estado_operativo))
    return res.status(400).json({ ok: false, message: 'Estado operativo inválido.' })
  try {
    await pool.query(
      `UPDATE tacho SET estado_operativo = $1::estado_operativo_tacho WHERE id_tacho = $2`,
      [estado_operativo, id]
    )
    res.json({ ok: true, message: 'Estado actualizado.' })
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message })
  }
}

/* ══════════════════════════════════════════════════════════
   DELETE /api/tachos/:id  → borrado lógico
══════════════════════════════════════════════════════════ */
export const darBajaTacho = async (req, res) => {
  const { id } = req.params
  try {
    const { rowCount } = await pool.query(
      `UPDATE tacho SET activo = false WHERE id_tacho = $1 AND activo = true`,
      [id]
    )
    if (rowCount === 0)
      return res.status(404).json({ ok: false, message: 'Tacho no encontrado.' })
    res.json({ ok: true, message: 'Tacho dado de baja.' })
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message })
  }
}
