import React, { useState, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCJwRS5h5PZEXpo1nyrEM_yi9oVGZoPFoI",
  authDomain: "comparativo-seguros-e8717.firebaseapp.com",
  projectId: "comparativo-seguros-e8717",
  storageBucket: "comparativo-seguros-e8717.firebasestorage.app",
  messagingSenderId: "80363285812",
  appId: "1:80363285812:web:cb6ac0666791d0d43dc961"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);


import { FileText, CheckCircle, Send, X, Loader2 } from 'lucide-react';

const quitarTildes = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const limpiarDeducible = (s) => { if (!s) return 'Sin deducible'; const t = s.toString().toLowerCase().trim(); if (t.includes('pecado')||t.includes('sin')||t==='0'||t==='0.0'||t===''||t==='null'||t==='undefined') return 'Sin deducible'; return s; };
const fmtC = (n, moneda) => {
  if (!n && n!==0) return '—';
  if (isNaN(Number(n))) return '—';
  const num = Number(n).toLocaleString('es-CR');
  const m = quitarTildes((moneda||'').toLowerCase());
  if (m==='usd'||m==='$'||m.includes('dol')) return `$${num}`;
  return `\u20a1${num}`;
};

const COLORES_ASEG = {
  mnk:   { bg:'#1E1B4B', text:'#A5B4FC', logo:'#2D2A6E' },
  ins:   { bg:'#172554', text:'#93C5FD', logo:'#1E3A8A' },
  assa:  { bg:'#052E16', text:'#86EFAC', logo:'#064E3B' },
  qualitas: { bg:'#2D1B00', text:'#FCD34D', logo:'#78350F' },
  lafise:{ bg:'#1A1A2E', text:'#C4B5FD', logo:'#3730A3' },
  mapfre:{ bg:'#1F0A2E', text:'#F0ABFC', logo:'#6B21A8' },
  default:{ bg:'#0F172A', text:'#CBD5E1', logo:'#1E293B' },
};

const getColor = (aseg) => {
  const a = (aseg||'').toLowerCase();
  if (a.includes('mnk')) return COLORES_ASEG.mnk;
  if (a.includes('ins')||a.includes('nacional')) return COLORES_ASEG.ins;
  if (a.includes('assa')) return COLORES_ASEG.assa;
  if (a.includes('qualitas')) return COLORES_ASEG.qualitas;
  if (a.includes('lafise')) return COLORES_ASEG.lafise;
  if (a.includes('mapfre')) return COLORES_ASEG.mapfre;
  return COLORES_ASEG.default;
};

const getInitials = (aseg) => {
  const a = (aseg||'').toUpperCase();
  if (a.includes('MNK')) return 'MNK';
  if (a.includes('INS')||a.includes('NACIONAL')) return 'INS';
  if (a.includes('ASSA')) return 'ASSA';
  if (a.includes('QUALITAS')) return 'QUAL';
  if (a.includes('LAFISE')) return 'LAF';
  if (a.includes('MAPFRE')) return 'MAP';
  return (aseg||'??').substring(0,3).toUpperCase();
};

const ScoreRing = ({ score, color='#F59E0B', trackColor='#FEF3C7', textColor='#92400E', size=64 }) => {
  const r = 26; const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div style={{position:'relative',width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} viewBox="0 0 64 64" style={{transform:'rotate(-90deg)'}}>
        <circle cx="32" cy="32" r={r} fill="none" stroke={trackColor} strokeWidth="7"/>
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"/>
      </svg>
      <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
        fontSize:'17px',fontWeight:'800',color:textColor,textAlign:'center',lineHeight:1}}>
        {score}
      </div>
    </div>
  );
};


const IntelMercado = ({ tipoSeguro, cotizaciones }) => {
  const [abierto, setAbierto] = React.useState({});
  const toggle = (key) => setAbierto(prev => ({...prev, [key]: !prev[key]}));
  const datosAseg = {
    INS: {
      cal: "AAA.cr (Moody's Local, Ago 2025) · AAA(cri) (Fitch, 2024) · A Excelente (AM Best) · ISC: 3.3x (mín. regulatorio 1.3x, Jun 2025)",
      part: "65% del total de primas emitidas en CR (Jun 2025, SUGESE) — líder absoluto del mercado",
      fort: "Única con garantía del Estado. Mayor red de talleres del país. Solidez financiera comprobada.",
      cons: "Procesos de reclamo más lentos por volumen. Menor flexibilidad comercial vs privadas.",
      exclA: ["Alcohol sin cobertura 17N contratada","Daños mecánicos o por falta de mantenimiento","Vehículo usado para taxi, Uber o carga"],
      exclH: ["Daños por negligencia del asegurado","Robo sin evidencia de fuerza o violencia","Bienes de terceros en la propiedad"],
    },
    ASSA: {
      cal: "AAA.cr (Moody's Local, Sep 2025) · AAA(CR) Estable (SCR) · ISC: cumple regulatorio (dato no publicado por aseguradora)",
      part: "Segunda aseguradora más grande en seguros generales de CR (SUGESE 2025). Grupo regional con presencia en Centroamérica.",
      fort: "3 planes diferenciados. App ASSAMóvil 24/7. Red de talleres propios.",
      cons: "Plan Económico tiene RC Daños a Terceros de solo ₡25M vs ₡100M en Platino. Verificar siempre.",
      exclA: ["Extras no declarados al contratar","Conductor sin licencia vigente al momento del accidente","Uso comercial no declarado"],
      exclH: ["Objetos de valor no declarados explícitamente","Construcciones no autorizadas","Inundaciones por negligencia en drenajes"],
    },
    MNK: {
      cal: "BBB+.cr (Moody's Local, Jul 2025) · ⚠️ Pérdidas acumuladas: 44% sobre capital social a Jun 2025 — bajo seguimiento",
      part: "Aseguradora privada en crecimiento sostenido. Primer Centro de Servicios propio de una aseguradora en CR (2025).",
      fort: "LUC simplifica RC. RC Alcohol incluida. Multiasistencia completa. Centro de Servicios propio.",
      cons: "Sin calificación SCR pública. Pérdidas parciales NO incluidas en plan Ahorro. Menor red talleres.",
      exclA: ["Pérdidas parciales NO incluidas en plan Ahorro","Uso comercial del vehículo","Daños propios bajo efectos de alcohol"],
      exclH: ["Negligencia o mal mantenimiento del inmueble","Robo sin evidencia de fuerza","Objetos valiosos no declarados"],
    },
    Qualitas: {
      cal: "A+ (PCR Pacific Credit Rating, Dic 2024) · Filial de Quálitas México (empresa pública en BMV)",
      part: "Especializada exclusivamente en autos en CR. Crecimiento sostenido (SUGESE 2025).",
      fort: "Especialización total en autos — ventaja en velocidad de reclamos. Experiencia del grupo México.",
      cons: "Solo autos — no apto para consolidar seguros. Menor presencia en zonas rurales.",
      exclA: ["Accesorios no declarados al contratar","Conductor diferente al habitual declarado","Daños mecánicos no relacionados con accidente"],
      exclH: [],
    },
    LAFISE: {
      cal: "Grupo financiero regional en 9 países. Sin calificación publicada por SCR a 2025 — solicitar ISC si cliente lo requiere",
      part: "En crecimiento en CR (SUGESE 2025). Mayor fortaleza en seguros comerciales e incendio.",
      fort: "Respaldo de grupo financiero regional. Buenas condiciones en comercial y pymes.",
      cons: "Menor presencia en autos. Verificar red de talleres en zona del cliente.",
      exclA: ["Vehículos mayores de 10 años pueden tener restricciones","Uso comercial no declarado"],
      exclH: ["Bienes sin inventario actualizado","Construcciones no autorizadas en la propiedad"],
    },
    Mapfre: {
      cal: "CR AAA Estable (Pacific Credit Rating, Dic 2024) · Grupo MAPFRE cotiza en Bolsa de Madrid (IBEX 35)",
      part: "4.6% participación mercado CR (Mar 2025, SUGESE). Presencia en Vida, Autos, Generales y Salud.",
      fort: "Respaldo de grupo asegurador global con presencia en 40 países. Ratio combinado 95.4% (eficiencia operativa). Calificación máxima CR.",
      cons: "Planes modulares — verificar qué coberturas son incluidas vs opcionales en cada cotización.",
      exclA: ["Accesorios y modificaciones no declaradas","Uso comercial del vehículo no declarado","Conductor habitual diferente al declarado"],
      exclH: ["Bienes sin declarar en inventario","Daños por negligencia del asegurado","Construcciones no autorizadas"],
    },
    Davivienda: {
      cal: "Sin calificación SCR publicada en CR a 2025. Respaldo del Grupo Bancolombia (banco más grande de Colombia).",
      part: "Participación enfocada en hogar y comercial. Especialidad en seguros vinculados a créditos hipotecarios.",
      fort: "Respaldo financiero de Grupo Bancolombia. Especialización en incendio hogar vinculado a hipotecas.",
      cons: "Menor presencia en autos. Red de servicio más limitada que aseguradoras especializadas en CR.",
      exclA: [],
      exclH: ["Propiedades con más de 35 años de antigüedad pueden tener condiciones especiales","Bienes de alto valor no declarados explícitamente","Daños por negligencia en mantenimiento"],
    },
  };
  const tendencias = {
    autos: ["📈 Mercado de autos creció 10% en primas en CR 2024 (SUGESE)","⚖️ Mayor litigiosidad en RC — verificar siempre Gastos Legales con el cliente","💡 RC Alcohol y Asistencia 24/7 son diferenciadores clave al vender","⚠️ Verificar que el valor del vehículo esté actualizado — depreciación afecta indemnizaciones"],
    incendio_hogar: ["📈 Incendio es el 4° ramo con mayor primaje en CR (SUGESE 2024)","🏠 Clientes con hipoteca están obligados contractualmente a asegurar","💡 Inflación en construcción — actualizar suma asegurada anualmente","⚠️ Inventario de bienes actualizado es clave para validar reclamos de robo"],
    incendio_comercial: ["📈 Seguros comerciales en crecimiento sostenido post-pandemia","🏢 Bancos exigen incendio como requisito para créditos — oportunidad de venta","💡 Pymes son el segmento con mayor crecimiento en demanda","⚠️ Sin inventario actualizado los reclamos se complican significativamente"],
    todo_riesgo: ["📈 Todo riesgo en crecimiento para equipos tecnológicos y maquinaria","🛡️ Demanda creciente en empresas con activos móviles de alto valor","💡 Ideal para construcción, transporte de equipos y tecnología","⚠️ Mayor detalle en inventarios requerido — fundamental para reclamos"],
  };
  const nombres = [...new Set(cotizaciones.map(c => {
    const n = (c.aseguradora||'').toLowerCase();
    if (n.includes('ins')||n.includes('instituto')) return 'INS';
    if (n.includes('assa')) return 'ASSA';
    if (n.includes('mnk')) return 'MNK';
    if (n.includes('qualitas')||n.includes('qu\u00e1litas')) return 'Qualitas';
    if (n.includes('lafise')) return 'LAFISE';
    if (n.includes('mapfre')) return 'Mapfre';
    if (n.includes('davivienda')) return 'Davivienda';
    return null;
  }).filter(Boolean))];
  const row = (label, val, bg, border, labelColor) => (
    <div style={{background:bg,borderRadius:'8px',padding:'12px',marginBottom:'8px',border:`1px solid ${border}`}}>
      <div style={{fontSize:'10px',fontWeight:'700',color:labelColor,textTransform:'uppercase',marginBottom:'6px'}}>{label}</div>
      <div style={{fontSize:'12px',color:'#334155',lineHeight:'1.5'}}>{val}</div>
    </div>
  );
  const hdr = (key, icon, title) => (
    <div onClick={() => toggle(key)} style={{padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',background:abierto[key]?'#F8FAFC':'white',userSelect:'none'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
        <span style={{fontSize:'16px'}}>{icon}</span>
        <span style={{fontWeight:'700',color:'#0F172A',fontSize:'13px'}}>{title}</span>
      </div>
      <span style={{color:'#64748B',fontSize:'13px',fontWeight:'700'}}>{abierto[key]?'▲':'▼'}</span>
    </div>
  );
  return (
    <div style={{marginTop:'28px'}}>
      <div style={{fontSize:'13px',fontWeight:'700',color:'#64748B',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'16px',paddingBottom:'10px',borderBottom:'1px solid #E2E8F0'}}>
        🧠 Inteligencia de Mercado — Solo para el Corredor
      </div>
      <div style={{background:'white',borderRadius:'12px',border:'1px solid #E2E8F0',marginBottom:'10px',overflow:'hidden'}}>
        {hdr('tend','📊','Tendencias del ramo en CR — Datos SUGESE 2025-2026')}
        {abierto.tend && <div style={{padding:'0 18px 16px',borderTop:'1px solid #E2E8F0'}}>
          {(tendencias[tipoSeguro]||[]).map((t,i) => <div key={i} style={{padding:'10px 0',borderBottom:'1px solid #F1F5F9',fontSize:'13px',color:'#334155',lineHeight:'1.5'}}>{t}</div>)}
          <div style={{marginTop:'10px',fontSize:'11px',color:'#94A3B8',fontStyle:'italic'}}>Fuente: SUGESE 2025-2026. Actualizar mensualmente.</div>
        </div>}
      </div>
      {nombres.map(n => {
        const d = datosAseg[n]; if (!d) return null;
        const k = `a_${n}`;
        const excl = (tipoSeguro==='autos'?d.exclA:d.exclH)||[];
        return (
          <div key={n} style={{background:'white',borderRadius:'12px',border:'1px solid #E2E8F0',marginBottom:'10px',overflow:'hidden'}}>
            {hdr(k,'🏢',`${n} — Análisis técnico y exclusiones críticas`)}
            {abierto[k] && <div style={{padding:'0 18px 16px',borderTop:'1px solid #E2E8F0'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginTop:'12px',marginBottom:'8px'}}>
                <div style={{background:'#F0F9FF',borderRadius:'8px',padding:'12px',border:'1px solid #BAE6FD'}}>
                  <div style={{fontSize:'10px',fontWeight:'700',color:'#0369A1',textTransform:'uppercase',marginBottom:'6px'}}>Calificación financiera</div>
                  <div style={{fontSize:'12px',color:'#0F172A',lineHeight:'1.4'}}>{d.cal}</div>
                </div>
                <div style={{background:'#F0FDF4',borderRadius:'8px',padding:'12px',border:'1px solid #BBF7D0'}}>
                  <div style={{fontSize:'10px',fontWeight:'700',color:'#166534',textTransform:'uppercase',marginBottom:'6px'}}>Participación mercado CR</div>
                  <div style={{fontSize:'12px',color:'#0F172A',lineHeight:'1.4'}}>{d.part}</div>
                </div>
              </div>
              {row('✅ Fortaleza clave para argumentar la venta',d.fort,'#F8FAFC','#E2E8F0','#059669')}
              {row('⚠️ Consideración técnica importante',d.cons,'#FFFBEB','#FDE68A','#92400E')}
              {excl.length>0 && <div style={{background:'#FFF1F2',borderRadius:'8px',padding:'12px',border:'1px solid #FECDD3'}}>
                <div style={{fontSize:'10px',fontWeight:'700',color:'#9F1239',textTransform:'uppercase',marginBottom:'8px'}}>🚨 Exclusiones críticas — Advertir siempre al cliente</div>
                {excl.map((e,i) => <div key={i} style={{display:'flex',gap:'8px',marginBottom:'6px',fontSize:'12px',color:'#334155',lineHeight:'1.4'}}><span style={{color:'#E11D48',flexShrink:0}}>•</span><span>{e}</span></div>)}
              </div>}
              <div style={{marginTop:'10px',fontSize:'10px',color:'#94A3B8',fontStyle:'italic'}}>Fuente: SUGESE, Moody's Local CR, Fitch Ratings, AM Best 2025-2026.</div>
            </div>}
          </div>
        );
      })}
    </div>
  );
};
const generarPDF = async (cotizaciones, cliente, tipoSeguro) => {
  const { default: jsPDF } = await import('jspdf');
  const { default: html2canvas } = await import('html2canvas');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210; const margin = 14;
  let y = 15;

  const fmtN = (n, moneda) => {
    if (!n && n!==0) return '-';
    if (isNaN(Number(n))) return '-';
    const num = Number(n).toLocaleString('es-CR');
    if ((moneda||'').toLowerCase().includes('usd')) return `$${num}`;
    return `CRC ${num}`;
  };

  const tipoNombre = {autos:'Seguro de Autos', incendio_hogar:'Incendio Hogar', incendio_comercial:'Incendio Comercial', todo_riesgo:'Todo Riesgo'};

  // HEADER NOA
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 28, 'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(18); doc.setFont('helvetica','bold');
  doc.text('NOA Comparativos', margin, 12);
  doc.setFontSize(9); doc.setFont('helvetica','normal');
  doc.text('IA profunda aplicada a seguros | SolucionesTVB', margin, 19);
  doc.setFontSize(8);
  doc.text(`${tipoNombre[tipoSeguro]||'Comparativo'} | ${new Date().toLocaleDateString('es-CR')} | Vigencia 30 dias`, margin, 25);
  y = 36;

  // INFO CLIENTE
  if (cliente?.nombre || cliente?.vehiculo) {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin-2, y-4, W-margin*2+4, 16, 'F');
    doc.setTextColor(15,23,42); doc.setFontSize(10); doc.setFont('helvetica','bold');
    doc.text('Preparado para:', margin, y+2);
    doc.setFont('helvetica','normal');
    if (cliente?.nombre) doc.text(cliente.nombre, margin+32, y+2);
    if (cliente?.vehiculo) { doc.setFontSize(9); doc.text(`Vehiculo: ${cliente.vehiculo}`, margin, y+9); }
    y += 22;
  }

  // TABLA COMPARATIVA
  doc.setFillColor(15,23,42);
  doc.rect(margin-2, y-4, W-margin*2+4, 8, 'F');
  doc.setTextColor(255,255,255); doc.setFontSize(9); doc.setFont('helvetica','bold');
  doc.text('COMPARATIVO DE PLANES', margin, y+1);
  y += 10;

  cotizaciones.forEach((c, i) => {
    if (y > 260) { doc.addPage(); y = 15; }
    
    // Card header
    const colores = {assa:[5,46,22], ins:[23,37,84], mnk:[30,27,75], default:[15,23,42]};
    const asegLower = (c.aseguradora||'').toLowerCase();
    const col = asegLower.includes('assa')?colores.assa:asegLower.includes('ins')?colores.ins:asegLower.includes('mnk')?colores.mnk:colores.default;
    
    doc.setFillColor(col[0],col[1],col[2]);
    doc.rect(margin-2, y-3, W-margin*2+4, 10, 'F');
    doc.setTextColor(255,255,255); doc.setFontSize(10); doc.setFont('helvetica','bold');
    doc.text(`${i===0?'★ ':''} ${c.aseguradora}${c.plan?` — ${c.plan}`:''}`, margin, y+4);
    doc.setFontSize(8); doc.setFont('helvetica','normal');
    doc.text(`Score NOA: ${c.score}/100`, W-margin-30, y+4);
    y += 13;

    // Metricas
    doc.setTextColor(100,116,139); doc.setFontSize(7); doc.setFont('helvetica','bold');
    doc.text('PRIMA ANUAL', margin, y);
    const rcMonto = c.coberturas?.rc_personas_por_accidente||c.coberturas?.responsabilidad_civil_lesiones||c.responsabilidad_civil||0;
    const esLUCpdf = rcMonto>0 && (c.coberturas?.rc_danos_terceros||0)===rcMonto;
    doc.text(esLUCpdf?'RC LIMITE UNICO (LUC)':'RC PERSONAS', margin+55, y);
    if (c.valor_vehiculo) doc.text('VALOR VEHICULO', margin+115, y);
    y += 4;
    doc.setTextColor(15,23,42); doc.setFontSize(10); doc.setFont('helvetica','bold');
    doc.text(fmtN(c.prima,c.moneda), margin, y);
    doc.text(fmtN(rcMonto,c.moneda), margin+55, y);
    if (c.valor_vehiculo) doc.text(fmtN(c.valor_vehiculo,c.moneda), margin+115, y);
    y += 4;
    doc.setTextColor(100,116,139); doc.setFontSize(8); doc.setFont('helvetica','normal');
    doc.text(`${fmtN(c.mensual,c.moneda)}/mes`, margin, y);
    y += 5;

    // Coberturas incluidas
    doc.setTextColor(100,116,139); doc.setFontSize(7); doc.setFont('helvetica','bold');
    doc.text('COBERTURAS INCLUIDAS:', margin, y); y += 4;
    const cobNames = {colision_vuelco:'Colision y vuelco', robo_total:'Robo y hurto', cristales:'Cristales', muerte_accidental:'Muerte accidental', gastos_legales:'Gastos legales', rc_alcohol:'RC Alcohol', multiasistencia:'Multiasistencia', exencion_deducible:'Exencion deducible', riesgos_adicionales:'Riesgos adicionales'};
    const cobs = c.coberturas||{};
    const incluidas = Object.entries(cobNames).filter(([k])=>cobs[k]).map(([,v])=>v);
    doc.setTextColor(22,163,74); doc.setFontSize(8); doc.setFont('helvetica','normal');
    const cobsStr = incluidas.join('  |  ');
    const cobLines = doc.splitTextToSize(cobsStr, W-margin*2);
    doc.text(cobLines, margin, y); y += cobLines.length*4 + 2;

    // Análisis IA
    if (c.analisis_ia?.recomendacion) {
      if (y > 255) { doc.addPage(); y = 15; }
      doc.setTextColor(30,64,175); doc.setFontSize(7); doc.setFont('helvetica','bold');
      doc.text('Criterio tecnico NOA:', margin, y); y += 4;
      doc.setFont('helvetica','normal'); doc.setTextColor(51,65,85);
      const recRaw = (c.analisis_ia.recomendacion||'').replace(/[\u00a1\u2762]/g,'').replace(/¡/g,'').replace(/¢/g,'CRC ').replace(/₡/g,'CRC ');
      const recTexto = recRaw.length > 380 ? (recRaw.lastIndexOf('. ', 380) > 100 ? recRaw.substring(0, recRaw.lastIndexOf('. ', 380)+1) : recRaw.substring(0,380)) : recRaw;
      const lines = doc.splitTextToSize(recTexto, W-margin*2);
      lines.forEach(line => {
        if (y > 270) { doc.addPage(); y = 15; }
        doc.text(line, margin, y); y += 3.5;
      });
      y += 2;
    }

    // Separador
    doc.setDrawColor(226,232,240);
    if (y > 270) { doc.addPage(); y = 15; }
    doc.line(margin, y, W-margin, y); y += 6;
  });

  // TENDENCIAS DEL RAMO
  if (y > 240) { doc.addPage(); y = 15; }
  const tendenciasPDF = {
    autos: ["Mercado de autos crecio 10% en primas en CR 2024 (SUGESE)","Mayor litigiosidad en RC — verificar siempre Gastos Legales con el cliente","RC Alcohol y Asistencia 24/7 son diferenciadores clave al vender","Verificar que el valor del vehiculo este actualizado — depreciacion afecta indemnizaciones"],
    incendio_hogar: ["Incendio es el 4to ramo con mayor primaje en CR (SUGESE 2025)","Clientes con hipoteca estan obligados contractualmente a asegurar","Inflacion en construccion — actualizar suma asegurada anualmente","Inventario de bienes actualizado es clave para validar reclamos de robo"],
    incendio_comercial: ["Seguros comerciales en crecimiento sostenido post-pandemia","Bancos exigen incendio como requisito para creditos — oportunidad de venta","Pymes son el segmento con mayor crecimiento en demanda","Sin inventario actualizado los reclamos se complican significativamente"],
    todo_riesgo: ["Todo riesgo en crecimiento para equipos tecnologicos y maquinaria","Demanda creciente en empresas con activos moviles de alto valor","Ideal para construccion, transporte de equipos y tecnologia","Mayor detalle en inventarios requerido — fundamental para reclamos"],
  };
  const tItems = tendenciasPDF[tipoSeguro]||[];
  if (tItems.length>0) {
    doc.setFillColor(15,23,42);
    doc.rect(margin-2, y-3, W-margin*2+4, 8, 'F');
    doc.setTextColor(255,255,255); doc.setFontSize(9); doc.setFont('helvetica','bold');
    doc.text('Tendencias del ramo en CR - Datos SUGESE 2025-2026', margin, y+2);
    y += 10;
    tItems.forEach((t,i) => {
      if (y > 265) { doc.addPage(); y = 15; }
      doc.setTextColor(51,65,85); doc.setFontSize(8); doc.setFont('helvetica','normal');
      const lines = doc.splitTextToSize(`${i+1}. ${t}`, W-margin*2-5);
      doc.text(lines, margin, y);
      y += lines.length*4 + 2;
    });
    doc.setTextColor(148,163,184); doc.setFontSize(7);
    doc.text('Fuente: SUGESE 2025-2026. Actualizar mensualmente.', margin, y+2);
    y += 8;
  }

  // FOOTER
  if (y > 250) { doc.addPage(); y = 15; }
  doc.setFillColor(241,245,249);
  doc.rect(0, 277, W, 20, 'F');
  doc.setTextColor(100,116,139); doc.setFontSize(7); doc.setFont('helvetica','normal');
  doc.text('NOA Comparativos | SolucionesTVB | IA profunda aplicada a seguros', margin, 284);
  doc.text('Este documento es confidencial y fue generado para uso exclusivo del asegurado.', margin, 289);
  doc.text(`Generado el ${new Date().toLocaleDateString('es-CR')}`, margin, 294);

  doc.save(`NOA-Comparativo-${tipoSeguro}-${new Date().toISOString().slice(0,10)}.pdf`);
};

export default function App() {
  const savedCliente = (() => { const _c = localStorage.getItem('noa_corredor')||'TVB'; try { return JSON.parse(localStorage.getItem(`${_c}_noa_cliente`)||'null'); } catch { return null; } })();
  const [tipoSeguro, setTipoSeguro] = useState(localStorage.getItem('noa_tipo_seguro') || 'autos');
  // Cargar cotizaciones desde Firebase al iniciar
  const cargarDesdeFirebase = async (tipo) => {
    try {
      const snap = await getDocs(collection(db, 'cotizaciones'));
      const docs = snap.docs.map(d=>({...d.data(),_id:d.id}))
        .filter(d=>d.tipo===tipo && (esAdmin || d.corredor===corredor))
        .sort((a,b)=>{ const fa=a.fecha?.seconds||0; const fb=b.fecha?.seconds||0; return fb-fa; });
      if (docs.length>0) {
        const data = docs[0];
        if (data.cotizaciones && data.cotizaciones.length > 0) {
          setCotizaciones(data.cotizaciones);
          setMejor(data.cotizaciones[0]);
          if (data.cliente) setCliente(data.cliente);
          localStorage.setItem(lsKey(`noa_cots_${tipo}`), JSON.stringify(data.cotizaciones));
          localStorage.setItem(lsKey('noa_cliente'), JSON.stringify(data.cliente||{}));
          setTab('comparativo');
          showToast('✅ Cotizaciones cargadas desde la nube');
        }
      } else {
        showToast('No hay cotizaciones guardadas para este tipo','error');
      }
    } catch(e) { console.error('Error cargando Firebase:', e); showToast('Error cargando desde la nube','error'); }
  };

  const _co = localStorage.getItem('noa_corredor')||'TVB';
  const lsKey = (k) => `${_co}_${k}`;
  const getCotsPorTipo = (tipo) => { try { return JSON.parse(localStorage.getItem(lsKey(`noa_cots_${tipo}`))||'null'); } catch { return null; } };
  const tipoInicial = localStorage.getItem(lsKey('noa_tipo_seguro')) || 'autos';
  const savedCots = getCotsPorTipo(tipoInicial);
  const [tab, setTab] = useState(savedCots ? 'comparativo' : 'subir');
  const [archivos, setArchivos] = useState([]);
  const [cotizaciones, setCotizaciones] = useState(savedCots || []);
  const [mejor, setMejor] = useState(savedCots ? savedCots[0] : null);
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [mensajeProceso, setMensajeProceso] = useState('');
  const [planAssa, setPlanAssa] = useState('Platino');
  const CORREDORES = [{id:'TVB',nombre:'Tony Villalobos',admin:true},{id:'Hermann',nombre:'Hermann',admin:false}];
  const [corredor, setCorredor] = useState(() => localStorage.getItem('noa_corredor') || null);
  const seleccionarCorredor = (id) => { localStorage.setItem('noa_corredor',id); setCorredor(id); };
  const esAdmin = corredor === 'TVB';
  const [chatMensajes, setChatMensajes] = useState([{rol:'noa',texto:'Hola, soy el Asesor NOA. Conocés las cotizaciones en pantalla y puedo ayudarte con preguntas sobre coberturas, exclusiones, uso del vehículo, comparaciones y más. ¿En qué te ayudo?'}]);
  const [chatInput, setChatInput] = useState('');
  const [chatCargando, setChatCargando] = useState(false);

  const [toast, setToast] = useState(null);
  const [expandido, setExpandido] = useState({});
  const toggleExpandido = (i) => setExpandido(prev => ({...prev, [i]: !prev[i]}));
  const [verRecomendacion, setVerRecomendacion] = useState(false);
  const [verComparativo, setVerComparativo] = useState(false);
  const [cliente, setCliente] = useState(savedCliente || { nombre:'', cedula:'', telefono:'', email:'', marca:'', modelo:'', ano:'', placa:'', valorComercial:'' });

  const showToast = (msg, tipo='ok') => { setToast({msg,tipo}); setTimeout(() => setToast(null), 4000); };

  const webAseguradora = (aseguradora) => {
    const a = (aseguradora||'').toLowerCase();
    if (a.includes('assa')) return 'https://www.assanet.cr';
    if (a.includes('ins')||a.includes('nacional')) return 'https://www.ins-cr.com';
    if (a.includes('mnk')) return 'https://mnkseguros.com';
    if (a.includes('qualitas')) return 'https://www.qualitas.co.cr';
    if (a.includes('lafise')) return 'https://www.lafise.com/slcr';
    if (a.includes('mapfre')) return 'https://www.mapfre.cr';
    if (a.includes('davivienda')) return 'https://www.davivienda.cr/seguros';
    return null;
  };
  const codigoSUGESE = (aseguradora) => {
    const a = (aseguradora||'').toLowerCase();
    if (tipoSeguro==='autos') {
      if (a.includes('assa')) return 'G01-01-A05-207';
      if (a.includes('ins')||a.includes('nacional')) return 'G01-01-A01-012';
      if (a.includes('mnk')) return 'G01-01-A13-506';
      if (a.includes('qualitas')) return 'G01-01-A09-241';
      if (a.includes('mapfre')) return 'G01-01-A03-1087';
      if (a.includes('lafise')) return 'G01-01-A14-569';
    }
    if (tipoSeguro==='incendio_hogar') {
      if (a.includes('assa')) return 'G06-70-A05-522';
      if (a.includes('ins')||a.includes('nacional')) return 'G06-44-A01-142';
      if (a.includes('mnk')) return 'G06-44-A13-443';
      if (a.includes('mapfre')) return 'G06-44-A03-278';
      if (a.includes('lafise')) return 'G06-70-A14-547';
      if (a.includes('davivienda')) return 'G06-44-A08-369';
    }
    if (tipoSeguro==='incendio_comercial') {
      if (a.includes('assa')) return 'G06-69-A05-774';
      if (a.includes('ins')||a.includes('nacional')) return 'G06-69-A01-795';
      if (a.includes('mnk')) return 'G06-44-A13-455';
      if (a.includes('mapfre')) return 'G06-44-A03-304';
      if (a.includes('lafise')) return 'G06-69-A14-603';
      if (a.includes('davivienda')) return 'G06-69-A08-902';
    }
    if (tipoSeguro==='todo_riesgo') {
      if (a.includes('assa')) return 'G06-44-A05-186';
      if (a.includes('ins')||a.includes('nacional')) return 'G06-44-A01-048';
      if (a.includes('mnk')) return 'G06-44-A13-453';
      if (a.includes('mapfre')) return 'G06-44-A03-382';
      if (a.includes('lafise')) return 'G06-69-A14-634';
    }
    return null;
  };

  const CLAUDE_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const procesarUnPDF = async (archivo) => {
    const contenido = await toBase64(archivo);
    const basePrompt = `MONEDA CRITICO: El campo moneda DEBE ser exactamente "USD" si los precios estan en dolares (simbolo $), o exactamente "CRC" si estan en colones (simbolo). NUNCA escribas "Dolares", "Colones" ni ninguna otra palabra. SOLO "USD" o "CRC".`;
    const promptsPorTipo = {
      autos: `Sos un experto corredor de seguros en Costa Rica con 20 años de experiencia. Analiza este PDF de SEGURO DE AUTOS. ${basePrompt}

ESTRUCTURA DE PDFs POR ASEGURADORA:
ASSA: 3 planes (Platino/Dorado/Economico). Coberturas: Lesiones corporales por persona Y accidente, Daños a terceros, Asistencia medica, Comprensivo (robo/hurto), Colision o vuelco. Pagina 2: beneficios incluidos (muerte accidental, gastos funerarios, robo articulos, alquiler auto). GENERA SOLO 1 JSON — el plan: ${planAssa}. Ignorá los otros planes.
INS: Codigos 17A=RC Lesion/Muerte, 17B=Serv.Medic, 17C=RC Daños Propiedad, 17D=Colision/Vuelco, 17E=Gastos Legales, 17F=Robo/Hurto, 17H=Riesgos Adicionales, 17M=Multiasistencia, 17N=Exencion Deducible, IDD=Indemnizacion Deducible. GENERA 1 JSON.
MNK: TABLA 1-COBERTURAS: CHECK=SI INCLUYE, RAYA=NO INCLUYE. TABLA 2-DEDUCIBLES: solo incluye coberturas que tenian CHECK en tabla 1. A3=RC LUC (personas+bienes juntos), B=Atencion Medica, C=RC Alcohol, DA=Perdidas Parciales, DB=Perdidas Totales, G1=Multiasistencia, D=Colision/Vuelco, F=Robo/Hurto, H=Riesgos Adicionales. GENERA 1 JSON.
Qualitas: Estructura de coberturas: Item 1=Daños Materiales (=colision_vuelco), Item 1.1=Rotura Cristales (=cristales), Item 2=Robo Total, Item 3.1=RC Personas Alcohol, Item 3.2=RC Bienes Alcohol, Item 3.3=Responsabilidad Civil Complementaria (=RC Personas principal — captura este monto en rc_personas_por_persona Y rc_personas_por_accidente), Item 4=Gastos Legales, Item 5=Gastos Medicos Ocupantes (=asistencia_medica), Item 10=BIS RC Daños Ocupantes, Item 13=Robo Parcial, Item 15=Asistencia Vial. RC Daños Terceros usa el monto de RC Bienes (Item 3.2). GENERA 1 JSON.

REGLAS CRITICAS:
1. Prima: TOTAL ANUAL con IVA. Rango 150000-1500000 colones.
2. valor_vehiculo: OBLIGATORIO. ASSA="Valor del auto", INS="Valor Asegurado", MNK="Suma asegurada".
3. RC: captura por_persona Y por_accidente. Para LUC de MNK (codigo A3): el monto LUC va en rc_personas_por_persona, rc_personas_por_accidente Y rc_danos_terceros — los tres campos con el MISMO monto. NUNCA dejes rc_personas_por_persona o rc_personas_por_accidente en 0 si hay LUC.
4. Deducibles: captura CADA cobertura individual. MNK: RAYA en deducibles = Sin deducible (si tenia CHECK). NUNCA escribas Pecado deducible ni ninguna variacion — si no hay deducible escribe EXACTAMENTE las palabras Sin deducible.
5. exencion_deducible: SOLO true para INS con cobertura 17N. ASSA y MNK siempre false.
6. ASSA genera 3 JSONs. INS y MNK: 1 JSON cada uno.
7. analisis_ia OBLIGATORIO: DEBES incluir EXACTAMENTE estos campos en analisis_ia — sin excepcion:
   - recomendacion: por que este plan si o no para este vehiculo especifico
   - fortalezas: array con montos reales del PDF
   - debilidades: array con impacto real en colones
   - brecha_proteccion: que riesgo queda desprotegido y cuanto podria costar en CR
   - alerta_corredor: UNA sola advertencia critica que el corredor debe decirle al cliente
   - perfil_si: para quien SI es ideal este plan con razon concreta
   - perfil_no: para quien NO es este plan con razon concreta
   - vs_mercado: como se compara vs estandar del mercado CR para este tipo de vehiculo
   - precio_valor: numero 1-10
   - puntuacion_cobertura: numero 1-10
   - puntuacion_servicio: numero 1-10

[{
  "aseguradora":"nombre exacto",
  "plan":"nombre del plan o null",
  "prima_anual":numero con IVA,
  "prima_mensual":numero,
  "moneda":"CRC o USD",
  "valor_vehiculo":numero OBLIGATORIO,
  "base_indemnizacion":"valor real o declarado o reposicion",
  "coberturas":{
    "colision_vuelco":true/false,
    "robo_total":true/false,
    "riesgos_adicionales":true/false,
    "cristales":true/false,
    "muerte_accidental":true/false,
    "gastos_legales":true/false,
    "rc_alcohol":true/false,
    "multiasistencia":true/false,
    "exencion_deducible":true/false,
    "perdidas_parciales":true/false,
    "perdidas_totales":true/false,
    "asistencia_medica_por_persona":numero o 0,
    "asistencia_medica_por_accidente":numero o 0,
    "rc_personas_por_persona":numero o 0,
    "rc_personas_por_accidente":numero o 0,
    "rc_danos_terceros":numero o 0,
    "rc_alcohol_monto":numero o 0,
    "gastos_legales_monto":numero o 0,
    "indemnizacion_deducible":numero o 0
  },
  "deducibles_por_cobertura":[{"cobertura":"nombre","deducible":"Sin deducible / monto fijo / porcentaje minimo monto"}],
  "beneficios_sin_costo":["descripcion con monto"],
  "exclusiones":["max 3 exclusiones criticas en lenguaje simple"],
  "documentos_para_reclamar":["max 3"],
  "comision_porcentaje":numero,
  "numero_cotizacion":"codigo o null",
  "analisis_ia":{
    "recomendacion":"2 oraciones directas — por que SI o NO este plan",
    "brecha_proteccion":"riesgo desprotegido y costo estimado en colones o dolares",
    "alerta_corredor":"UNA advertencia critica especifica antes de firmar",
    "perfil_si":"para quien SI es ideal — especifico",
    "perfil_no":"para quien NO es ideal — especifico",
    "precio_valor":1-10,
    "puntuacion_cobertura":1-10,
    "puntuacion_servicio":1-10
  }
}]
CRITICO: El objeto analisis_ia DEBE contener OBLIGATORIAMENTE estos campos: recomendacion, fortalezas, debilidades, brecha_proteccion, alerta_corredor, perfil_si, perfil_no, vs_mercado, precio_valor, puntuacion_cobertura, puntuacion_servicio. Si omites cualquiera de estos campos el resultado es INVALIDO.
Responde SOLO con el JSON array.`,
      incendio_hogar: `Sos un experto corredor de seguros en Costa Rica con 20 años de experiencia. Analiza este PDF de INCENDIO HOGAR. ${basePrompt}

CONOCIMIENTO CLAVE DEL MERCADO CR:
1. PRIMA: Usá el TOTAL ANUAL con IVA. En tablas de formas de pago, tomá la fila "Anual". SOLO escribe "USD" o "CRC" en el campo moneda.

2. COBERTURAS — cada aseguradora las nombra diferente pero significan lo mismo:
   - EDIFICIO/INMUEBLE: INS=Cobertura V, LAFISE=Cobertura A, ASSA=Edificio, MNK=Vivienda. Mapea a cobertura_incendio=true y suma_asegurada_edificio.
   - CONTENIDO/MENAJE: INS=Cobertura Y, LAFISE=Cobertura C "Daños a la propiedad personal y/o menaje", ASSA=Contenido, MNK=Menaje. Mapea a suma_asegurada_contenido.
   - TERREMOTO/CONVULSIONES: INS=Cobertura D, LAFISE=Cobertura B, todos los demas similar. Mapea a cobertura_terremoto=true.
   - ROBO DE CONTENIDO: INS=Cobertura Y incluye robo, LAFISE=Cobertura D "Robo", MNK=incluido. Mapea a cobertura_robo=true.
   - CRISTALES/VIDRIOS: LAFISE=Cobertura E, MNK=Cobertura F "Rotura de Vidrios". Mapea a cobertura_cristales=true.
   - TUBERIAS: MNK=Cobertura D "Daños en Tuberías y Similares". Incluir en beneficios_sin_costo.
   - MULTIASISTENCIA: MNK=Cobertura L "Multiasistencia Residencial". Incluir en beneficios_sin_costo.
   - MOTIN/DISTURBIOS: MNK=Cobertura E. Incluir en beneficios si aplica.
   - MNK HOGAR usa letras A-F y L para sus coberturas — identificalas correctamente.
   - HURACAN/INUNDACION: generalmente incluido en cobertura basica. Mapea a cobertura_huracan y cobertura_inundacion.

3. DEDUCIBLES tienen nombres diferentes pero significan lo mismo:
   - INS llama "Participacion del Asegurado en la Perdida" al deducible. 0.00000% = SIN DEDUCIBLE.
   - MNK muestra deducible por cobertura: A (no catastróficas) y B (catastróficas).
   - LAFISE y otros muestran deducible por cobertura con porcentaje o monto fijo.
   - Normaliza SIEMPRE al campo deducibles_por_riesgo con lenguaje simple para el cliente.

4. BENEFICIOS EXTRA sin costo tienen nombres diferentes:
   - INS: "Extension de cobertura sin cargo adicional" (remocion escombros, gastos alquiler, etc.)
   - MNK: "Beneficios y Asistencias Basicos" F1-F5 (condominio, compra protegida, odontologia, multiasistencia)
   - LAFISE: Asistencia en el Hogar, Remocion de Escombros incluidos
   - Normaliza SIEMPRE al campo beneficios_sin_costo con descripcion simple.

5. BIENES: cada bien (VIVIENDA/EDIFICIO y MENAJE/CONTENIDO) tiene su propia suma asegurada. SIEMPRE captura ambos por separado.
6. BASE VALORACION: "Reposicion" = pagan para comprar nuevo. "Real" = valor depreciado.
7. Si ves solo una suma asegurada total sin desglose, ponla en suma_asegurada_edificio y deja suma_asegurada_contenido en 0.

Retorna UN array JSON:
[{
  "aseguradora":"nombre oficial",
  "plan":"nombre exacto",
  "moneda":"USD o CRC",
  "prima_anual":numero TOTAL con IVA,
  "suma_asegurada_edificio":numero,
  "suma_asegurada_contenido":numero,
  "suma_asegurada_total":numero,
  "base_valoracion":"Reposicion o Valor Real",
  "cobertura_incendio":true,
  "cobertura_terremoto":true/false,
  "cobertura_huracan":true/false,
  "cobertura_inundacion":true/false,
  "cobertura_robo":true/false,
  "cobertura_cristales":true/false,
  "cobertura_multiasistencia":true/false,
  "cobertura_tuberias":true/false,
  "deducibles_por_riesgo":[{
    "riesgo":"Incendio / Huracan / Inundacion / Robo / Catastrofico / No catastrofico / etc",
    "deducible":"Sin deducible / $1000 fijo / 1% minimo $1000 / 10% minimo $100"
  }],
  "beneficios_sin_costo":["descripcion corta. Ej: Remocion de escombros hasta 5% / Gastos alquiler 1% por 6 meses / Odontologia basica / Multiasistencia hogar / Compra protegida"],
  "responsabilidad_civil":numero o 0,
  "base_indemnizacion":"valor de reposicion o valor real",
  "exclusiones":["max 3 exclusiones en lenguaje simple"],
  "documentos_para_reclamar":["max 3 documentos"],
  "numero_cotizacion":"codigo",
  "vigencia":"periodo",
  "analisis_ia":{
    "recomendacion":"2 oraciones directas sobre este plan de hogar",
    "brecha_proteccion":"riesgo desprotegido y costo estimado",
    "alerta_corredor":"UNA advertencia critica antes de firmar",
    "perfil_si":"para quien SI es ideal",
    "perfil_no":"para quien NO es ideal",
    "precio_valor":1-10,
    "puntuacion_cobertura":1-10,
    "puntuacion_servicio":1-10
  },
  "comision_porcentaje":numero
}]
Responde SOLO con el array JSON.`,
      incendio_comercial: `Sos un experto corredor de seguros en Costa Rica con 20 años de experiencia. Analiza este PDF de INCENDIO COMERCIAL. ${basePrompt}

CONOCIMIENTO CLAVE INCENDIO COMERCIAL CR:
1. PRIMA: SUMA todas las coberturas/rubros para prima_anual TOTAL con IVA incluido.
2. RUBROS ASEGURADOS — en comercial los bienes se dividen asi:
   - Edificio/Estructura: el inmueble fisico
   - Mercaderia/Inventario: productos, repuestos, existencias para venta
   - Maquinaria/Equipo: equipos de produccion o trabajo
   - Mobiliario/Contenido: muebles y equipo de oficina
   Captura cada rubro por separado en su campo correspondiente.
3. COBERTURAS — cada aseguradora las nombra diferente:
   - INS: A=Incendio/Rayo, B=Riesgos Varios, C=Inundacion/Deslizamiento/Vientos, D=Convulsiones Naturaleza, G=Lluvia/Derrame
   - LAFISE: A1=Daño directo, B1=Riesgos naturaleza, C1=Inundacion/deslizamiento/vientos, D1=Riesgos diversos, E1=Lluvia/derrame
   - ASSA/MNK: estructura similar con letras propias
   Identifica el riesgo cubierto sin importar la letra que use la aseguradora.
4. DEDUCIBLES: captura por cobertura con descripcion clara en lenguaje simple.
5. BASE INDEMNIZACION: "Valor de Reposicion" si menor o igual a 15 anos, "Valor Real Efectivo" si mayor a 15 anos.

Retorna UN array JSON:
[{
  "aseguradora":"nombre oficial",
  "plan":"nombre del plan",
  "moneda":"USD o CRC",
  "prima_anual":numero TOTAL con IVA,
  "suma_asegurada_total":numero,
  "suma_asegurada_edificio":numero o 0,
  "suma_asegurada_mercaderia":numero o 0,
  "suma_asegurada_maquinaria":numero o 0,
  "suma_asegurada_mobiliario":numero o 0,
  "base_indemnizacion":"Valor de Reposicion o Valor Real Efectivo",
  "cobertura_incendio":true/false,
  "cobertura_terremoto":true/false,
  "cobertura_huracan":true/false,
  "cobertura_inundacion":true/false,
  "cobertura_robo":true/false,
  "cobertura_lluvia_derrame":true/false,
  "perdida_beneficios":true/false,
  "responsabilidad_civil":numero o 0,
  "coberturas_detalle":[{"codigo":"letra","descripcion":"nombre claro","prima":numero,"deducible":"descripcion simple"}],
  "deducibles_por_riesgo":[{"riesgo":"nombre","deducible":"descripcion simple"}],
  "exclusiones":["max 3 exclusiones criticas en lenguaje simple"],
  "documentos_para_reclamar":["max 3 documentos"],
  "beneficios_sin_costo":["clausulas adicionales sin costo extra"],
  "comision_porcentaje":numero,
  "numero_cotizacion":"codigo",
  "vigencia":"periodo",
  "analisis_ia":{
    "recomendacion":"2 oraciones directas sobre este plan comercial",
    "brecha_proteccion":"riesgo desprotegido y costo estimado",
    "alerta_corredor":"UNA advertencia critica antes de firmar",
    "perfil_si":"para que negocio SI es ideal",
    "perfil_no":"para que negocio NO es ideal",
    "precio_valor":1-10,
    "puntuacion_cobertura":1-10,
    "puntuacion_servicio":1-10
  }
}]
Responde SOLO con el array JSON.`,
      todo_riesgo: `Sos un experto corredor de seguros en Costa Rica con 20 años de experiencia. Analiza este PDF de SEGURO TODO RIESGO COMERCIAL o MULTIRIESGO. ${basePrompt}

CONOCIMIENTO CLAVE TODO RIESGO / MULTIRIESGO CR:
1. PRIMA: usa el TOTAL ANUAL con IVA incluido.
2. Este seguro cubre TODOS LOS RIESGOS excepto los expresamente excluidos — es diferente a incendio que cubre riesgos nombrados.
3. COBERTURAS PRINCIPALES que pueden aparecer:
   - Riesgos catastróficos: terremoto, erupción volcánica, tsunami, inundación catastrófica
   - Riesgos no catastróficos: incendio, robo, vandalismo, daños por agua, viento, lluvia
   - Lucro cesante / Pérdida de beneficios: cubre pérdida de ingresos durante reparación
   - Pérdida de rentas: para propiedades arrendadas
   - Responsabilidad civil: daños a terceros
4. RUBROS ASEGURADOS — captura cada uno por separado:
   - Edificio/Estructura
   - Maquinaria y equipo
   - Mobiliario y contenido
   - Mercadería e inventario
5. SUBLÍMITES: extensiones de cobertura con montos máximos — captúralos en beneficios_sin_costo
6. DEDUCIBLES: generalmente separados para riesgos catastróficos y no catastróficos
7. BASE INDEMNIZACION: Valor de Reposición (hasta cierta antigüedad) o Valor Real Efectivo

Retorna UN array JSON:
[{
  "aseguradora":"nombre oficial",
  "plan":"nombre del plan",
  "moneda":"USD o CRC",
  "prima_anual":numero TOTAL con IVA,
  "suma_asegurada_total":numero,
  "suma_asegurada_edificio":numero o 0,
  "suma_asegurada_maquinaria":numero o 0,
  "suma_asegurada_mobiliario":numero o 0,
  "suma_asegurada_mercaderia":numero o 0,
  "base_indemnizacion":"Valor de Reposicion o Valor Real Efectivo",
  "cobertura_incendio":true/false,
  "cobertura_terremoto":true/false,
  "cobertura_huracan":true/false,
  "cobertura_inundacion":true/false,
  "cobertura_robo":true/false,
  "perdida_beneficios":true/false,
  "responsabilidad_civil":numero o 0,
  "deducibles_por_riesgo":[{
    "riesgo":"Riesgos catastróficos / Riesgos no catastróficos / nombre especifico",
    "deducible":"descripcion simple — ej: 3% minimo $5,000 / Fijo $2,500 por evento"
  }],
  "beneficios_sin_costo":["sublimites y extensiones incluidas — ej: Rotura de cristales hasta $250,000 / Gastos de remocion de escombros hasta $300,000"],
  "exclusiones":["max 3 exclusiones criticas en lenguaje simple"],
  "documentos_para_reclamar":["max 3 documentos"],
  "comision_porcentaje":numero,
  "numero_cotizacion":"codigo",
  "vigencia":"periodo",
  "analisis_ia":{
    "recomendacion":"2 oraciones directas sobre este plan",
    "brecha_proteccion":"riesgo desprotegido y costo estimado",
    "alerta_corredor":"UNA advertencia critica antes de firmar",
    "perfil_si":"para que negocio SI es ideal",
    "perfil_no":"para que negocio NO es ideal",
    "precio_valor":1-10,
    "puntuacion_cobertura":1-10,
    "puntuacion_servicio":1-10
  }
}]
Responde SOLO con el array JSON.`
    };
    const prompt = promptsPorTipo[tipoSeguro] || `Sos un experto corredor de seguros vehiculares en Costa Rica. Analiza este PDF. ${basePrompt}
REGLAS CRITICAS:
1. Prima: usa el IMPORTE TOTAL con IVA (13%) incluido. Rango razonable: 150000-1500000 colones.
2. CRISTALES: Si hay cobertura comprensiva o colision, cristales=true SIEMPRE.
3. RC PERSONAS: Muchos PDFs muestran DOS montos: "por persona" Y "por accidente". Captura AMBOS separados.
4. COBERTURAS: Extrae TODAS las coberturas que aparezcan en el PDF, no solo las principales.
5. ALCOHOL: Si hay cobertura de RC bajo efectos de alcohol, incluyela en coberturas_adicionales.

[{
  "aseguradora":"nombre exacto","plan":"nombre o null",
  "prima_anual":numero,"prima_mensual":numero,
  "deducible":numero,
  "base_indemnizacion":"valor real o valor de reposicion",
  "coberturas":{
    "colision_vuelco":true/false,
    "robo_total":true/false,
    "robo_parcial":true/false,
    "cristales":true/false,
    "grua":true/false,
    "vehiculo_reemplazo":true/false,
    "muerte_accidental":true/false,
    "asistencia_vial":true/false,
    "gastos_medicos_ocupantes":numero o 0,
    "rc_personas_por_persona":numero (monto por persona, ej: 100000000),
    "rc_personas_por_accidente":numero (monto por accidente, ej: 200000000),
    "rc_danos_terceros":numero (daños a bienes de terceros),
    "asistencia_medica_por_persona":numero o 0,
    "asistencia_medica_por_accidente":numero o 0,
    "responsabilidad_civil_lesiones":numero (igual a rc_personas_por_accidente si no hay desglose),
    "responsabilidad_civil_danos":numero (igual a rc_danos_terceros)
  },
  "coberturas_adicionales":["lista de coberturas extra: RC alcohol, proteccion legal, etc con sus montos"],
  "exclusiones":["max 3 exclusiones en lenguaje simple para el cliente"],
  "beneficios_destacados":["lista de beneficios destacados"],
  "comision_porcentaje":numero,
  "numero_cotizacion":"numero o null",
  "analisis_ia":{
    "fortalezas":["2-3 puntos fuertes reales"],
    "debilidades":["2-3 limitaciones reales"],
    "perfil_ideal":"texto",
    "precio_valor":1-10,
    "puntuacion_cobertura":1-10,
    "puntuacion_servicio":1-10,
    "recomendacion":"2-3 oraciones profesionales"
  }
}]
Responde SOLO con el JSON array.`;
    // LLAMADA 1 — Haiku extrae datos duros del PDF
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json','x-api-key':CLAUDE_KEY,
        'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true' },
      body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:8192,
        messages:[{ role:'user', content:[
          { type:'document', source:{ type:'base64', media_type:'application/pdf', data:contenido } },
          { type:'text', text:prompt }
        ]}]
      })
    });
    const aiData = await response.json();
    if (!aiData.content||!aiData.content[0]) { console.error('ERROR HAIKU:', JSON.stringify(aiData)); throw new Error('Sin respuesta de IA'); }
    let texto = aiData.content[0].text.trim().replace(/```json/g,'').replace(/```/g,'').trim();
    const datosBase = JSON.parse(texto);

    // LLAMADA 2 — Sonnet analiza profundo basado en datos reales
    const promptSonnet = `Sos un experto corredor de seguros en Costa Rica con 20 años de experiencia y conocimiento profundo del mercado. Analiza estos datos REALES extraidos de una cotizacion de seguro de autos y genera un analisis profesional profundo.

DATOS REALES DE LA COTIZACION:
${JSON.stringify(Array.isArray(datosBase) ? datosBase : [datosBase], null, 2)}

CONTEXTO REAL DEL MERCADO DE SEGUROS CR 2025-2026:
PRIMAS TIPICAS AUTOS CR (con IVA):
- Vehiculo hasta 5 anos: 3.5%-5.5% del valor comercial anual
- Vehiculo 6-10 anos: 4%-6% del valor comercial anual
- Vehiculo mas de 10 anos: 5%-7% del valor comercial anual

RC PERSONAS — ESTANDAR MINIMO CR:
- Por persona: RC legal minimo COSEVI es bajo — mercado privado ofrece C50M-C200M/persona
- Por accidente: C100M-C400M es el rango competitivo del mercado privado
- Sentencias judiciales CR por lesiones graves: C30M-C150M tipico, casos complejos C200M+
- Sentencias por muerte en accidente: C80M-C300M segun dependientes economicos

RC DANOS TERCEROS — ESTANDAR CR:
- Mercado privado: C50M-C150M tipico para vehiculos personales
- Accidentes en zonas urbanas San Jose pueden superar C50M en infraestructura

EXCLUSIONES CRITICAS MAS COMUNES EN CR:
- Conducir bajo efectos de alcohol o drogas (si no tiene cobertura RC alcohol)
- Vehiculo con mas de 5 anos: perdida beneficio taxi aeropuerto en ASSA
- Infraseguro: si valor declarado es menor al valor real de mercado, aplica regla proporcional
- Caminos no pavimentados o lastrados: algunos planes excluyen danos en esas condiciones
- Conductor sin licencia vigente o con puntos insuficientes

COSTOS REALES DE SINIESTROS EN CR:
- Reparacion colision menor (golpe): C150,000-C500,000
- Reparacion colision moderada: C500,000-C2,000,000
- Perdida total vehiculo C6M-C10M: reposicion real C7M-C12M en mercado actual
- Hospitalizacion privada por accidente: C500,000-C5,000,000 por evento
- Honorarios abogado defensa penal: C300,000-C2,000,000 por proceso

REGLAS CRITICAS — SIN EXCEPCION:
1. Usa SOLO los datos reales que ves arriba — NUNCA inventes coberturas, montos o caracteristicas que no esten en los datos
2. Si una cobertura esta en los datos como true/false o tiene monto, usala exactamente
3. Si algo no esta en los datos, NO lo menciones
4. Compara entre los planes usando SOLO los montos reales que ves
5. El analisis debe ser util para un corredor profesional — especifico, con numeros reales, accionable

Para CADA plan en los datos genera un analisis_ia con estos campos OBLIGATORIOS:
- recomendacion: 2-3 oraciones directas basadas en datos reales — por que este plan si o no
- fortalezas: array de 2-4 puntos fuertes CON MONTOS REALES del JSON
- debilidades: array de 2-3 limitaciones reales CON IMPACTO en colones reales
- brecha_proteccion: que riesgo real queda desprotegido segun los datos — con costo estimado real en CR
- alerta_corredor: UNA advertencia critica especifica y accionable basada en datos reales
- perfil_si: para quien SI es ideal con razon concreta basada en coberturas reales
- perfil_no: para quien NO es con razon concreta basada en limitaciones reales
- vs_mercado: como se compara vs estandar CR para este tipo de vehiculo y precio
- precio_valor: numero 1-10
- puntuacion_cobertura: numero 1-10
- puntuacion_servicio: numero 1-10

Responde SOLO con un JSON array donde cada objeto tiene: "aseguradora", "plan" (igual a los datos originales), y "analisis_ia" con todos los campos anteriores.`;

    const responseSonnet = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json','x-api-key':CLAUDE_KEY,
        'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true' },
      body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:8192,
        messages:[{ role:'user', content: promptSonnet }]
      })
    });
    const sonnetData = await responseSonnet.json();
    if (!sonnetData.content||!sonnetData.content[0]) { console.error('ERROR SONNET:', JSON.stringify(sonnetData)); }
    else {
      try {
        let textoSonnet = sonnetData.content[0].text.trim().replace(/```json/g,'').replace(/```/g,'').trim();
        textoSonnet = textoSonnet.replace(/¡/g,'₡').replace(/¢/g,'₡');
        const analisis = JSON.parse(textoSonnet);
        // Inyectar analisis_ia de Sonnet en cada plan de Haiku
        const base = Array.isArray(datosBase) ? datosBase : [datosBase];
        analisis.forEach(a => {
          const match = base.find(b =>
            (b.aseguradora||'').toLowerCase()===( a.aseguradora||'').toLowerCase() &&
            (b.plan||'').toLowerCase()===(a.plan||'').toLowerCase()
          );
          if (match) match.analisis_ia = a.analisis_ia;
        });
      } catch(e) { console.error('Error parseando Sonnet:', e); }
    }

    return datosBase;
  };

  const normalizarCotizacion = (c) => {
    const m = quitarTildes((c.moneda||'').toLowerCase());
    const plan = quitarTildes((c.plan||'').toLowerCase());
    const aseg = (c.aseguradora||'').toLowerCase();
    let moneda = 'CRC';
    if (m.includes('usd')||m.includes('dol')||m==='$') moneda = 'USD';
    else if (plan.includes('$')||plan.includes('dol')||plan.includes('usd')) moneda = 'USD';
    else if (aseg.includes('$')) moneda = 'USD';
    else { const v = c.prima_anual||c.prima||0; if (v>0&&v<50000) moneda='USD'; }
    return {
      ...c,
      prima: c.prima_anual||c.prima||0,
      moneda,
      mensual: c.prima_mensual||Math.round((c.prima_anual||c.prima||0)/12),
      comPct: c.comision_porcentaje||15,
      comision: Math.round((c.prima_anual||c.prima||0)*(c.comision_porcentaje||15)/100),
      ref: c.numero_cotizacion||'#REF',
      score: c.analisis_ia ? Math.round(((c.analisis_ia.precio_valor||c.analisis_ia.puntuacion_precio_valor||5)+(c.analisis_ia.cobertura_score||c.analisis_ia.puntuacion_cobertura||5)+(c.analisis_ia.servicio_score||c.analisis_ia.puntuacion_servicio||5))/3*10) : 50,
    };
  };

  const enviarChat = async () => {
    if (!chatInput.trim() || chatCargando) return;
    const pregunta = chatInput.trim();
    setChatInput('');
    setChatMensajes(prev => [...prev, {rol:'corredor',texto:pregunta}]);
    setChatCargando(true);
    try {
      const contexto = cotizaciones.length > 0 ? JSON.stringify(cotizaciones.map(c => ({
        aseguradora: c.aseguradora, plan: c.plan, prima: c.prima, moneda: c.moneda,
        coberturas: c.coberturas, deducibles_por_cobertura: c.deducibles_por_cobertura,
        exclusiones: c.exclusiones, analisis_ia: c.analisis_ia
      })), null, 2) : 'No hay cotizaciones cargadas aún.';
      const sistemaPrompt = `Sos el Asesor NOA — un experto corredor de seguros en Costa Rica con 20 años de experiencia. Respondés preguntas de corredores de seguros de forma directa, clara y profesional.

COTIZACIONES ACTUALES EN PANTALLA:
${contexto}

CONOCIMIENTO CRITICO — SEGUROS AUTOS CR:
USO VEHICULAR Y ASEGURABILIDAD:
- Taxi y servicio público: NO se puede asegurar como vehículo personal. Requiere póliza de servicio público. Si el corredor lo asegura como personal el reclamo será rechazado.
- Uber/DiDi/CABIFY: zona gris legal en CR. La mayoría de aseguradoras lo excluyen expresamente si se detecta uso para transporte remunerado. Verificar condiciones generales de cada aseguradora.
- Uso mixto personal/trabajo (vendedor, visitas a clientes): generalmente cubierto como uso personal. NO aplica si se cobra por el transporte.
- Vehículo de empresa asegurado a nombre personal: riesgo de rechazo si el accidente ocurre en horas de trabajo. Recomendar asegurarlo a nombre de la empresa.

EXCLUSIONES CRITICAS MAS COMUNES EN CR:
- Conducir bajo efectos de alcohol o drogas (sin cobertura RC alcohol específica)
- Conductor sin licencia vigente o con puntos insuficientes
- Vehículo con modificaciones no declaradas (lift, cambio de motor, etc.)
- Uso comercial no declarado (taxi, delivery, transporte remunerado)
- Daños en competencias o pruebas de velocidad
- Deducible por colisión: si el costo del daño es menor al deducible, el asegurado paga todo
- Infraseguro: si el valor declarado es menor al valor real, aplica regla proporcional en siniestros parciales
- Vehículos con más de cierta antigüedad pueden tener restricciones en cobertura comprensiva

CONDICIONES GENERALES POR ASEGURADORA:
ASSA: Base de indemnización "valor real" puede significar depreciación según tablas propias. Beneficio taxi aeropuerto excluido para vehículos con más de 5 años. RC alcohol disponible como endoso.
INS: Descuento por experiencia hasta -45% para historial limpio. Código 17N = exención de deducible disponible. Base "valor declarado" — verificar que coincida con mercado real.
MNK: LUC (límite único combinado) para RC — mismo monto cubre personas y bienes. Sin cobertura de RC alcohol en plan estándar. Deducible mínimo en colisión.
Qualitas: Especializado en autos. "Daños Materiales" incluye cristales. RC Complementaria como exceso. Sin cobertura de hogar o comercial.
LAFISE: Cobertura estándar competitiva. Verificar extensión geográfica (Centroamérica).
Mapfre: Planes modulares. Verificar qué coberturas están incluidas vs opcionales en cada plan.

MERCADO CR 2025-2026:
- Prima típica: 3.5%-7% del valor comercial según antigüedad y aseguradora
- RC mínimo legal COSEVI: muy bajo — el mercado privado ofrece C50M-C400M/accidente
- Sentencias judiciales CR por muerte: C80M-C300M típico
- Todos los precios incluyen IVA 13%

Respondé siempre en español. Sé directo y específico. Si la pregunta es sobre las cotizaciones en pantalla, usá los datos reales. Si no hay cotizaciones cargadas, respondé con conocimiento general del mercado CR. Nunca inventés datos que no estén en las cotizaciones.

CODIGOS OFICIALES SUGESE — CONDICIONES GENERALES (actualizado 12/04/2026):
AUTOS:
- INS: G01-01-A01-012 (Seguro Voluntario de Automóviles)
- ASSA: G01-01-A05-207 (Colones) / G01-01-A05-208 (Dólares)
- MNK: G01-01-A13-506 (Protección Total Vial)
- Qualitas: G01-01-A09-241 (Seguro de Automóviles)
- LAFISE: G01-01-A14-569 (Individual Colones) / G01-01-A14-572 (Individual Dólares)
- Mapfre: G01-01-A03-1087 (Mapfre 303)
- Davivienda: G01-01-A08-1079

INCENDIO HOGAR:
- INS: G06-44-A01-142 (Hogar Comprensivo)
- ASSA: G06-70-A05-522 (Colones) / G06-70-A05-523 (Dólares)
- MNK: G06-44-A13-443 (Colones) / G06-44-A13-444 (Dólares)
- LAFISE: G06-70-A14-547 (Colones) / G06-70-A14-548 (Dólares)
- Mapfre: G06-44-A03-278 (Hogar Total)
- Davivienda: G06-44-A08-369

INCENDIO COMERCIAL:
- INS: G06-69-A01-795 (Multirriesgos)
- ASSA: G06-69-A05-774 (Assa Pack)
- MNK: G06-44-A13-455 (Colones) / G06-44-A13-456 (Dólares)
- LAFISE: G06-69-A14-603 (Colones) / G06-69-A14-559 (Dólares)
- Mapfre: G06-44-A03-304 (Multirriesgo Empresa)
- Davivienda: G06-69-A08-902

TODO RIESGO:
- INS: G06-44-A01-048
- ASSA: G06-44-A05-186 (Colones) / G06-44-A05-187 (Dólares)
- MNK: G06-44-A13-453 (Colones) / G06-44-A13-454 (Dólares)
- LAFISE: G06-69-A14-634 (Colones) / G06-69-A14-560 (Dólares)
- Mapfre: G06-44-A03-382
- Davivienda: G06-69-A08-823

Cuando cités condiciones generales de una aseguradora, siempre incluí el código SUGESE correspondiente. Al final de cada respuesta agregá siempre una línea con la fuente en este formato exacto: 'Fuente: [indicá si es Condiciones Generales de la aseguradora / Reglamento SUGESE / Código de Tránsito CR / Ley Reguladora del Mercado de Seguros / Cotizaciones en pantalla / Conocimiento del mercado CR]'`;

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {'Content-Type':'application/json','x-api-key':CLAUDE_KEY,
          'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 1024,
          system: sistemaPrompt,
          messages: chatMensajes.filter(m=>m.rol!=='noa').map(m=>({
            role: m.rol==='corredor'?'user':'assistant',
            content: m.texto
          })).concat([{role:'user',content:pregunta}])
        })
      });
      const data = await resp.json();
      const respuesta = data.content?.[0]?.text || 'No pude procesar la respuesta.';
      setChatMensajes(prev => [...prev, {rol:'noa',texto:respuesta}]);
    } catch(e) {
      setChatMensajes(prev => [...prev, {rol:'noa',texto:'Error al conectar con el asesor. Intentá de nuevo.'}]);
    }
    setChatCargando(false);
  };

  const procesar = async () => {
    if (archivos.length===0) { showToast('Seleccioná al menos un PDF','error'); return; }
    setProcesando(true); setProgreso(0); setMensajeProceso('');
    const intervalo = null;
    const todasCotizaciones = [];
    // Paralelo
    const resultados = await Promise.allSettled(archivos.map(a => procesarUnPDF(a)));
    setProgreso(archivos.length);
    resultados.forEach((r,i) => {
      if (r.status==='fulfilled') {
        const arr = Array.isArray(r.value)?r.value:[r.value];
        todasCotizaciones.push(...arr.map(normalizarCotizacion));
      } else {
        console.error('Error procesando',archivos[i].name,r.reason);
        showToast(`\u26a0\ufe0f Error leyendo ${archivos[i].name}`,'error');
      }
    });
    if (todasCotizaciones.length>0) {
      const res = todasCotizaciones.sort((a,b)=>b.score-a.score);
      setCotizaciones(res); setMejor(res[0]);
      localStorage.setItem(lsKey(`noa_cots_${tipoSeguro}`),JSON.stringify(res));
      // Guardar en Firebase
      try {
        await addDoc(collection(db, 'cotizaciones'), {
          tipo: tipoSeguro,
          corredor: corredor||'TVB',
          cliente: cliente,
          cotizaciones: res,
          fecha: serverTimestamp()
        });
      } catch(e) { console.error('Firebase error:', e); }
      localStorage.setItem(lsKey('noa_tipo_seguro'),tipoSeguro);
      localStorage.setItem(lsKey('noa_cliente'),JSON.stringify(cliente));
      showToast(`\u2705 ${res.length} plan(es) analizados con IA`);
    } else { showToast('No se pudo procesar ningún PDF','error'); }
    clearInterval(intervalo); setProcesando(false); setMensajeProceso(''); setTab('comparativo');
  };

  const limpiar = () => {
    setArchivos([]); setCotizaciones([]); setMejor(null); setProgreso(0);
    setCliente({nombre:'',cedula:'',telefono:'',email:'',marca:'',modelo:'',ano:'',placa:'',valorComercial:''});
    setTab('subir');
    localStorage.removeItem(lsKey(`noa_cots_${tipoSeguro}`)); localStorage.removeItem(lsKey('noa_cliente')); localStorage.removeItem(lsKey('noa_tipo_seguro'));
    setTipoSeguro('autos');
  };

  const whatsapp = () => {
    if (!mejor) return;
    const tel = cliente.telefono.replace(/\D/g,'');
    const tipo = tipoSeguro==='autos'?'Vehicular':tipoSeguro==='incendio_hogar'?'Hogar':tipoSeguro==='incendio_comercial'?'Comercial':'Todo Riesgo';
    const msg = `\ud83d\udee1\ufe0f *Cotizaci\u00f3n de Seguro ${tipo} - NOA*\n\nEstimado/a ${cliente.nombre||'Cliente'},\n\n\ud83c\udfc6 Mejor opci\u00f3n: *${mejor.aseguradora}*\n\ud83d\udcb0 Prima anual: ${fmtC(mejor.prima,mejor.moneda)}\n\ud83d\udcc5 Pago mensual: ${fmtC(mejor.mensual,mejor.moneda)}\n\u2705 Score NOA: ${mejor.score}/100\n\n_Cotizaci\u00f3n v\u00e1lida 30 d\u00edas | SUGESE Lic 01-2030_`;
    window.open(`https://wa.me/506${tel}?text=${encodeURIComponent(msg)}`,'_blank');
  };

  const tabs = [
    {id:'subir',label:'📋 Subir'},
    {id:'cliente',label:'📝 Cliente'},
    {id:'comparativo',label:'📊 Comparativo'},
    {id:'reporte',label:'📄 Reporte'},
    {id:'asesor',label:'🤖 Asesor NOA'},
  ];

  const tipos = [
    {id:'autos',label:'🚗 Autos'},
    {id:'incendio_hogar',label:'🏠 Incendio Hogar'},
    {id:'incendio_comercial',label:'🏢 Incendio Comercial'},
    {id:'todo_riesgo',label:'🛡️ Todo Riesgo'},
  ];

  const s = {
    app: { fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", minHeight:'100vh', background:'#F1F5F9' },
    // HEADER
    hdr: { background:'#0A1628', padding:'14px 28px', display:'flex', alignItems:'center', justifyContent:'space-between' },
    logo: { display:'flex', alignItems:'center', gap:'12px' },
    mark: { width:'40px', height:'40px', background:'#1D4ED8', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', color:'white', fontSize:'16px' },
    brandName: { color:'white', fontSize:'18px', fontWeight:'800', letterSpacing:'-0.3px' },
    brandSub: { color:'#475569', fontSize:'10px', marginTop:'1px' },
    sugese: { background:'#0F2444', color:'#60A5FA', border:'1px solid #1E3A5F', fontSize:'10px', padding:'5px 12px', borderRadius:'20px', fontWeight:'600' },
    btnNew: { background:'#2563EB', color:'white', border:'none', padding:'9px 18px', borderRadius:'8px', fontSize:'12px', fontWeight:'700', cursor:'pointer' },
    // NAV
    nav: { background:'#0D1F35', display:'flex', padding:'0 28px', gap:'2px' },
    navItem: (on) => ({ padding:'13px 16px', fontSize:'12px', color: on?'#93C5FD':'#475569', borderBottom: on?'2px solid #3B82F6':'2px solid transparent', cursor:'pointer', fontWeight: on?'600':'500' }),
    // TYPES
    typebar: { background:'#0D1F35', padding:'12px 28px', display:'flex', gap:'8px', borderBottom:'1px solid #1E3A5F', flexWrap:'wrap' },
    typeBtn: (on) => ({ padding:'7px 16px', borderRadius:'8px', fontSize:'12px', fontWeight:'600', cursor:'pointer', border: on?'1.5px solid #60A5FA':'1.5px solid #1E3A5F', background: on?'#1E3A5F':'transparent', color: on?'white':'#93C5FD' }),
    // BODY
    body: { padding:'24px 28px', maxWidth:'1200px', margin:'0 auto' },
    topBar: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' },
    title: { fontSize:'18px', fontWeight:'800', color:'#0F172A' },
    chip: { background:'#EFF6FF', color:'#1D4ED8', fontSize:'11px', fontWeight:'600', padding:'4px 12px', borderRadius:'20px', marginLeft:'10px' },
    waBtn: { background:'#25D366', color:'white', border:'none', padding:'9px 18px', borderRadius:'8px', fontSize:'12px', fontWeight:'700', cursor:'pointer' },
    // CORREDOR CARD
    corCard: (best) => ({ background: best?'#FFFDF5':'white', borderRadius:'12px', border: best?'1.5px solid #F59E0B':'1.5px solid #E2E8F0', padding:'20px 24px', display:'flex', alignItems:'flex-start', gap:'20px', marginBottom:'12px' }),
    corLogo: (color) => ({ width:'50px', height:'50px', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', fontSize:'11px', flexShrink:0, background:color.logo, color:color.text }),
    corName: { fontSize:'15px', fontWeight:'800', color:'#0F172A' },
    corPlan: { fontSize:'11px', color:'#3B82F6', fontWeight:'500', marginTop:'2px' },
    bestTag: { display:'inline-block', background:'#F59E0B', color:'white', fontSize:'9px', fontWeight:'800', padding:'3px 8px', borderRadius:'4px', marginTop:'4px', letterSpacing:'0.5px' },
    metrics: { display:'flex', gap:'24px', marginTop:'12px', flexWrap:'wrap' },
    mLabel: { fontSize:'10px', color:'#94A3B8', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.6px' },
    mVal: { fontSize:'16px', fontWeight:'800', color:'#0F172A', marginTop:'3px' },
    mSub: { fontSize:'10px', color:'#94A3B8', marginTop:'1px' },
    covs: { display:'flex', gap:'6px', flexWrap:'wrap', marginTop:'10px' },
    cov: (ok) => ({ background: ok?'#F0FDF4':'#FEF2F2', color: ok?'#166534':'#991B1B', fontSize:'10px', padding:'3px 8px', borderRadius:'6px', fontWeight:'600', border: ok?'1px solid #BBF7D0':'1px solid #FECACA' }),
    corRight: { display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', flexShrink:0, marginLeft:'auto' },
    comVal: { fontSize:'20px', fontWeight:'800', color:'#16A34A', textAlign:'center' },
    comLbl: { fontSize:'10px', color:'#94A3B8', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.5px', textAlign:'center' },
    aiBox: { background:'#F8FAFF', border:'1px solid #DBEAFE', borderRadius:'10px', padding:'12px 16px', marginTop:'12px', fontSize:'12px', color:'#1E40AF', lineHeight:'1.6' },
    // CLIENTE CARDS
    cliGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'14px', marginTop:'16px' },
    cliCard: (best, color) => ({ background:'#0F172A', borderRadius:'16px', overflow:'hidden', border: best?`1.5px solid ${color.text}55`:'1.5px solid #1E293B' }),
    cliSection: { padding:'14px 20px', borderBottom:'1px solid #1E293B' },
    cliSectionTitle: { fontSize:'10px', color:'#475569', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'10px' },
    cliLogo: (color) => ({ width:'40px', height:'40px', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:'800', background:color.logo, color:color.text, flexShrink:0 }),
    cliRec: (color) => ({ display:'inline-block', background:'#4338CA', color:'#A5B4FC', fontSize:'9px', fontWeight:'800', padding:'3px 8px', borderRadius:'4px', letterSpacing:'0.5px', marginBottom:'10px' }),
    cliName: { fontSize:'15px', fontWeight:'800', color:'#F1F5F9' },
    cliPlan: { fontSize:'11px', color:'#475569', marginTop:'1px' },
    cliPrima: { fontSize:'28px', fontWeight:'800', color:'#F1F5F9' },
    cliPunto: { display:'flex', alignItems:'flex-start', gap:'8px', marginBottom:'6px' },
    cliPuntoIcon: (tipo) => ({ width:'16px', height:'16px', borderRadius:'4px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', flexShrink:0, marginTop:'1px',
      background: tipo==='ok'?'#022C22': tipo==='benefit'?'#1E1B4B': tipo==='warn'?'#3B1414':'#1E293B',
      color: tipo==='ok'?'#34D399': tipo==='benefit'?'#A5B4FC': tipo==='warn'?'#F87171':'#64748B' }),
    cliPuntoTxt: { fontSize:'11px', color:'#94A3B8', lineHeight:'1.5' },
    cliDedRow: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'5px 0', borderBottom:'0.5px solid #1E293B' },
    cliRubroGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', marginTop:'10px' },
    cliRubro: (color) => ({ background:color.logo+'44', borderRadius:'6px', padding:'8px', fontSize:'11px' }),
    // LEGAL
    legal: { background:'#F8FAFF', border:'1px solid #DBEAFE', borderRadius:'10px', padding:'14px 18px', marginTop:'16px', fontSize:'11px', color:'#1E40AF', lineHeight:'1.7' },
    // SECTION HEADER
    sectionHdr: { fontSize:'13px', fontWeight:'700', color:'#64748B', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'16px', paddingBottom:'10px', borderBottom:'1px solid #E2E8F0', marginTop:'28px' },
  };

  const renderCoberturas = (c) => {
    if (tipoSeguro==='autos') {
      const cobs = c.coberturas||{};
      return [
        cobs.colision_vuelco && { label:'Colisión', ok:true },
        cobs.robo_total && { label:'Robo total', ok:true },
        cobs.cristales && { label:'Cristales', ok:true },
        cobs.grua && { label:'Grúa 24/7', ok:true },
        cobs.vehiculo_reemplazo && { label:'Vehículo reemplazo', ok:true },
        cobs.muerte_accidental && { label:'Muerte accidental', ok:true },
        c.coberturas?.desempleo && { label:'Desempleo', ok:true },
        c.coberturas?.diagnostico_cancer && { label:'Cáncer', ok:true },
      ].filter(Boolean);
    }
    return [
      c.cobertura_incendio && { label:'Incendio', ok:true },
      c.cobertura_terremoto && { label:'Terremoto', ok:true },
      c.cobertura_huracan && { label:'Huracán', ok:true },
      c.cobertura_inundacion && { label:'Inundación', ok:true },
      c.cobertura_robo && { label:'Robo', ok:true },
      c.perdida_beneficios && { label:'Pérd. beneficios', ok:true },
    ].filter(Boolean);
  };

  const renderClienteInfo = (c) => {
    const baseInd = c.base_indemnizacion || c.base_valoracion || 'Valor real';
    const baseIndTexto = quitarTildes((baseInd||'').toLowerCase()).includes('repos') ? 'Te pagan para comprar nuevo' : 'Te pagan el valor actual';
    const exclusiones = c.exclusiones || c.exclusiones_importantes || [];
    const docs = c.documentos_para_reclamar || ['Póliza vigente','Fotos y reporte del siniestro','Formulario de la aseguradora'];
    const beneficios = c.beneficios_sin_costo || c.extensiones_sin_costo || c.beneficios_adicionales || c.beneficios_destacados || [];
    const deduciblesDetalle = c.deducibles_por_riesgo || c.deducibles_por_cobertura || [];
    // Coberturas con punto de color
    const dedsLabels = (c.deducibles_por_cobertura||c.deducibles_por_riesgo||[]).map(d=>(d.cobertura||d.riesgo||'').toLowerCase());
      const enDeds = (kws) => kws.some(kw => dedsLabels.some(d=>d.includes(kw)));
      const coberturas = tipoSeguro === 'autos'
      ? [
          {nombre:'Colisión y vuelco', ok:!!c.coberturas?.colision_vuelco||enDeds(['colisi','vuelco','daños directos'])},
          {nombre:'Robo total', ok:!!c.coberturas?.robo_total||enDeds(['robo','hurto'])},
          {nombre:'Cristales', ok:!!c.coberturas?.cristales||enDeds(['cristal','vidrio','rotura'])},
          {nombre:'Muerte accidental', ok:!!c.coberturas?.muerte_accidental||enDeds(['muerte accidental'])},
          {nombre:'Gastos legales', ok:!!c.coberturas?.gastos_legales||enDeds(['gastos legales','legal'])},
          {nombre:'RC Alcohol', ok:!!c.coberturas?.rc_alcohol||enDeds(['alcohol'])},
          {nombre:'Multiasistencia', ok:!!c.coberturas?.multiasistencia||enDeds(['multiasistencia','asistencia vial'])},
          {nombre:'Riesgos adicionales', ok:!!c.coberturas?.riesgos_adicionales||enDeds(['riesgos adicionales','adicional'])||!!(c.coberturas?.robo_total&&(c.aseguradora||'').toLowerCase().includes('assa'))},
          {nombre:'Pérdidas parciales', ok:!!c.coberturas?.perdidas_parciales||enDeds(['parciales'])},
          {nombre:'Pérdidas totales', ok:!!c.coberturas?.perdidas_totales||enDeds(['totales'])},
          {nombre:'Exención deducible', ok:!!c.coberturas?.exencion_deducible||enDeds(['exenci'])},
          {nombre:'Atención médica', ok:!!(c.coberturas?.asistencia_medica_por_accidente||c.coberturas?.asistencia_medica_por_persona)||enDeds(['atenci','medica','funerarios'])},
        ].filter(cob => cob.ok)
      : (() => {
          const deds = (c.deducibles_por_riesgo||c.deducibles_por_cobertura||[]).map(d=>(d.riesgo||d.cobertura||'').toLowerCase());
          const bens = (c.beneficios_sin_costo||[]).join(' ').toLowerCase();
          const enD = (kws) => kws.some(kw => deds.some(d=>d.includes(kw)));
          const enB = (kws) => kws.some(kw => bens.includes(kw));
          return [
            {nombre:'Incendio', ok:!!c.cobertura_incendio},
            {nombre:'Terremoto', ok:!!c.cobertura_terremoto},
            {nombre:'Huracán', ok:!!c.cobertura_huracan||enD(['huracan','viento'])},
            {nombre:'Inundación', ok:!!c.cobertura_inundacion||enD(['inundacion'])},
            {nombre:'Robo de contenido', ok:!!c.cobertura_robo||enD(['robo','hurto'])},
            {nombre:'Cristales / Vidrios', ok:!!(c.cobertura_cristales||c.coberturas?.cristales)||enD(['cristal','vidrio','rotura de vidrio'])},
            {nombre:'Responsabilidad civil', ok:!!(c.responsabilidad_civil>0)},
            {nombre:'Multiasistencia hogar', ok:!!(c.cobertura_multiasistencia||c.multiasistencia)||enD(['multiasistencia'])||enB(['multiasistencia'])},
            {nombre:'Daños en tuberías', ok:!!(c.cobertura_tuberias)||enD(['tuberia','tuber'])},
            {nombre:'Motín / Disturbios', ok:enD(['motin','disturbio','malicioso'])},
          ].filter(cob => cob.ok);
        })();
    // Rubros asegurados
    const rubros = (() => {
      if (tipoSeguro==='autos') {
        const r = [];
        const rcP = c.coberturas?.rc_personas_por_persona||0;
        const rcA = c.coberturas?.rc_personas_por_accidente||c.coberturas?.responsabilidad_civil_lesiones||c.responsabilidad_civil||0;
        const rcD = c.coberturas?.rc_danos_terceros||c.coberturas?.responsabilidad_civil_danos||0;
        const esLUC = rcA>0 && rcD>0 && rcA===rcD;
        if (esLUC) {
          r.push({nombre:'RC Límite Único (LUC)', monto: fmtC(rcA,c.moneda)});
        } else if (rcP>0 && rcA>0) {
          r.push({nombre:'RC /persona', monto: fmtC(rcP,c.moneda)});
          r.push({nombre:'RC /accidente', monto: fmtC(rcA,c.moneda)});
          if (rcD>0) r.push({nombre:'RC Daños Terceros', monto: fmtC(rcD,c.moneda)});
        } else if (rcA>0) {
          r.push({nombre:'RC Personas', monto: fmtC(rcA,c.moneda)});
          if (rcD>0) r.push({nombre:'RC Daños Terceros', monto: fmtC(rcD,c.moneda)});
        } else if (rcD>0) {
          r.push({nombre:'RC Daños Terceros', monto: fmtC(rcD,c.moneda)});
        }
        return r;
      }
      const r = [];
      if (c.suma_asegurada_edificio) r.push({nombre:tipoSeguro==='incendio_hogar'?'Edificio / Vivienda':'Edificio / Estructura', monto: fmtC(c.suma_asegurada_edificio,c.moneda)});
      if (c.suma_asegurada_contenido) r.push({nombre:'Contenido / Menaje', monto: fmtC(c.suma_asegurada_contenido,c.moneda)});
      if (c.suma_asegurada_mercaderia) r.push({nombre:'Mercadería / Inventario', monto: fmtC(c.suma_asegurada_mercaderia,c.moneda)});
      if (c.suma_asegurada_maquinaria) r.push({nombre:'Maquinaria / Equipo', monto: fmtC(c.suma_asegurada_maquinaria,c.moneda)});
      if (c.suma_asegurada_mobiliario) r.push({nombre:'Mobiliario', monto: fmtC(c.suma_asegurada_mobiliario,c.moneda)});
      if (!r.length && c.suma_asegurada_total) r.push({nombre:'Total asegurado', monto: fmtC(c.suma_asegurada_total,c.moneda)});
      return r;
    })();
    // Deducibles en lenguaje simple
    const deducibles = (() => {
      if (deduciblesDetalle.length > 0) {
        return deduciblesDetalle.map(d => ({riesgo: d.riesgo || d.tipo_riesgo || d.cobertura, valor: d.deducible}));
      }
      if (c.deducible_porcentaje_catastrofico > 0) {
        return [
          {riesgo:'Incendio', valor:'Sin deducible'},
          {riesgo:'Huracán / Inundación', valor:`${c.deducible_porcentaje_catastrofico}% mín. ${fmtC(c.deducible_minimo_catastrofico||c.deducible,c.moneda)}`},
        ];
      }
      if (c.deducible_porcentaje > 0) return [{riesgo:'Deducible', valor:`${c.deducible_porcentaje}% mín. ${fmtC(c.deducible,c.moneda)}`}];
      if (c.deducible===0) return [{riesgo:'Deducible', valor:'Sin deducible'}];
      return [{riesgo:'Deducible fijo', valor:fmtC(c.deducible,c.moneda)}];
    })();
    return { baseInd, baseIndTexto, exclusiones, docs, beneficios, coberturas, rubros, deducibles };
  };

  return (
    <div style={s.app}>
      {toast && (
        <div style={{position:'fixed',top:'16px',right:'16px',zIndex:50,padding:'12px 20px',borderRadius:'10px',background:toast.tipo==='error'?'#EF4444':'#10B981',color:'white',fontSize:'13px',fontWeight:'600',boxShadow:'0 4px 20px rgba(0,0,0,0.2)'}}>
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      {/* SELECTOR CORREDOR */}
      {!corredor && (
        <div style={{minHeight:'100vh',background:'#0A1628',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
          <div style={{maxWidth:'400px',width:'100%',textAlign:'center'}}>
            <div style={{width:'64px',height:'64px',background:'#1D4ED8',borderRadius:'16px',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'800',color:'white',fontSize:'28px',margin:'0 auto 20px'}}>N</div>
            <h1 style={{color:'white',fontSize:'24px',fontWeight:'800',marginBottom:'8px'}}>NOA Comparativos</h1>
            <p style={{color:'#60A5FA',fontSize:'14px',marginBottom:'32px'}}>Seleccioná tu perfil para continuar</p>
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              {CORREDORES.map(c => (
                <button key={c.id} onClick={() => seleccionarCorredor(c.id)}
                  style={{width:'100%',padding:'16px 20px',background:'#1E3A5F',border:'1px solid #2563EB',borderRadius:'12px',color:'white',fontSize:'15px',fontWeight:'700',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span>{c.nombre}</span>
                  {c.admin && <span style={{background:'#2563EB',fontSize:'10px',padding:'3px 8px',borderRadius:'4px',fontWeight:'600'}}>Admin</span>}
                </button>
              ))}
            </div>
            <p style={{color:'#475569',fontSize:'11px',marginTop:'24px'}}>SolucionesTVB · NOA v1.0</p>
          </div>
        </div>
      )}
      {corredor && <div id="noa-header" style={s.hdr}>
        <div style={s.logo}>
          <div style={s.mark}>N</div>
          <div>
            <div style={s.brandName}>NOA</div>
            <div style={s.brandSub}>Plataforma de Comparativos de Seguros</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <span style={s.sugese}>SUGESE Lic 01-2030</span>
          <button style={{...s.btnNew, background:'#1E40AF', marginRight:'6px'}} onClick={() => cargarDesdeFirebase(tipoSeguro)}>☁️ Cargar último</button>
          <button style={s.btnNew} onClick={limpiar}>+ Nueva Cotización</button>
          <button onClick={()=>{localStorage.removeItem('noa_corredor');setCorredor(null);}} style={{background:'none',border:'1px solid #1E3A5F',color:'#475569',padding:'6px 10px',borderRadius:'6px',fontSize:'10px',cursor:'pointer',marginLeft:'4px'}}>
            👤 {corredor}
          </button>
        </div>
      </div>}

      {/* NAV */}
      <div id="noa-nav" style={s.nav}>
        {tabs.map(t => (
          <div key={t.id} style={s.navItem(tab===t.id)} onClick={() => setTab(t.id)}>{t.label}</div>
        ))}
      </div>

      {/* TIPOS */}
      <div id="noa-typebar" style={s.typebar}>
        {tipos.map(t => (
          <button key={t.id} style={s.typeBtn(tipoSeguro===t.id)} onClick={() => {
            setTipoSeguro(t.id);
            localStorage.setItem(lsKey('noa_tipo_seguro'),t.id);
            const cots = getCotsPorTipo(t.id);
            setCotizaciones(cots||[]);
            setMejor(cots?cots[0]:null);
            setArchivos([]);
            setTab(cots?'comparativo':'subir');
          }}>{t.label}</button>
        ))}
      </div>

      <div style={s.body}>

        {/* ── SUBIR ── */}
        {tab==='subir' && (() => {
          const infoTipo = {
            autos: { emoji:'🚗', titulo:'Seguro de Autos', aseguradoras:['ASSA','INS','MNK','Qualitas','LAFISE','Mapfre'], extrae:['Prima anual con IVA','Deducibles por cobertura','RC Personas y Bienes','Coberturas especiales (desempleo, cáncer)','Score y recomendación IA'] },
            incendio_hogar: { emoji:'🏠', titulo:'Incendio Hogar', aseguradoras:['INS','MNK','ASSA','LAFISE','Mapfre','Davivienda'], extrae:['Prima anual con IVA','Edificio y Menaje por separado','Deducibles por tipo de riesgo','Beneficios extra sin costo (asistencia, odontología)','Base de indemnización'] },
            incendio_comercial: { emoji:'🏢', titulo:'Incendio Comercial', aseguradoras:['LAFISE','INS','ASSA','MNK','Mapfre'], extrae:['Prima anual con IVA','Coberturas A-E con sus primas','Deducibles por cobertura','Suma asegurada por rubro','Pérdida de beneficios'] },
            todo_riesgo: { emoji:'🛡️', titulo:'Todo Riesgo', aseguradoras:['ASSA','MNK','LAFISE','Mapfre'], extrae:['Prima anual con IVA','Suma asegurada total','Coberturas catastróficas','Deducibles por riesgo','Pérdida de beneficios'] },
          };
          const info = infoTipo[tipoSeguro];
          return (
          <div style={{background:'white',borderRadius:'16px',border:'1px solid #E2E8F0',overflow:'hidden'}}>
            {/* Header del tipo */}
            <div style={{background:'#0A1628',padding:'24px 28px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{fontSize:'13px',color:'#475569',marginBottom:'4px',fontWeight:'500'}}>Procesando cotizaciones de</div>
                <div style={{fontSize:'20px',fontWeight:'800',color:'white'}}>{info.emoji} {info.titulo}</div>
              </div>
              <div style={{display:'flex',gap:'6px',flexWrap:'wrap',justifyContent:'flex-end',maxWidth:'50%'}}>
                {info.aseguradoras.map(a => (
                  <span key={a} onClick={e=>{e.stopPropagation();webAseguradora(a)&&window.open(webAseguradora(a),'_blank');}} style={{background:'#1E3A5F',color:'#93C5FD',fontSize:'10px',fontWeight:'600',padding:'3px 8px',borderRadius:'6px',cursor:webAseguradora(a)?'pointer':'default',transition:'all 0.2s'}} onMouseEnter={e=>{if(webAseguradora(a))e.target.style.background='#2563EB'}} onMouseLeave={e=>e.target.style.background='#1E3A5F'}>{a}</span>
                ))}
              </div>
            </div>
            <div style={{padding:'24px 28px',background:'#0D1F35'}}>
              {/* Zona de drop */}
              <div style={{border:'2px dashed #1E3A5F',borderRadius:'12px',padding:'28px',textAlign:'center',background:'#0A1628',cursor:'pointer',marginBottom:'16px',transition:'all 0.2s'}}
                onClick={() => document.getElementById('fu').click()}>
                <input type="file" accept=".pdf" multiple id="fu" style={{display:'none'}}
                  onChange={e => setArchivos(Array.from(e.target.files).slice(0,5))} />
                <div style={{fontSize:'32px',marginBottom:'8px'}}>📄</div>
                <p style={{color:'#93C5FD',fontWeight:'700',fontSize:'15px',marginBottom:'4px'}}>Arrastrá los PDFs aquí</p>
                <p style={{color:'#475569',fontSize:'12px',marginBottom:'14px'}}>o hacé clic para seleccionar · máximo 5 archivos</p>
                <button style={{padding:'9px 24px',background:'#2563EB',color:'white',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>
                  Seleccionar Archivos
                </button>
              </div>
              {/* Archivos seleccionados */}
              {archivos.length>0 && (
                <div style={{marginBottom:'16px'}}>
                  {archivos.map((f,i) => (
                    <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#1E3A5F',borderRadius:'8px',padding:'10px 14px',marginBottom:'6px',border:'1px solid #2563EB'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'13px',color:'#93C5FD',fontWeight:'500'}}>
                        <FileText size={14}/> {f.name}
                      </div>
                      <button onClick={() => setArchivos(archivos.filter((_,idx)=>idx!==i))} style={{background:'none',border:'none',cursor:'pointer',color:'#94A3B8'}}>
                        <X size={14}/>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {/* Selector plan ASSA */}
              {tipoSeguro==='autos' && archivos.some(f => f.name.toLowerCase().includes('assa')) && (
                <div style={{background:'#0A1628',border:'1px solid #2563EB',borderRadius:'12px',padding:'14px 16px',marginBottom:'16px'}}>
                  <p style={{fontSize:'13px',fontWeight:'700',color:'#93C5FD',marginBottom:'8px'}}>🔶 ASSA detectada — ¿Qué plan querés analizar?</p>
                  <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
                    {['Platino','Dorado','Económico'].map(p => (
                      <button key={p} onClick={() => setPlanAssa(p)} style={{padding:'7px 16px',borderRadius:'8px',border:'2px solid',borderColor:planAssa===p?'#2563EB':'#1E3A5F',background:planAssa===p?'#2563EB':'#0D1F35',color:planAssa===p?'white':'#93C5FD',fontWeight:'700',fontSize:'13px',cursor:'pointer'}}>
                        {p}
                      </button>
                    ))}
                  </div>
                  <p style={{fontSize:'11px',color:'#475569'}}>💡 Mirá la propuesta — si dice Platino, seleccioná Platino</p>
                </div>
              )}
              {/* Botón procesar / spinner */}
              {procesando ? (
                <div style={{textAlign:'center',padding:'28px',background:'linear-gradient(135deg,#0A1628,#1E3A5F)',borderRadius:'16px',border:'1px solid #2563EB'}}>
                  <div style={{display:'flex',gap:'8px',justifyContent:'center',margin:'0 auto 16px'}}><div style={{width:'10px',height:'10px',borderRadius:'50%',background:'#60A5FA',animation:'pulse 1.4s ease-in-out infinite',animationDelay:'0s'}}/><div style={{width:'10px',height:'10px',borderRadius:'50%',background:'#60A5FA',animation:'pulse 1.4s ease-in-out infinite',animationDelay:'0.2s'}}/><div style={{width:'10px',height:'10px',borderRadius:'50%',background:'#60A5FA',animation:'pulse 1.4s ease-in-out infinite',animationDelay:'0.4s'}}/></div>
                  <p style={{fontWeight:'800',color:'white',fontSize:'16px',marginBottom:'8px'}}>Analizando con IA NOA</p>

                  <div style={{background:'#1E3A5F',borderRadius:'8px',height:'8px',marginBottom:'8px'}}>
                    <div style={{background:'linear-gradient(90deg,#2563EB,#60A5FA)',height:'8px',borderRadius:'8px',width:`${Math.max(5,(progreso/Math.max(archivos.length,1))*100)}%`,transition:'width 0.8s ease'}}/>
                  </div>
                  <p style={{fontSize:'11px',color:'#475569'}}>Procesando {archivos.length} PDF(s) en paralelo · No cerrés la página</p>
                </div>
              ) : (
                <button onClick={procesar} style={{width:'100%',padding:'16px',background:'linear-gradient(135deg,#1D4ED8,#2563EB)',color:'white',border:'none',borderRadius:'12px',fontSize:'16px',fontWeight:'800',cursor:'pointer'}}>
                  ✨ Generar Comparativo con IA
                </button>
              )}

            </div>
          </div>
          );
        })()}

        {/* ── CLIENTE ── */}
        {tab==='cliente' && (
          <div style={{background:'white',borderRadius:'16px',border:'1px solid #E2E8F0',padding:'32px'}}>
            <h2 style={{fontSize:'18px',fontWeight:'800',color:'#0F172A',marginBottom:'24px'}}>📝 Datos del Cliente</h2>
            <div style={{marginBottom:'20px'}}>
              <p style={{fontSize:'11px',fontWeight:'700',color:'#94A3B8',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'12px'}}>👤 Información Personal</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                {[['nombre','Nombre completo *','col-span'],['cedula','Cédula'],['telefono','Teléfono *'],['email','Email']].map(([k,l,span]) => (
                  <input key={k} type="text" placeholder={l} value={cliente[k]}
                    onChange={e => setCliente({...cliente,[k]:e.target.value})}
                    style={{padding:'10px 14px',border:'1.5px solid #E2E8F0',borderRadius:'10px',fontSize:'13px',outline:'none',gridColumn:span?'1/-1':'auto'}} />
                ))}
              </div>
            </div>
            <div style={{marginBottom:'24px'}}>
              <p style={{fontSize:'11px',fontWeight:'700',color:'#94A3B8',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'12px'}}>
                {tipoSeguro==='autos'?'🚗 Vehículo':'🏠 Bien Asegurado'}
              </p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                {tipoSeguro==='autos' ? [
                  ['marca','Marca *'],['modelo','Modelo *'],['ano','Año *'],['placa','Placa'],['valorComercial','Valor comercial (\u20a1)']
                ] : [
                  ['marca','Tipo de bien *'],['modelo','Descripción *'],['ano','Año construcción'],['placa','Número de póliza anterior'],['valorComercial','Valor asegurado']
                ].map(([k,l]) => (
                  <input key={k} type="text" placeholder={l} value={cliente[k]}
                    onChange={e => setCliente({...cliente,[k]:e.target.value})}
                    style={{padding:'10px 14px',border:'1.5px solid #E2E8F0',borderRadius:'10px',fontSize:'13px',outline:'none'}} />
                ))}
                {tipoSeguro==='autos' && [['marca','Marca *'],['modelo','Modelo *'],['ano','Año *'],['placa','Placa'],['valorComercial','Valor comercial (\u20a1)']].map(([k,l]) => (
                  <input key={k} type="text" placeholder={l} value={cliente[k]}
                    onChange={e => setCliente({...cliente,[k]:e.target.value})}
                    style={{padding:'10px 14px',border:'1.5px solid #E2E8F0',borderRadius:'10px',fontSize:'13px',outline:'none'}} />
                ))}
              </div>
            </div>
            <button onClick={() => { localStorage.setItem(lsKey('noa_cliente'),JSON.stringify(cliente)); setTab('subir'); showToast('✅ Datos guardados'); }}
              style={{width:'100%',padding:'12px',background:'#2563EB',color:'white',border:'none',borderRadius:'10px',fontSize:'14px',fontWeight:'700',cursor:'pointer'}}>
              ✅ Guardar y continuar
            </button>
          </div>
        )}

        {/* ── COMPARATIVO ── */}
        {tab==='comparativo' && (
          <div>
            {cotizaciones.length===0 ? (
              <div style={{background:'white',borderRadius:'16px',border:'1px solid #E2E8F0',padding:'64px',textAlign:'center'}}>
                <div style={{fontSize:'48px',marginBottom:'12px'}}>📊</div>
                <p style={{color:'#94A3B8',fontWeight:'600'}}>Aún no hay comparativos</p>
                <button onClick={() => setTab('subir')} style={{marginTop:'16px',padding:'10px 24px',background:'#2563EB',color:'white',border:'none',borderRadius:'10px',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>
                  Ir a Subir Cotizaciones
                </button>
              </div>
            ) : (
              <>
                {/* TOP BAR CORREDOR */}
                <div style={s.topBar}>
                  <div>
                    <span style={s.title}>Vista del Corredor</span>
                    <span style={s.chip}>{cotizaciones.length} plan(es)</span>
                  </div>
                  <div style={{display:'flex',gap:'8px'}}>
                    <button onClick={() => generarPDF(cotizaciones, cliente, tipoSeguro)} style={{display:'flex',alignItems:'center',gap:'6px',padding:'9px 16px',background:'#DC2626',color:'white',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>
                      📄 Descargar PDF
                    </button>
                    <button style={s.waBtn} onClick={whatsapp}>📲 WhatsApp al cliente</button>
                  </div>
                </div>

                {/* CORREDOR CARDS - FICHA UNICA */}
                {cotizaciones.map((c,i) => {
                  const color = getColor(c.aseguradora);
                  const scoreColor = c.score>=75?'#F59E0B':c.score>=55?'#3B82F6':'#22C55E';
                  const trackColor = c.score>=75?'#FEF3C7':c.score>=55?'#DBEAFE':'#DCFCE7';
                  const textColor = c.score>=75?'#92400E':c.score>=55?'#1E40AF':'#166534';
                  const datosAseg = {
                    INS: { cal:"AAA (Fitch, Dic 2024) · A- (AM Best, Feb 2025)", part:"65% del total de primas en CR (Jun 2025)", excl:tipoSeguro==='autos'?["Alcohol sin cobertura 17N contratada","Daños mecánicos o por falta de mantenimiento","Vehículo para taxi, Uber o carga no cubierto"]:["Daños por negligencia del asegurado","Robo sin evidencia de fuerza o violencia","Bienes de terceros en la propiedad"] },
                    ASSA: { cal:"AA- (SCR Moody's Local CR, 2024)", part:"Segunda aseguradora en seguros generales de CR", excl:tipoSeguro==='autos'?["Plan Económico: RC Daños solo ₡25M — verificar siempre","Extras no declarados al contratar no cubiertos","Conductor sin licencia vigente al accidente"]:["Objetos de valor no declarados explícitamente","Construcciones no autorizadas en la propiedad","Inundaciones por negligencia en drenajes"] },
                    MNK: { cal:"Calificación SCR no publicada — solicitar EF si el cliente lo requiere", part:"Primer Centro de Servicios propio en CR. En crecimiento.", excl:tipoSeguro==='autos'?["Pérdidas parciales NO incluidas en plan Ahorro","Uso comercial del vehículo asegurado","Daños propios bajo efectos de alcohol"]:["Negligencia o mal mantenimiento del inmueble","Robo sin evidencia de fuerza o violencia","Objetos valiosos no declarados en póliza"] },
                    Qualitas: { cal:"Filial de Quálitas México (empresa pública BMV). Sin calificación CR.", part:"Especializada exclusivamente en autos en CR", excl:["Accesorios no declarados al contratar","Conductor diferente al habitual declarado","Daños mecánicos no relacionados con accidente"] },
                    LAFISE: { cal:"Grupo financiero regional en 9 países. Sin calificación CR publicada.", part:"En crecimiento en CR. Mayor fortaleza en comercial.", excl:tipoSeguro==='autos'?["Vehículos mayores de 10 años pueden tener restricciones","Uso comercial no declarado"]:["Bienes sin inventario actualizado","Construcciones no autorizadas"] },
                  };
                  const nKey = (c.aseguradora||'').toLowerCase().includes('ins')||((c.aseguradora||'').toLowerCase().includes('instituto'))?'INS':(c.aseguradora||'').toLowerCase().includes('assa')?'ASSA':(c.aseguradora||'').toLowerCase().includes('mnk')?'MNK':(c.aseguradora||'').toLowerCase().includes('qualitas')||((c.aseguradora||'').toLowerCase().includes('qu\u00e1litas'))?'Qualitas':(c.aseguradora||'').toLowerCase().includes('lafise')?'LAFISE':null;
                  const intel = nKey ? datosAseg[nKey] : null;
                  const rcPersona = c.coberturas?.rc_personas_por_persona||0;
                  const rcAccidente = c.coberturas?.rc_personas_por_accidente||c.coberturas?.responsabilidad_civil_lesiones||c.responsabilidad_civil||0;
                  const rcDanos = c.coberturas?.rc_danos_terceros||c.coberturas?.responsabilidad_civil_danos||0;
                  const esLUC = rcAccidente>0 && rcDanos>0 && rcAccidente===rcDanos;
                  return (
                    <div key={i} style={{background:i===0?'#FFFDF5':'white',borderRadius:'14px',border:i===0?'1.5px solid #F59E0B':'1.5px solid #E2E8F0',marginBottom:'14px',overflow:'hidden'}}>
                      {/* HEADER */}
                      <div onClick={() => toggleExpandido(i)} style={{display:'flex',alignItems:'center',gap:'16px',padding:'18px 22px',borderBottom:expandido[i]?'1px solid #F1F5F9':'none',cursor:'pointer',userSelect:'none'}}>
                        <div style={s.corLogo(color)}>{getInitials(c.aseguradora)}</div>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                            <div style={s.corName}>{webAseguradora(c.aseguradora) ? <span onClick={e=>{e.stopPropagation();window.open(webAseguradora(c.aseguradora),'_blank');}} style={{cursor:'pointer',borderBottom:'1px dotted #94A3B8'}}>{c.aseguradora}</span> : c.aseguradora}</div>
                            {i===0 && <div style={s.bestTag}>✨ RECOMENDADO IA</div>}
                          </div>
                          {c.plan && <div style={s.corPlan}>{c.plan}</div>}
                          <div style={{fontSize:'11px',color:'#94A3B8',marginTop:'2px'}}>{c.ref} {codigoSUGESE(c.aseguradora) && `· SUGESE: ${codigoSUGESE(c.aseguradora)}`}</div>
                        </div>
                        <div style={{textAlign:'center',minWidth:'80px'}}>
                          <div style={{fontSize:'18px',color:'#94A3B8',marginBottom:'4px'}}>{expandido[i]?'▲':'▼'}</div>
                          <ScoreRing score={c.score} color={scoreColor} trackColor={trackColor} textColor={textColor}/>
                          <div style={{marginTop:'6px'}}>
                            <div style={s.comVal}>{c.comPct}%</div>
                            <div style={s.comLbl}>Comisión</div>
                            <div style={{fontSize:'11px',color:'#94A3B8'}}>{fmtC(c.comision,c.moneda)}</div>
                          </div>
                        </div>
                      </div>

                      {expandido[i] && <>
                      {/* MÉTRICAS FINANCIERAS */}
                      <div style={{display:'flex',gap:'0',borderBottom:'1px solid #F1F5F9',flexWrap:'wrap'}}>
                        {[
                          {l:'Prima anual', v:fmtC(c.prima,c.moneda), s:fmtC(c.mensual,c.moneda)+'/mes'},
                          tipoSeguro==='autos'&&c.valor_vehiculo?{l:'Valor vehículo', v:fmtC(c.valor_vehiculo,c.moneda), s:'Suma asegurada'}:null,
                          esLUC?{l:'RC Límite Único (LUC)', v:fmtC(rcAccidente,c.moneda), s:'Personas + bienes'}:rcAccidente>0&&rcPersona>0&&rcPersona!==rcAccidente?{l:'RC Personas', v:fmtC(rcPersona,c.moneda)+' /persona', s:fmtC(rcAccidente,c.moneda)+' /accidente'}:rcAccidente>0?{l:'RC Personas', v:fmtC(rcAccidente,c.moneda), s:'Por accidente'}:null,
                          !esLUC&&rcDanos>0?{l:'RC Daños Terceros', v:fmtC(rcDanos,c.moneda), s:'Propiedad terceros'}:null,
                          (c.suma_asegurada_edificio||c.suma_asegurada_total)&&tipoSeguro!=='autos'?{l:'Suma asegurada', v:fmtC(c.suma_asegurada_edificio||c.suma_asegurada_total,c.moneda), s:[c.suma_asegurada_contenido>0?`+${fmtC(c.suma_asegurada_contenido,c.moneda)} contenido`:null,c.suma_asegurada_mobiliario>0?`+${fmtC(c.suma_asegurada_mobiliario,c.moneda)} mobiliario`:null,c.suma_asegurada_maquinaria>0?`+${fmtC(c.suma_asegurada_maquinaria,c.moneda)} maquinaria`:null,c.suma_asegurada_mercaderia>0?`+${fmtC(c.suma_asegurada_mercaderia,c.moneda)} mercadería`:null].filter(Boolean).join(' / ')||null}:null,
                        ].filter(Boolean).map((m,j) => (
                          <div key={j} style={{padding:'14px 18px',borderRight:'1px solid #F1F5F9',minWidth:'140px',flex:1}}>
                            <div style={s.mLabel}>{m.l}</div>
                            <div style={{...s.mVal,fontSize:'14px'}}>{m.v}</div>
                            {m.s && <div style={s.mSub}>{m.s}</div>}
                          </div>
                        ))}
                      </div>

                      {/* DEDUCIBLES */}
                      {(c.deducibles_por_cobertura||c.deducibles_por_riesgo||[]).length>0 && (
                        <div style={{padding:'12px 22px',borderBottom:'1px solid #F1F5F9',background:'#FAFAFA'}}>
                          <div style={{fontSize:'10px',fontWeight:'700',color:'#64748B',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'8px'}}>Deducibles por cobertura</div>
                          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:'4px'}}>
                            {(c.deducibles_por_cobertura||c.deducibles_por_riesgo||[]).map((d,j) => {
                              const label = d.cobertura||d.riesgo||d.tipo_riesgo||'';
                              const rawVal = String(d.deducible||'');
                              const val = limpiarDeducible(rawVal.toLowerCase().includes('pecado')||rawVal==='0'?'Sin deducible':rawVal);
                              const esSin = (val||'').toLowerCase().includes('sin');
                              return (
                                <div key={j} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',fontSize:'11px'}}>
                                  <span style={{color:'#64748B'}}>{label}</span>
                                  <span style={{fontWeight:'600',color:esSin?'#16A34A':'#0F172A',marginLeft:'8px'}}>{val}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* CRITERIO IA */}
                      {c.analisis_ia?.alerta_corredor && (
                        <div style={{padding:'10px 22px',borderBottom:'1px solid #F1F5F9',background:'#FFFBEB',display:'flex',alignItems:'flex-start',gap:'8px'}}>
                          <span style={{fontSize:'14px',flexShrink:0}}>⚡</span>
                          <div>
                            <div style={{fontSize:'10px',fontWeight:'700',color:'#92400E',marginBottom:'2px'}}>Alerta antes de firmar</div>
                            <div style={{fontSize:'12px',color:'#78350F',lineHeight:'1.5'}}>{c.analisis_ia.alerta_corredor}</div>
                          </div>
                        </div>
                      )}

                      {/* INTELIGENCIA DE MERCADO */}
                      {intel && (
                        <div style={{padding:'12px 22px',background:'#F8F9FA'}}>
                          <div style={{fontSize:'10px',fontWeight:'700',color:'#64748B',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'8px'}}>🧠 Inteligencia de mercado CR</div>
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                            <div style={{background:'#F0F9FF',borderRadius:'8px',padding:'10px',border:'1px solid #BAE6FD'}}>
                              <div style={{fontSize:'10px',fontWeight:'700',color:'#0369A1',marginBottom:'4px'}}>Calificación financiera</div>
                              <div style={{fontSize:'11px',color:'#0F172A',lineHeight:'1.4'}}>{intel.cal}</div>
                            </div>
                            <div style={{background:'#F0FDF4',borderRadius:'8px',padding:'10px',border:'1px solid #BBF7D0'}}>
                              <div style={{fontSize:'10px',fontWeight:'700',color:'#166534',marginBottom:'4px'}}>Participación mercado CR</div>
                              <div style={{fontSize:'11px',color:'#0F172A',lineHeight:'1.4'}}>{intel.part}</div>
                            </div>
                          </div>

                        </div>
                      )}
                      </>
                      }
                    </div>
                  );
                })}

                {/* TENDENCIAS DEL RAMO */}
                {(() => {
                  const tendencias = {
                    autos: ["📈 Mercado de autos creció 10% en primas en CR 2024 (SUGESE)","⚖️ Mayor litigiosidad en RC — verificar siempre Gastos Legales con el cliente","💡 RC Alcohol y Asistencia 24/7 son diferenciadores clave al vender","⚠️ Verificar que el valor del vehículo esté actualizado — depreciación afecta indemnizaciones"],
                    incendio_hogar: ["📈 Incendio es el 4° ramo con mayor primaje en CR (SUGESE 2025)","🏠 Clientes con hipoteca están obligados contractualmente a asegurar","💡 Inflación en construcción — actualizar suma asegurada anualmente","⚠️ Inventario de bienes actualizado es clave para validar reclamos de robo"],
                    incendio_comercial: ["📈 Seguros comerciales en crecimiento sostenido post-pandemia","🏢 Bancos exigen incendio como requisito para créditos — oportunidad de venta","💡 Pymes son el segmento con mayor crecimiento en demanda","⚠️ Sin inventario actualizado los reclamos se complican significativamente"],
                    todo_riesgo: ["📈 Todo riesgo en crecimiento para equipos tecnológicos y maquinaria","🛡️ Demanda creciente en empresas con activos móviles de alto valor","💡 Ideal para construcción, transporte de equipos y tecnología","⚠️ Mayor detalle en inventarios requerido — fundamental para reclamos"],
                  };
                  const items = tendencias[tipoSeguro]||[];
                  return (
                    <div style={{background:'white',borderRadius:'12px',border:'1px solid #E2E8F0',marginBottom:'14px',overflow:'hidden'}}>
                      <div style={{padding:'14px 20px',borderBottom:'1px solid #F1F5F9',background:'#F8FAFC'}}>
                        <div style={{fontSize:'13px',fontWeight:'700',color:'#0F172A'}}>📊 Tendencias del ramo en CR — Datos SUGESE 2025-2026</div>
                      </div>
                      <div style={{padding:'12px 20px'}}>
                        {items.map((t,i) => <div key={i} style={{padding:'8px 0',borderBottom:i<items.length-1?'1px solid #F1F5F9':'none',fontSize:'13px',color:'#334155',lineHeight:'1.5'}}>{t}</div>)}
                        <div style={{marginTop:'8px',fontSize:'11px',color:'#94A3B8',fontStyle:'italic'}}>Fuente: SUGESE 2025-2026. Actualizar mensualmente.</div>
                      </div>
                    </div>
                  );
                })()}

              </>
            )}
          </div>
        )}

        {/* ── REPORTE ── */}
        {tab==='reporte' && (
          <div>
            {!mejor ? (
              <div style={{background:'white',borderRadius:'16px',border:'1px solid #E2E8F0',padding:'64px',textAlign:'center'}}>
                <div style={{fontSize:'48px',marginBottom:'12px'}}>📄</div>
                <p style={{color:'#94A3B8',fontWeight:'600'}}>Primero generá el comparativo</p>
                <button onClick={() => setTab('subir')} style={{marginTop:'16px',padding:'10px 24px',background:'#2563EB',color:'white',border:'none',borderRadius:'10px',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>Ir a Subir</button>
              </div>
            ) : (
              <>
                <div id='noa-print-hide' style={{display:'flex',gap:'10px',marginBottom:'20px',flexWrap:'wrap'}}>

                  <button onClick={() => { const hide = () => ['noa-header','noa-nav','noa-typebar','noa-print-hide'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='none';}); const show = () => ['noa-header','noa-nav','noa-typebar','noa-print-hide'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='';}); window.addEventListener('beforeprint',hide,{once:true}); window.addEventListener('afterprint',show,{once:true}); hide(); setTimeout(()=>{window.print();},50); }} style={{display:'flex',alignItems:'center',gap:'6px',padding:'9px 18px',background:'#DC2626',color:'white',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>
                    📄 Exportar PDF
                  </button>
                  <button onClick={whatsapp} style={{display:'flex',alignItems:'center',gap:'6px',padding:'9px 18px',background:'#25D366',color:'white',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>
                    <Send size={14}/> WhatsApp
                  </button>
                </div>
                <div style={{background:'white',borderRadius:'16px',border:'1px solid #E2E8F0',padding:'32px'}}>
                  {/* HEADER REPORTE */}
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',borderBottom:'3px solid #1D4ED8',paddingBottom:'20px',marginBottom:'24px'}}>
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px'}}>
                        <div style={{width:'36px',height:'36px',background:'#1D4ED8',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'800',color:'white',fontSize:'14px'}}>N</div>
                        <h1 style={{fontSize:'20px',fontWeight:'800',color:'#1E3A8A'}}>NOA Corredores de Seguros</h1>
                      </div>
                      <p style={{fontSize:'12px',color:'#64748B'}}>Licencia SUGESE: Lic 01-2030 · Intermediario autorizado</p>
                    </div>
                    <div style={{textAlign:'right',fontSize:'12px',color:'#64748B'}}>
                      <p style={{fontWeight:'700',color:'#334155',marginBottom:'2px'}}>Comparativo de Seguros</p>
                      <p>Fecha: {new Date().toLocaleDateString('es-CR')}</p>
                      <p>Vigencia: 30 días naturales</p>
                    </div>
                  </div>
                  {/* CLIENTE Y BIEN */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'24px'}}>
                    <div style={{background:'#F8FAFC',borderRadius:'10px',padding:'16px',border:'1px solid #E2E8F0'}}>
                      <p style={{fontSize:'11px',fontWeight:'700',color:'#94A3B8',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'10px'}}>👤 Cliente</p>
                      {[['Nombre',cliente.nombre],['Cédula',cliente.cedula],['Teléfono',cliente.telefono],['Email',cliente.email]].map(([l,v]) => (
                        <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:'13px',marginBottom:'4px'}}>
                          <span style={{color:'#64748B'}}>{l}:</span>
                          <span style={{fontWeight:'600',color:'#0F172A'}}>{v||'—'}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{background:'#F8FAFC',borderRadius:'10px',padding:'16px',border:'1px solid #E2E8F0'}}>
                      <p style={{fontSize:'11px',fontWeight:'700',color:'#94A3B8',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'10px'}}>{tipoSeguro==='autos'?'🚗 Vehículo':'🏠 Bien Asegurado'}</p>
                      {[['Descripción',`${cliente.marca||'—'} ${cliente.modelo||''}`],['Año',cliente.ano],['Placa/Ref',cliente.placa],['Valor',cliente.valorComercial?fmtC(cliente.valorComercial):'—']].map(([l,v]) => (
                        <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:'13px',marginBottom:'4px'}}>
                          <span style={{color:'#64748B'}}>{l}:</span>
                          <span style={{fontWeight:'600',color:'#0F172A'}}>{v||'—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* RECOMENDACION */}
                  <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:'12px',marginBottom:'24px',overflow:'hidden'}}>
                    <div onClick={() => setVerRecomendacion(!verRecomendacion)} style={{padding:'16px 20px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <h3 style={{fontWeight:'800',color:'#166534',fontSize:'15px',margin:0}}>💡 Recomendación NOA: {mejor.aseguradora}{mejor.plan?` — ${mejor.plan}`:''}</h3>
                      <span style={{color:'#166534',fontSize:'18px'}}>{verRecomendacion?'▲':'▼'}</span>
                    </div>
                    {verRecomendacion && <div style={{padding:'0 20px 20px'}}>
                    <p style={{fontSize:'13px',color:'#334155',marginBottom:'12px',lineHeight:'1.6'}}>{mejor.analisis_ia?.recomendacion||'Mejor relación precio-cobertura del mercado.'}</p>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px'}}>
                      {[['Prima Anual',fmtC(mejor.prima,mejor.moneda)],['Deducible',fmtC(mejor.deducible,mejor.moneda)],['Score NOA',`${mejor.score}/100`]].map(([l,v]) => (
                        <div key={l} style={{background:'white',borderRadius:'8px',padding:'10px',textAlign:'center',border:'1px solid #BBF7D0'}}>
                          <div style={{fontSize:'10px',color:'#64748B',marginBottom:'4px'}}>{l}</div>
                          <div style={{fontWeight:'800',color:'#166534',fontSize:'15px'}}>{v}</div>
                        </div>
                      ))}
                    </div>
                    </div>}
                    {verRecomendacion && <>
                  {/* TARJETAS CLIENTE */}
                  <div style={{marginBottom:'24px',paddingTop:'16px'}}>
                    <h3 style={{fontSize:'12px',fontWeight:'700',color:'#64748B',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'12px'}}>Detalle por aseguradora — Para el cliente</h3>
                    <div style={s.cliGrid}>
                      {cotizaciones.map((c,i) => {
                        const color = getColor(c.aseguradora);
                        const info = renderClienteInfo(c);
                        return (
                          <div key={i} style={s.cliCard(i===0,color)}>
                            <div style={{padding:'20px 20px 16px',borderBottom:'1px solid #1E293B'}}>
                              {i===0 && <div style={s.cliRec(color)}>✨ RECOMENDADO NOA</div>}
                              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                                <div style={s.cliLogo(color)}>{getInitials(c.aseguradora)}</div>
                                <div>
                                  <div style={s.cliName}>{c.aseguradora}</div>
                                  {c.plan && <div style={s.cliPlan}>{c.plan}</div>}
                                </div>
                              </div>
                            </div>
                            <div style={{padding:'16px 20px',borderBottom:'1px solid #1E293B'}}>
                              <div style={{fontSize:'10px',color:'#475569',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:'4px'}}>Pagás al año</div>
                              <div style={s.cliPrima}>{fmtC(c.prima,c.moneda)}</div>
                              <div style={{fontSize:'11px',color:'#475569',marginTop:'4px'}}>{fmtC(c.mensual,c.moneda)} por mes · <strong style={{color:'#E2E8F0'}}>{info.baseInd}</strong> · {info.baseIndTexto}</div>
                            </div>
                            <div style={s.cliSection}>
                              <div style={s.cliSectionTitle}>Coberturas y deducibles</div>
                              {info.rubros.length>0 && (
                                <div style={s.cliRubroGrid}>
                                  {info.rubros.map((r,j) => (
                                    <div key={j} style={s.cliRubro(color)}>
                                      <div style={{color:'#475569',marginBottom:'2px'}}>{r.nombre}</div>
                                      <div style={{color:color.text,fontWeight:'700'}}>{r.monto}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {info.deducibles.length>0 ? (
                                info.deducibles.map((d,j) => (
                                  <div key={j} style={{...s.cliDedRow,borderBottom:j===info.deducibles.length-1?'none':'0.5px solid #1E293B'}}>
                                    <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                                      <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#34D399',flexShrink:0}}/>
                                      <span style={{fontSize:'11px',color:'#94A3B8'}}>{d.riesgo}</span>
                                    </div>
                                    <div style={{fontSize:'11px',fontWeight:'600',color:d.valor==='Sin deducible'?'#34D399':'#E2E8F0',textAlign:'right',maxWidth:'55%'}}>{d.valor}</div>
                                  </div>
                                ))
                              ) : (
                                info.coberturas.filter(cv=>cv.ok).map((cv,j) => (
                                  <div key={j} style={{display:'flex',alignItems:'center',gap:'6px',padding:'4px 0'}}>
                                    <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#34D399',flexShrink:0}}/>
                                    <span style={{fontSize:'11px',color:'#94A3B8'}}>{cv.nombre}</span>
                                  </div>
                                ))
                              )}
                            </div>
                            {info.beneficios.length>0 && (
                              <div style={s.cliSection}>
                                <div style={s.cliSectionTitle}>Beneficios extra sin costo adicional</div>
                                {info.beneficios.map((b,j) => (
                                  <div key={j} style={s.cliPunto}>
                                    <div style={s.cliPuntoIcon('benefit')}>+</div>
                                    <div style={s.cliPuntoTxt}>{b}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {info.exclusiones.length>0 && (
                              <div style={s.cliSection}>
                                <div style={s.cliSectionTitle}>No cubre</div>
                                {info.exclusiones.slice(0,2).map((e,j) => (
                                  <div key={j} style={s.cliPunto}>
                                    <div style={s.cliPuntoIcon('warn')}>!</div>
                                    <div style={s.cliPuntoTxt}>{e}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div style={s.cliSection}>
                              <div style={s.cliSectionTitle}>Para reclamar necesitás</div>
                              {info.docs.slice(0,2).map((d,j) => (
                                <div key={j} style={s.cliPunto}>
                                  <div style={s.cliPuntoIcon('ok')}>✓</div>
                                  <div style={s.cliPuntoTxt}>{d}</div>
                                </div>
                              ))}
                            </div>
                            <div style={{padding:'14px 20px',display:'flex',alignItems:'center',gap:'12px'}}>
                              <div>
                                <div style={{fontSize:'10px',color:'#475569',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>Score NOA</div>
                                <div style={{fontSize:'26px',fontWeight:'800',color:color.text}}>{c.score}</div>
                              </div>
                              <div style={{flex:1}}>
                                <div style={{height:'5px',background:'#1E293B',borderRadius:'3px'}}>
                                  <div style={{height:'5px',borderRadius:'3px',background:color.text,width:`${c.score}%`}}/>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  </>}
                  </div>

                  {/* TABLA */}
                  <div style={{marginBottom:'24px',overflowX:'auto'}}>
                    <div onClick={() => setVerComparativo(!verComparativo)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',marginBottom:'12px'}}>
                      <h3 style={{fontSize:'12px',fontWeight:'700',color:'#64748B',textTransform:'uppercase',letterSpacing:'0.8px',margin:0}}>📊 Comparativo completo (precios con IVA)</h3>
                      <span style={{color:'#64748B',fontSize:'16px'}}>{verComparativo?'▲':'▼'}</span>
                    </div>
                    {verComparativo && <>
                    <table style={{width:'100%',fontSize:'12px',borderCollapse:'collapse'}}>
                      <thead>
                        <tr style={{background:'#1E3A8A',color:'white'}}>
                          <th style={{padding:'10px 12px',textAlign:'left',borderRadius:'8px 0 0 0'}}>Aseguradora</th>
                          <th style={{padding:'10px 12px',textAlign:'center'}}>Prima Anual</th>
                          <th style={{padding:'10px 12px',textAlign:'center'}}>Deducible</th>
                          {tipoSeguro==='autos' && <>
                            <th style={{padding:'10px 12px',textAlign:'center'}}>RC Persona/Accidente</th>
                            <th style={{padding:'10px 12px',textAlign:'center'}}>Colisión</th>
                            <th style={{padding:'10px 12px',textAlign:'center'}}>Robo</th>
                            <th style={{padding:'10px 12px',textAlign:'center'}}>Multiasistencia</th>
                            <th style={{padding:'10px 12px',textAlign:'center'}}>Riesgos Adic.</th>
                            <th style={{padding:'10px 12px',textAlign:'center'}}>Asist. Carretera</th>
                          </>}
                          {tipoSeguro!=='autos' && <>
                            <th style={{padding:'10px 12px',textAlign:'center'}}>Suma Asegurada</th>
                            <th style={{padding:'10px 12px',textAlign:'center'}}>Incendio</th>
                            <th style={{padding:'10px 12px',textAlign:'center'}}>Terremoto</th>
                            <th style={{padding:'10px 12px',textAlign:'center'}}>Huracán</th>
                            <th style={{padding:'10px 12px',textAlign:'center'}}>Inundación</th>
                            <th style={{padding:'10px 12px',textAlign:'center'}}>Robo</th>
                          </>}
                          <th style={{padding:'10px 12px',textAlign:'center',borderRadius:'0 8px 0 0'}}>Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cotizaciones.map((c,i) => (
                          <tr key={i} style={{background:i===0?'#F0FDF4':i%2===0?'#F8FAFC':'white',borderBottom:'1px solid #E2E8F0'}}>
                            <td style={{padding:'10px 12px'}}>
                              <div style={{fontWeight:'700',color:'#0F172A'}}>{c.aseguradora}</div>
                              {c.plan && <div style={{fontSize:'10px',color:'#3B82F6'}}>{c.plan}</div>}
                              {codigoSUGESE(c.aseguradora) && <div style={{fontSize:'10px',color:'#94A3B8'}}>SUGESE: {codigoSUGESE(c.aseguradora)}</div>}
                              {i===0 && <span style={{fontSize:'9px',background:'#10B981',color:'white',padding:'2px 6px',borderRadius:'4px',fontWeight:'700'}}>✨ Recomendado</span>}
                            </td>
                            <td style={{padding:'10px 12px',textAlign:'center',fontWeight:'700',color:'#0F172A'}}>{fmtC(c.prima,c.moneda)}</td>
                            <td style={{padding:'10px 12px',textAlign:'center',color:'#334155'}}>{fmtC(c.deducible,c.moneda)}</td>
                            {tipoSeguro==='autos' && <>
                              <td style={{padding:'10px 12px',textAlign:'center',color:'#334155',fontSize:'10px'}}>
                                {(() => {
                                  const p = c.coberturas?.rc_personas_por_persona||0;
                                  const a = c.coberturas?.rc_personas_por_accidente||c.coberturas?.responsabilidad_civil_lesiones||c.responsabilidad_civil||0;
                                  if (p>0 && a>0 && p!==a) return <>{fmtC(p,c.moneda)}<br/>{fmtC(a,c.moneda)}</>;
                                  if (a>0) return fmtC(a,c.moneda);
                                  return '—';
                                })()}
                              </td>
                              <td style={{padding:'10px 12px',textAlign:'center'}}>{c.coberturas?.colision_vuelco?'✅':'❌'}</td>
                              <td style={{padding:'10px 12px',textAlign:'center'}}>{c.coberturas?.robo_total?'✅':'❌'}</td>
                              <td style={{padding:'10px 12px',textAlign:'center'}}>{c.coberturas?.multiasistencia?'✅':'❌'}</td>
                              <td style={{padding:'10px 12px',textAlign:'center'}}>{(c.coberturas?.riesgos_adicionales||(c.coberturas?.robo_total&&(c.aseguradora||'').toLowerCase().includes('assa')))?'✅':'❌'}</td>
                              <td style={{padding:'10px 12px',textAlign:'center'}}>{(c.coberturas?.multiasistencia||c.coberturas?.asistencia_vial)?'✅':'❌'}</td>
                            </>}
                            {tipoSeguro!=='autos' && <>
                              <td style={{padding:'10px 12px',textAlign:'center',color:'#334155',fontSize:'10px'}}>
                                {c.suma_asegurada_edificio>0&&c.suma_asegurada_contenido>0
                                  ? <>{fmtC(c.suma_asegurada_edificio,c.moneda)}<br/><span style={{color:'#64748B'}}>+{fmtC(c.suma_asegurada_contenido,c.moneda)} contenido</span></>
                                  : fmtC(c.suma_asegurada_edificio||c.suma_asegurada_total||0,c.moneda)}
                              </td>
                              <td style={{padding:'10px 12px',textAlign:'center'}}>{c.cobertura_incendio?'✅':'❌'}</td>
                              <td style={{padding:'10px 12px',textAlign:'center'}}>{c.cobertura_terremoto?'✅':'❌'}</td>
                              <td style={{padding:'10px 12px',textAlign:'center'}}>{c.cobertura_huracan?'✅':'❌'}</td>
                              <td style={{padding:'10px 12px',textAlign:'center'}}>{c.cobertura_inundacion?'✅':'❌'}</td>
                              <td style={{padding:'10px 12px',textAlign:'center'}}>{c.cobertura_robo?'✅':'❌'}</td>
                            </>}
                            <td style={{padding:'10px 12px',textAlign:'center'}}>
                              <span style={{fontWeight:'800',fontSize:'15px',color:c.score>=75?'#D97706':c.score>=55?'#2563EB':'#16A34A'}}>{c.score}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </>}
                  </div>
                  {/* FIRMAS */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'32px',borderTop:'1px solid #E2E8F0',paddingTop:'20px',marginBottom:'16px'}}>
                    {[['Firma del Corredor Autorizado','Licencia SUGESE: Lic 01-2030'],['Recibido conforme — Cliente','Cédula: ___________________________']].map(([titulo,sub]) => (
                      <div key={titulo}>
                        <p style={{fontSize:'11px',color:'#94A3B8',marginBottom:'24px'}}>{titulo}</p>
                        <div style={{borderBottom:'1px solid #94A3B8',marginBottom:'8px'}}/>
                        <p style={{fontSize:'11px',color:'#64748B'}}>Nombre: ___________________________</p>
                        <p style={{fontSize:'11px',color:'#64748B',marginTop:'4px'}}>{sub}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{borderTop:'1px solid #E2E8F0',paddingTop:'12px',fontSize:'11px',color:'#94A3B8',lineHeight:'1.7'}}>
                    <p>⚠️ <strong>Aviso legal:</strong> Cotización informativa, no constituye contrato de seguros. Vigencia 30 días. Registrados ante SUGESE.</p>
                    <p>🏢 <strong>NOA Corredores de Seguros</strong> | Lic 01-2030 | Intermediario independiente autorizado</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ROI ── */}
        {tab==='asesor' && (
          <div style={{maxWidth:'800px',margin:'0 auto',padding:'24px 28px'}}>
            <div style={{marginBottom:'20px'}}>
              <h2 style={{fontSize:'18px',fontWeight:'800',color:'#0F172A',margin:'0 0 4px'}}>🤖 Asesor NOA</h2>
              <p style={{fontSize:'13px',color:'#64748B',margin:0}}>Experto en seguros CR — conoce las cotizaciones en pantalla y las condiciones generales de cada aseguradora.</p>
            </div>
            <div style={{background:'#0A1628',borderRadius:'16px',border:'1px solid #1E3A5F',overflow:'hidden',display:'flex',flexDirection:'column',height:'600px'}}>
              <div style={{flex:1,overflowY:'auto',padding:'20px',display:'flex',flexDirection:'column',gap:'12px'}}>
                {chatMensajes.map((m,i) => (
                  <div key={i} style={{display:'flex',justifyContent:m.rol==='corredor'?'flex-end':'flex-start'}}>
                    {m.rol==='noa' && <div style={{width:'28px',height:'28px',borderRadius:'8px',background:'#2563EB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',flexShrink:0,marginRight:'8px',alignSelf:'flex-start'}}>🤖</div>}
                    <div style={{maxWidth:'75%',padding:'12px 16px',borderRadius:m.rol==='corredor'?'16px 16px 4px 16px':'16px 16px 16px 4px',background:m.rol==='corredor'?'#2563EB':'#1E3A5F',color:'white',fontSize:'13px',lineHeight:'1.6',whiteSpace:'pre-wrap'}}>
                      {m.texto}
                    </div>
                  </div>
                ))}
                {chatCargando && (
                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    <div style={{width:'28px',height:'28px',borderRadius:'8px',background:'#2563EB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px'}}>🤖</div>
                    <div style={{background:'#1E3A5F',borderRadius:'16px 16px 16px 4px',padding:'12px 16px',display:'flex',gap:'6px',alignItems:'center'}}>
                      <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#60A5FA',animation:'pulse 1.4s ease-in-out infinite',animationDelay:'0s'}}/>
                      <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#60A5FA',animation:'pulse 1.4s ease-in-out infinite',animationDelay:'0.2s'}}/>
                      <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#60A5FA',animation:'pulse 1.4s ease-in-out infinite',animationDelay:'0.4s'}}/>
                    </div>
                  </div>
                )}
              </div>
              <div style={{padding:'16px 20px',borderTop:'1px solid #1E3A5F',display:'flex',gap:'10px',background:'#0D1F35'}}>
                <input
                  value={chatInput}
                  onChange={e=>setChatInput(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&enviarChat()}
                  placeholder='Preguntá sobre coberturas, exclusiones, uso del vehículo...'
                  style={{flex:1,background:'#1E3A5F',border:'1px solid #2563EB',borderRadius:'10px',padding:'12px 16px',color:'white',fontSize:'13px',outline:'none'}}
                />
                <button onClick={enviarChat} disabled={chatCargando||!chatInput.trim()} style={{padding:'12px 20px',background:chatCargando||!chatInput.trim()?'#1E3A5F':'#2563EB',color:'white',border:'none',borderRadius:'10px',fontSize:'13px',fontWeight:'700',cursor:chatCargando||!chatInput.trim()?'default':'pointer',transition:'all 0.2s'}}>
                  Enviar
                </button>
              </div>
            </div>
            <div style={{marginTop:'12px',display:'flex',gap:'8px',flexWrap:'wrap'}}>
              {['¿Puedo asegurar un Uber como personal?','¿Qué pasa si choco sin licencia?','¿Cuál plan tiene mejor RC?','¿Qué cubre si viajo a Panamá?','Diferencia entre ASSA y MNK'].map(s=>(
                <button key={s} onClick={()=>{setChatInput(s);}} style={{padding:'6px 12px',background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:'20px',fontSize:'11px',color:'#1D4ED8',cursor:'pointer',fontWeight:'600'}}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
