global.DOMMatrix = class DOMMatrix {
  constructor() { this.a=1;this.b=0;this.c=0;this.d=1;this.e=0;this.f=0; }
};

const { Pool } = require('pg');
const pdfParseLib = require('pdf-parse');
const pdfParse = pdfParseLib.default || pdfParseLib;

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
      const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

      for (const archivo of archivos) {
        try {
          const prompt = `Sos un experto corredor de seguros vehiculares en Costa Rica con 20 años de experiencia. Tu trabajo es analizar cotizaciones de seguros y dar recomendaciones profesionales reales.

IMPORTANTE: Este PDF puede contener uno o varios planes de cobertura. Si tiene múltiples planes, analizá TODOS y devolvelos como array.

Analizá el PDF y extraé la información en este formato JSON exacto:

[
  {
    "aseguradora": "nombre exacto de la aseguradora",
    "plan": "nombre del plan si tiene (ej: Plan Básico, Plan Total, etc.) o null",
    "prima_anual": número en colones sin símbolos,
    "prima_mensual": número en colones (prima_anual/12 si no aparece),
    "deducible": número en colones,
    "responsabilidad_civil": número en colones,
    "vigencia_desde": "fecha o null",
    "vigencia_hasta": "fecha o null",
    "coberturas": {
      "colision_vuelco": true/false,
      "robo_total": true/false,
      "robo_parcial": true/false,
      "cristales": true/false,
      "grua": true/false,
      "vehiculo_reemplazo": true/false,
      "gastos_medicos_ocupantes": número en colones o 0,
      "muerte_accidental": true/false,
      "responsabilidad_civil_danos": número en colones o 0,
      "responsabilidad_civil_lesiones": número en colones o 0,
      "asistencia_vial": true/false,
      "llanta_pinchada": true/false,
      "cerrajeria": true/false,
      "taxi_reemplazo": true/false
    },
    "exclusiones_importantes": ["lista de exclusiones relevantes que el cliente debe saber"],
    "beneficios_destacados": ["lista de beneficios que diferencian esta opción"],
    "comision_porcentaje": número o 15,
    "numero_cotizacion": "número o null",
    "analisis_ia": {
      "fortalezas": ["2-3 puntos fuertes reales de esta cotización"],
      "debilidades": ["2-3 puntos débiles o limitaciones reales"],
      "perfil_ideal": "descripción del tipo de conductor/vehículo para quien es ideal esta opción",
      "puntuacion_precio_valor": número del 1 al 10,
      "puntuacion_cobertura": número del 1 al 10,
      "puntuacion_servicio": número del 1 al 10,
      "recomendacion": "explicación detallada de 2-3 oraciones de por qué elegir o no esta opción, con criterio profesional real"
    }
  }
]

REGLAS CRÍTICAS:
1. Si el PDF tiene múltiples planes, devolvé UN objeto por cada plan
2. Respondé SOLO con el JSON array, sin texto adicional ni markdown
3. Basá el análisis en los datos REALES del PDF, no en suposiciones
4. Las fortalezas y debilidades deben ser específicas y basadas en los datos reales
5. Si un dato no aparece en el PDF, usá null o 0
6. La recomendación debe ser honesta — si hay algo malo, decilo`;

          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 4096,
              messages: [{
                role: 'user',
                content: [{
                  type: 'document',
                  source: {
                    type: 'base64',
                    media_type: 'application/pdf',
                    data: archivo.contenido
                  }
                }, {
                  type: 'text',
                  text: prompt
                }]
              }]
            })
          });

          const aiData = await response.json();
          if (!aiData.content || !aiData.content[0]) {
            throw new Error('Claude no respondió: ' + JSON.stringify(aiData));
          }
          let texto = aiData.content[0].text.trim();
          texto = texto.replace(/```json/g, '').replace(/```/g, '').trim();
          
          let parsed = JSON.parse(texto);
          // Si Claude devuelve array de planes, procesarlos todos
          const planes = Array.isArray(parsed) ? parsed : [parsed];
          
          for (const datos of planes) {
            const resultado = {
              aseguradora: datos.aseguradora || 'DESCONOCIDA',
              nombreArchivo: archivo.nombre,
              plan: datos.plan || null,
              prima: datos.prima_anual || datos.prima || 0,
              deducible: datos.deducible || 0,
              responsabilidad_civil: datos.responsabilidad_civil || 0,
              pago_mensual: datos.prima_mensual || Math.round((datos.prima_anual || datos.prima || 0) / 12),
              vigencia: datos.vigencia_desde || '',
              coberturas: datos.coberturas || {},
              beneficios_adicionales: datos.beneficios_destacados || datos.beneficios_adicionales || [],
              comision_porcentaje: datos.comision_porcentaje || 15,
              numero_poliza: datos.numero_cotizacion || '',
              analisis_ia: datos.analisis_ia || null,
              exclusiones: datos.exclusiones_importantes || []
            };
            resultado.score = resultado.analisis_ia ? 
              Math.round((resultado.analisis_ia.puntuacion_precio_valor + resultado.analisis_ia.puntuacion_cobertura + resultado.analisis_ia.puntuacion_servicio) / 3 * 10) :
              calcularScore(resultado);
            resultados.push(resultado);
          }

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
