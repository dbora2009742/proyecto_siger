import pool from '../config/db.js'

/* ══════════════════════════════════════════════════════════
   ZONAS MACRO
══════════════════════════════════════════════════════════ */

export const getZonasMacro = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        id_zona_macro,
        codigo,
        nombre,
        descripcion,
        activo,
        CASE
          WHEN geometria_poligono IS NULL THEN NULL
          ELSE ST_AsGeoJSON(geometria_poligono)::json
        END AS geojson
      FROM zona_macro
      ORDER BY codigo
    `)
    res.json({ ok: true, data: rows })
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message })
  }
}

export const crearZonaMacro = async (req, res) => {
  const { codigo, nombre, descripcion } = req.body
  if (!codigo?.trim() || !nombre?.trim())
    return res.status(400).json({ ok: false, message: 'Código y nombre son obligatorios.' })
  try {
    const { rows } = await pool.query(
      `INSERT INTO zona_macro (codigo, nombre, descripcion, activo)
       VALUES ($1, $2, $3, true)
       RETURNING id_zona_macro, codigo, nombre, descripcion, activo`,
      [codigo.trim().toUpperCase(), nombre.trim(), descripcion?.trim() ?? null]
    )
    res.status(201).json({ ok: true, data: rows[0] })
  } catch (e) {
    if (e.code === '23505')
      return res.status(409).json({ ok: false, message: `El código ${codigo} ya existe.` })
    res.status(500).json({ ok: false, message: e.message })
  }
}

export const actualizarGeometriaMacro = async (req, res) => {
  const { id } = req.params
  const { geojson } = req.body
  if (!geojson)
    return res.status(400).json({ ok: false, message: 'Se requiere el GeoJSON del polígono.' })
  try {
    const { rowCount } = await pool.query(
      `UPDATE zona_macro
       SET geometria_poligono = ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)
       WHERE id_zona_macro = $2`,
      [JSON.stringify(geojson), id]
    )
    if (rowCount === 0)
      return res.status(404).json({ ok: false, message: 'Zona macro no encontrada.' })
    res.json({ ok: true, message: 'Geometría actualizada.' })
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message })
  }
}

/* ══════════════════════════════════════════════════════════
   SUBZONAS
══════════════════════════════════════════════════════════ */

export const getSubzonas = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        s.id_subzona,
        s.id_zona_macro,
        s.codigo,
        s.nombre,
        s.estado,
        zm.codigo  AS zona_macro_codigo,
        zm.nombre  AS zona_macro_nombre,
        CASE
          WHEN s.geometria_poligono IS NULL THEN NULL
          ELSE ST_AsGeoJSON(s.geometria_poligono)::json
        END AS geojson,
        ROUND(CAST(ST_Area(s.geometria_poligono::geography) / 10000 AS numeric), 2) AS area_ha,
        ST_NPoints(s.geometria_poligono) - 1 AS num_vertices
      FROM subzona s
      JOIN zona_macro zm ON zm.id_zona_macro = s.id_zona_macro
      ORDER BY s.codigo
    `)
    res.json({ ok: true, data: rows })
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message })
  }
}

export const crearSubzona = async (req, res) => {
  const { id_zona_macro, codigo, nombre, geojson } = req.body

  if (!id_zona_macro || !codigo?.trim() || !nombre?.trim() || !geojson)
    return res.status(400).json({ ok: false, message: 'Todos los campos son obligatorios.' })

  try {
    // 0. Validar que el polígono no se auto-intersecta (ej: reloj de arena)
const { rows: validez } = await pool.query(
  `SELECT ST_IsValid(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)) AS valido,
          ST_IsValidReason(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)) AS razon`,
  [JSON.stringify(geojson)]
)
if (!validez[0].valido) {
  return res.status(422).json({
    ok: false,
    message: `El polígono no es válido: ${validez[0].razon}. Evita que los lados se crucen entre sí.`,
  })
}


    // 1. Verificar ST_Within respecto a la macro
    const { rows: macro } = await pool.query(
      `SELECT
         geometria_poligono IS NOT NULL AS tiene_geom,
         CASE
           WHEN geometria_poligono IS NULL THEN NULL
           ELSE ST_Within(
             ST_SetSRID(ST_GeomFromGeoJSON($1), 4326),
             geometria_poligono
           )
         END AS dentro
       FROM zona_macro WHERE id_zona_macro = $2`,
      [JSON.stringify(geojson), id_zona_macro]
    )
    if (!macro.length)
      return res.status(404).json({ ok: false, message: 'Zona macro no encontrada.' })
    if (macro[0].tiene_geom && macro[0].dentro === false)
      return res.status(422).json({ ok: false, message: 'El polígono queda fuera del límite de la zona macro.' })

    // 2. Verificar solapamiento con otras subzonas de la misma macro
    const { rows: solapadas } = await pool.query(
      `SELECT codigo, nombre FROM subzona
       WHERE id_zona_macro = $1
         AND geometria_poligono IS NOT NULL
         AND ST_Intersects(
           geometria_poligono,
           ST_SetSRID(ST_GeomFromGeoJSON($2), 4326)
         )`,
      [id_zona_macro, JSON.stringify(geojson)]
    )
    if (solapadas.length > 0) {
      const nombres = solapadas.map(s => `${s.codigo} ${s.nombre}`).join(', ')
      return res.status(422).json({
        ok: false,
        message: `El polígono se superpone con: ${nombres}. Las subzonas no pueden cruzarse.`,
      })
    }

    // 3. Insertar
    await pool.query(
      `INSERT INTO subzona (id_zona_macro, codigo, nombre, estado, geometria_poligono)
       VALUES ($1, $2, $3, 'ACTIVA', ST_SetSRID(ST_GeomFromGeoJSON($4), 4326))`,
      [id_zona_macro, codigo.trim(), nombre.trim(), JSON.stringify(geojson)]
    )

    res.status(201).json({ ok: true, message: 'Subzona creada correctamente.' })
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message })
  }
}

export const editarSubzona = async (req, res) => {
  const { id } = req.params
  const { id_zona_macro, nombre, geojson } = req.body

  if (!id_zona_macro || !nombre?.trim())
    return res.status(400).json({ ok: false, message: 'Sector y nombre son obligatorios.' })

  try {
    if (geojson) {
  // 0. Polígono válido
  const { rows: validez } = await pool.query(
    `SELECT ST_IsValid(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)) AS valido,
            ST_IsValidReason(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)) AS razon`,
    [JSON.stringify(geojson)]
  )
  if (!validez[0].valido) {
    return res.status(422).json({
      ok: false,
      message: `El polígono no es válido: ${validez[0].razon}. Evita que los lados se crucen entre sí.`,
    })
  }
      // 1. ST_Within respecto a la macro
      const { rows: macro } = await pool.query(
        `SELECT
           geometria_poligono IS NOT NULL AS tiene_geom,
           CASE
             WHEN geometria_poligono IS NULL THEN NULL
             ELSE ST_Within(
               ST_SetSRID(ST_GeomFromGeoJSON($1), 4326),
               geometria_poligono
             )
           END AS dentro
         FROM zona_macro WHERE id_zona_macro = $2`,
        [JSON.stringify(geojson), id_zona_macro]
      )
      if (!macro.length)
        return res.status(404).json({ ok: false, message: 'Zona macro no encontrada.' })
      if (macro[0].tiene_geom && macro[0].dentro === false)
        return res.status(422).json({ ok: false, message: 'El polígono queda fuera del límite de la zona macro.' })

      // 2. Solapamiento — excluye la subzona que se está editando
      const { rows: solapadas } = await pool.query(
        `SELECT codigo, nombre FROM subzona
         WHERE id_zona_macro = $1
           AND id_subzona != $2
           AND geometria_poligono IS NOT NULL
           AND ST_Intersects(
             geometria_poligono,
             ST_SetSRID(ST_GeomFromGeoJSON($3), 4326)
           )`,
        [id_zona_macro, id, JSON.stringify(geojson)]
      )
      if (solapadas.length > 0) {
        const nombres = solapadas.map(s => `${s.codigo} ${s.nombre}`).join(', ')
        return res.status(422).json({
          ok: false,
          message: `El polígono se superpone con: ${nombres}. Las subzonas no pueden cruzarse.`,
        })
      }
    }

    // 3. Actualizar
    const { rowCount } = await pool.query(
      `UPDATE subzona
       SET id_zona_macro      = $1,
           nombre             = $2,
           geometria_poligono = CASE
             WHEN $3::text IS NULL THEN geometria_poligono
             ELSE ST_SetSRID(ST_GeomFromGeoJSON($3), 4326)
           END
       WHERE id_subzona = $4`,
      [id_zona_macro, nombre.trim(), geojson ? JSON.stringify(geojson) : null, id]
    )

    if (rowCount === 0)
      return res.status(404).json({ ok: false, message: 'Subzona no encontrada.' })

    res.json({ ok: true, message: 'Subzona actualizada correctamente.' })
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message })
  }
}

export const cambiarEstadoSubzona = async (req, res) => {
  const { id } = req.params
  const { estado } = req.body
  if (!['ACTIVA', 'INACTIVA'].includes(estado))
    return res.status(400).json({ ok: false, message: 'Estado inválido.' })
  try {
    await pool.query(`UPDATE subzona SET estado = $1 WHERE id_subzona = $2`, [estado, id])
    res.json({ ok: true, message: 'Estado actualizado.' })
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message })
  }
}
