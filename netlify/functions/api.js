const { Pool } = require('pg');
const pdfParse = require('pdf-parse');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const patrones = {
  ASSA: {
    prima: /prima\s*(?:total|neta)?:?\s*[₡]?\s*([\d,]+\.?\d*)/gi,
    deducible: /deducible:?\s*[₡]?\s*([\d,]+)/gi,
    responsabilidad: /responsabilidad\s*civil:?\s*[₡]?\s*([\d,]+)/gi
  },
  INS: {
    prima: /prima:?\s*[₡]?\s*([\d,]+\.?\d*)/gi,
    deducible: /deducible:?\s*[₡]?\s*([\d,]+)/gi,
    responsabilidad: /responsabilidad\s*civil:?\s*[₡]?\s*([\d,]+)/gi
  },
  MNK: {
    prima: /prima\s*(?:total|anual)?:?\s*[₡]?\s*([\d,]+\.?\d*)/gi,
    deducible: /deducible:?\s*[₡]?\s*([\d,]+)/gi,
    responsabilidad: /responsabilidad\s*civil:?\s*[₡]?\s*([\d,]+)/gi
  },
  QUALITAS: {
    prima: /prima:?\s*[₡]?\s*([\d,]+\.?\d*)/gi,
    deducible: /deducible:?\s*[₡]?\s*([\d,]+)/gi,
    responsabilidad: /responsabilidad\s*civil:?\s*[₡]?\s*([\d,]+)/gi
  }
};

const identificarAseguradora = (texto) => {
  const t = texto.toLowerCase();
  if (t.includes('assa')) return 'ASSA';
  if (t.includes('instituto nacional') || t.includes('ins ')) return 'INS';
  if (t.includes('mnk') || t.includes('mapfre')) return 'MNK';
  if (t.includes('qualitas')) return 'QUALITAS';
  return 'DESCONOCIDA';
};

const extraerNumero = (texto, regex) => {
  regex.lastIndex = 0;
  const match = regex.exec(texto);
  if (match) return parseFloat(match[1].replace(/,/g, ''));
  return null;
};

const calcularScore = (datos) => {
  let score = 50;
  if (datos.prima) {
    if (datos.prima < 300000) score += 20;
    else if (datos.prima < 500000) score += 10;
    else score -= 10;
  }
  if (datos.responsabilidad_civil) {
    if (datos.responsabilidad_civil >= 10000000) score += 15;
    else if (datos.responsabilidad_civil >= 5000000) score += 8;
  }
  if (datos.deducible) {
    if (datos.deducible < 100000) score += 15;
    else if (datos.deducible < 200000) score += 8;
  }
  return Math.min(100, Math.max(0, score));
};

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const path = event.path.replace('/.netlify/functions/api', '');

  try {
    if (path === '/health' && event.httpMethod === 'GET') {
      await pool.query('SELECT 1');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: 'OK', message: 'Sistema funcionando', database: 'Connected' })
      };
    }

    if (path === '/api/clientes' && event.httpMethod === 'GET') {
      const result = await pool.query('SELECT * FROM clientes ORDER BY created_at DESC');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, clientes: result.rows })
      };
    }

    if (path === '/api/clientes' && event.httpMethod === 'POST') {
      const { nombre, cedula, telefono, email } = JSON.parse(event.body);
      if (!nombre) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'El nombre es requerido' }) };
      }
      const result = await pool.query(
        'INSERT INTO clientes (nombre, cedula, telefono, email) VALUES ($1, $2, $3, $4) RETURNING *',
        [nombre, cedula, telefono, email]
      );
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, cliente: result.rows[0] })
      };
    }

    if (path === '/api/procesar-pdfs' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      const archivos = body.archivos || [];
      const resultados = [];

      for (const archivo of archivos) {
        try {
          const buffer = Buffer.from(archivo.contenido, 'base64');
          const data = await pdfParse(buffer);
          const texto = data.text;
          const aseguradora = identificarAseguradora(texto);
          const patron = patrones[aseguradora] || patrones.ASSA;
          const prima = extraerNumero(texto, patron.prima);
          const deducible = extraerNumero(texto, patron.deducible);
          const responsabilidad_civil = extraerNumero(texto, patron.responsabilidad);
          const t = texto.toLowerCase();
          const resultado = {
            aseguradora,
            nombreArchivo: archivo.nombre,
            prima: prima || 0,
            deducible: deducible || 0,
            responsabilidad_civil: responsabilidad_civil || 0,
            coberturas: {
              responsabilidadCivil: responsabilidad_civil > 0,
              robo: t.includes('robo'),
              colision: t.includes('colisi'),
              cristales: t.includes('cristal'),
              grua: t.includes('grua')
            }
          };
          resultado.score = calcularScore(resultado);
          resultados.push(resultado);
        } catch (err) {
          resultados.push({ aseguradora: 'ERROR', nombreArchivo: archivo.nombre, error: err.message, prima: 0, score: 0 });
        }
      }

      const mejorOpcion = resultados.filter(r => r.prima > 0).sort((a, b) => b.score - a.score)[0];

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, cotizaciones: resultados, mejorOpcion: mejorOpcion || null })
      };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Ruta no encontrada' }) };

  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
