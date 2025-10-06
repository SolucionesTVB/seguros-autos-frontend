import React, { useState, useEffect } from 'react';
import { Upload, FileText, Zap, CheckCircle, AlertCircle, Loader, Shield, Send, Save, User, Car, Database } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const App = () => {
  const [pantalla, setPantalla] = useState('inicio');
  const [archivos, setArchivos] = useState([]);
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState({ actual: 0, total: 0 });
  const [cotizaciones, setCotizaciones] = useState([]);
  const [mejorOpcion, setMejorOpcion] = useState(null);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [estadoConexion, setEstadoConexion] = useState('checking');
  
  const [datosCliente, setDatosCliente] = useState({
    nombre: '',
    cedula: '',
    telefono: '',
    email: '',
    vehiculo: { marca: '', modelo: '', año: '', placa: '' }
  });

  useEffect(() => {
    verificarConexion();
  }, []);

  const verificarConexion = async () => {
    try {
      const response = await fetch(`${API_URL}/health`);
      if (response.ok) {
        setEstadoConexion('connected');
      } else {
        setEstadoConexion('error');
      }
    } catch (error) {
      setEstadoConexion('error');
    }
  };

  const generarDatosSimulados = (nombreArchivo) => {
    const nombre = nombreArchivo.toLowerCase();
    let aseguradora = 'ASSA';
    if (nombre.includes('ins')) aseguradora = 'INS';
    else if (nombre.includes('mnk')) aseguradora = 'MNK';
    else if (nombre.includes('qualitas')) aseguradora = 'Qualitas';
    
    return {
      aseguradora,
      numeroReferencia: `${aseguradora}-${Math.floor(Math.random() * 100000)}`,
      prima: Math.floor(Math.random() * 200000 + 350000),
      deducible: Math.floor(Math.random() * 50000 + 100000),
      responsabilidadCivil: 5000000,
      coberturas: {
        robo: true,
        cristales: Math.random() > 0.3,
        grua: Math.random() > 0.2,
        vehiculoReemplazo: Math.random() > 0.5
      }
    };
  };

  const calcularScore = (datos) => {
    let score = 100;
    const primaPromedio = 430000;
    score -= Math.abs((datos.prima - primaPromedio) / primaPromedio) * 40;
    const deduciblePromedio = 125000;
    score -= Math.abs((datos.deducible - deduciblePromedio) / deduciblePromedio) * 30;
    let coberturas = 0;
    if (datos.coberturas.robo) coberturas++;
    if (datos.coberturas.cristales) coberturas++;
    if (datos.coberturas.grua) coberturas++;
    if (datos.coberturas.vehiculoReemplazo) coberturas += 1.5;
    score += (coberturas / 5.5) * 30;
    return Math.max(0, Math.min(100, score));
  };

  const procesarPDFs = async () => {
    if (!datosCliente.nombre || archivos.length === 0) {
      setError('Completa todos los datos');
      return;
    }

    setProcesando(true);
    setPantalla('procesando');
    const resultados = [];

    for (let i = 0; i < archivos.length; i++) {
      setProgreso({ actual: i + 1, total: archivos.length });
      await new Promise(r => setTimeout(r, 2000));
      const datos = generarDatosSimulados(archivos[i].name);
      datos.score = calcularScore(datos);
      resultados.push(datos);
    }

    resultados.sort((a, b) => b.score - a.score);
    setCotizaciones(resultados);
    setMejorOpcion(resultados[0]);
    setProcesando(false);
    setPantalla('resultados');
  };

  const guardarEnBD = async () => {
    try {
      const response = await fetch(`${API_URL}/api/cotizaciones/guardar-completo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: datosCliente,
          vehiculo: datosCliente.vehiculo,
          cotizaciones,
          mejorOpcion
        })
      });
      const data = await response.json();
      if (data.success) {
        setExito('✅ Guardado exitosamente');
        setTimeout(() => setExito(''), 5000);
      }
    } catch (err) {
      setError('Error al guardar: ' + err.message);
    }
  };

  const enviarWhatsApp = () => {
    const msg = `🚗 Cotización\n${datosCliente.nombre}\n${mejorOpcion.aseguradora}: ₡${mejorOpcion.prima.toLocaleString()}`;
    const tel = datosCliente.telefono.replace(/\D/g, '');
    window.open(`https://wa.me/506${tel}?text=${encodeURIComponent(msg)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 rounded-2xl p-3">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Comparador de Seguros de Autos</h1>
                <div className="flex items-center space-x-2 mt-1">
                  <Database className={`w-4 h-4 ${estadoConexion === 'connected' ? 'text-green-600' : 'text-red-600'}`} />
                  <span className={`text-xs ${estadoConexion === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                    {estadoConexion === 'connected' ? 'Backend Conectado' : 'Backend Desconectado'}
                  </span>
                </div>
              </div>
            </div>
            {pantalla === 'resultados' && (
              <button onClick={() => { setPantalla('inicio'); setArchivos([]); setCotizaciones([]); }}
                className="px-6 py-3 bg-gray-600 text-white rounded-xl">
                Nueva Cotización
              </button>
            )}
          </div>
        </div>

        {exito && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl mb-6">
            <p className="text-green-700">{exito}</p>
          </div>
        )}

        {pantalla === 'inicio' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <User className="w-6 h-6 mr-2 text-blue-600" />
                Datos del Cliente
              </h2>
              <div className="space-y-4">
                <input type="text" placeholder="Nombre *" value={datosCliente.nombre}
                  onChange={(e) => setDatosCliente({...datosCliente, nombre: e.target.value})}
                  className="w-full px-4 py-3 border rounded-lg" />
                <input type="text" placeholder="Cédula" value={datosCliente.cedula}
                  onChange={(e) => setDatosCliente({...datosCliente, cedula: e.target.value})}
                  className="w-full px-4 py-3 border rounded-lg" />
                <input type="tel" placeholder="Teléfono *" value={datosCliente.telefono}
                  onChange={(e) => setDatosCliente({...datosCliente, telefono: e.target.value})}
                  className="w-full px-4 py-3 border rounded-lg" />
                <input type="email" placeholder="Email" value={datosCliente.email}
                  onChange={(e) => setDatosCliente({...datosCliente, email: e.target.value})}
                  className="w-full px-4 py-3 border rounded-lg" />
              </div>
              <div className="mt-4 pt-4 border-t">
                <h3 className="font-semibold mb-3 flex items-center">
                  <Car className="w-5 h-5 mr-2 text-blue-600" />
                  Vehículo
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Marca *" value={datosCliente.vehiculo.marca}
                    onChange={(e) => setDatosCliente({...datosCliente, vehiculo: {...datosCliente.vehiculo, marca: e.target.value}})}
                    className="px-4 py-3 border rounded-lg" />
                  <input type="text" placeholder="Modelo *" value={datosCliente.vehiculo.modelo}
                    onChange={(e) => setDatosCliente({...datosCliente, vehiculo: {...datosCliente.vehiculo, modelo: e.target.value}})}
                    className="px-4 py-3 border rounded-lg" />
                  <input type="text" placeholder="Año *" value={datosCliente.vehiculo.año}
                    onChange={(e) => setDatosCliente({...datosCliente, vehiculo: {...datosCliente.vehiculo, año: e.target.value}})}
                    className="px-4 py-3 border rounded-lg" />
                  <input type="text" placeholder="Placa" value={datosCliente.vehiculo.placa}
                    onChange={(e) => setDatosCliente({...datosCliente, vehiculo: {...datosCliente.vehiculo, placa: e.target.value}})}
                    className="px-4 py-3 border rounded-lg" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <Upload className="w-6 h-6 mr-2 text-blue-600" />
                PDFs de Cotizaciones
              </h2>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center mb-4">
                <input type="file" accept=".pdf" multiple id="file-upload"
                  onChange={(e) => setArchivos(Array.from(e.target.files).slice(0, 5))}
                  className="hidden" />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Haz clic para seleccionar PDFs</p>
                  <p className="text-sm text-gray-500">Hasta 5 archivos</p>
                </label>
              </div>
              {archivos.length > 0 && (
                <div className="space-y-2 mb-4">
                  {archivos.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
                      <span className="text-sm">{f.name}</span>
                      <span className="text-xs text-blue-600">{(f.size/1024).toFixed(1)} KB</span>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={procesarPDFs}
                disabled={!datosCliente.nombre || archivos.length === 0}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:bg-gray-300">
                <span className="flex items-center justify-center">
                  <Zap className="w-5 h-5 mr-2" />
                  Procesar con IA
                </span>
              </button>
              {error && <p className="mt-4 text-red-600 text-sm">{error}</p>}
            </div>
          </div>
        )}

        {pantalla === 'procesando' && (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <Loader className="w-16 h-16 text-blue-600 mx-auto mb-6 animate-spin" />
            <h2 className="text-2xl font-bold mb-4">Procesando...</h2>
            <p className="text-gray-600">{progreso.actual} de {progreso.total}</p>
            <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
              <div className="bg-blue-600 h-3 rounded-full" 
                style={{width: `${(progreso.actual/progreso.total)*100}%`}}></div>
            </div>
          </div>
        )}

        {pantalla === 'resultados' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">{datosCliente.nombre}</h3>
                  <p className="text-gray-600">{datosCliente.vehiculo.marca} {datosCliente.vehiculo.modelo} {datosCliente.vehiculo.año}</p>
                </div>
                <div className="flex space-x-3">
                  <button onClick={guardarEnBD} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center">
                    <Save className="w-4 h-4 mr-2" />Guardar
                  </button>
                  <button onClick={enviarWhatsApp} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center">
                    <Send className="w-4 h-4 mr-2" />WhatsApp
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-8 text-white">
              <h2 className="text-2xl font-bold mb-6">🏆 Mejor Opción: {mejorOpcion.aseguradora}</h2>
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white/10 rounded-xl p-6">
                  <p className="text-sm mb-1">Prima Anual</p>
                  <p className="text-3xl font-bold">₡{mejorOpcion.prima.toLocaleString()}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-6">
                  <p className="text-sm mb-1">Deducible</p>
                  <p className="text-3xl font-bold">₡{mejorOpcion.deducible.toLocaleString()}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-6">
                  <p className="text-sm mb-1">Score</p>
                  <p className="text-3xl font-bold">{mejorOpcion.score.toFixed(0)}/100</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-2xl font-bold mb-6">Comparación Completa</h2>
              <table className="w-full">
                <thead>
                  <tr className="border-b-2">
                    <th className="text-left py-4 px-4">Aseguradora</th>
                    <th className="text-right py-4 px-4">Prima</th>
                    <th className="text-right py-4 px-4">Deducible</th>
                    <th className="text-center py-4 px-4">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {cotizaciones.map((c, i) => (
                    <tr key={i} className={`border-b ${i===0?'bg-green-50':''}`}>
                      <td className="py-4 px-4">
                        {i===0 && '🏆 '}<span className="font-semibold">{c.aseguradora}</span>
                      </td>
                      <td className="text-right py-4 px-4 font-bold">₡{c.prima.toLocaleString()}</td>
                      <td className="text-right py-4 px-4">₡{c.deducible.toLocaleString()}</td>
                      <td className="text-center py-4 px-4">
                        <span className={`px-4 py-2 rounded-full font-bold ${
                          c.score>=80?'bg-green-100 text-green-800':
                          c.score>=60?'bg-yellow-100 text-yellow-800':'bg-red-100 text-red-800'
                        }`}>{c.score.toFixed(0)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
