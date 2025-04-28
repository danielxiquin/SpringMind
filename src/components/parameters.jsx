import { useState } from 'react';
import ResultsDisplay from './results';

export default function Parameters(props) {
  const [activeTab, setActiveTab] = useState('FISICOS');
  const [formFisc, setFormFisc] = useState({
    mass: '', 
    stiffness: '', 
    damping: ' ', 
    force: ' ', 
    initial_position: ' ', 
    initial_velocity: ' '
  });
  
  const [formNorm, setFormNorm] = useState({
    beta: '', 
    omega_sq: '', 
    force: ' ', 
    initial_position: ' ', 
    initial_velocity: ' '
  });

  const [resultData, setResultData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChangeFisicos = (e) => {
    setFormFisc({...formFisc, [e.target.name]: e.target.value });
  }

  const handleChangeNorm = (e) => {
    setFormNorm({...formNorm, [e.target.name]: e.target.value});
  }

  const handleSubmitFisic = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('https://spring-solver-api.onrender.com/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formFisc),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error('Error en el envío: ' + (errorData.detail || res.statusText));
      }
      
      const data = await res.json();
      console.log(data)
      setResultData(data);
      props.onResultData(data)
    } catch (err) {
      console.error(err);
      setError(err.message);
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmitNorm = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('https://spring-solver-api.onrender.com/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formNorm),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error('Error en el envío: ' + (errorData.detail || res.statusText));
      }
      
      const data = await res.json();
      setResultData(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-gradient-to-b from-[#f1f1f1] to-[#242021] min-h-screen p-6 flex flex-col justify-center gap-10">
      <div className="text-center flex flex-col mb-4">
        <h1 className="text-6xl font-bold text-[#242021]">INICIA</h1>
        <p className="text-xl text-[#333333] mt-2">Simula el comportamiento de un sistema masa-resorte-amortiguador</p>
      </div>

      <div className="w-full max-w-4xl mx-auto">
        <div className="w-full flex flex-col items-center gap-1">
          {/* Tabs */}
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('FISICOS')}
              className={`px-6 min-w-xs py-4 text-center font-medium transition-colors ${
                activeTab === 'FISICOS'
                  ? 'bg-white text-[#242021] border-t-2 border-[#9b702c]'
                  : 'bg-gray-400 text-white'
              } rounded-t-md`}
            >
              PARÁMETROS FÍSICOS
            </button>
            <button
              onClick={() => setActiveTab('NORM')}
              className={`px-6 min-w-xs py-2 text-center font-medium transition-colors ${
                activeTab === 'NORM'
                  ? 'bg-white text-[#242021] border-t-2 border-[#9b702c]'
                  : 'bg-gray-400 text-white'
              } rounded-t-md`}
            >
              PARÁMETROS <br /> NORMALIZADOS
            </button>
          </div>

          {/* Tab Content */}
          <div className="bg-white p-8 w-full rounded-md shadow-lg border border-[#d9d9d9]">
            {activeTab === 'FISICOS' && (
              <div>
                {/* Header */}
                <div className="flex flex-col justify-between items-start mb-8 gap-2">
                  <div className="text-right">
                    <p className="text-gray-600 mt-1 text-base text-justify">
                      Ingresa los valores reales de tu sistema: masa, constante del resorte, amortiguamiento y fuerza externa. 
                      Ideal si estás resolviendo un problema con unidades físicas concretas.
                    </p>
                  </div>
                </div>

                {/* Form */}
                <div className="w-full space-y-8 flex gap-20">
                  <div className="w-full">
                    <form className="space-y-3 flex flex-col gap-4 items-center" onSubmit={handleSubmitFisic}>
                      <div className="space-y-3 w-full grid grid-cols-2 gap-4">
                        <div className="flex gap-2">
                          <label className="block w-50 text-sm font-medium text-gray-700">Masa (m)</label>
                          <input
                            type="text"
                            name="mass"
                            value={formFisc.mass}
                            onChange={handleChangeFisicos}
                            placeholder=""
                            className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#9b702c] focus:border-[#9b702c]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <label className="block w-50 text-sm font-medium text-gray-700">Constante (k)</label>
                          <input
                            type="text"
                            name="stiffness"
                            value={formFisc.stiffness}
                            onChange={handleChangeFisicos}
                            placeholder=""
                            className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#9b702c] focus:border-[#9b702c]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <label className="block w-50 text-sm font-medium text-gray-700">C amortiguamiento (B)</label>
                          <input
                            type="text"
                            name="damping"
                            value={formFisc.damping}
                            onChange={handleChangeFisicos}
                            placeholder=""
                            className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#9b702c] focus:border-[#9b702c]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <label className="block w-50 text-sm font-medium text-gray-700">Fuerza externa F(t)</label>
                          <input
                            type="text"
                            name="force"
                            value={formFisc.force}
                            onChange={handleChangeFisicos}
                            placeholder=""
                            className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#9b702c] focus:border-[#9b702c]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <label className="block w-50 text-sm font-medium text-gray-700">Posición x(0)</label>
                          <input
                            type="text"
                            name="initial_position"
                            value={formFisc.initial_position}
                            onChange={handleChangeFisicos}
                            placeholder=""
                            className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#9b702c] focus:border-[#9b702c]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <label className="block w-50 text-sm font-medium text-gray-700">Velocidad x'(0)</label>
                          <input
                            type="text"
                            name="initial_velocity"
                            value={formFisc.initial_velocity}
                            onChange={handleChangeFisicos}
                            placeholder=""
                            className="w-full h-10 p-2 bg-gray-100 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#9b702c] focus:border-[#9b702c]"
                          />
                        </div>
                      </div>

                      <button 
                        type="submit" 
                        className="w-40 bg-[#9b702c] text-white py-2 px-4 rounded hover:bg-[#7d5923] transition-colors"
                        disabled={loading}
                      >
                        {loading ? 'Enviando...' : 'Calcular'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'NORM' && (
              <div>
                {/* Header */}
                <div className="flex flex-col gap-2 justify-between items-start mb-8">
                  <div className="text-right">
                    <p className="text-gray-600 mt-1 text-base text-justify">
                      Trabaja con el sistema en su forma reducida: solo necesitas el factor de amortiguamiento β, 
                      la frecuencia natural ω₀ y la fuerza externa dividida entre la masa. Ideal para análisis teóricos o simulaciones.
                    </p>
                  </div>
                </div>

                {/* Form */}
                <div className="w-full space-y-8 flex gap-20">
                  <div className="w-full">
                    <form className="space-y-3 flex flex-col gap-4 items-center" onSubmit={handleSubmitNorm}>
                      <div className="space-y-3 w-full grid grid-cols-2 gap-4">
                        <div className="flex gap-2">
                          <label className="block w-50 text-sm font-medium text-gray-700">Amortiguamiento (β)</label>
                          <input
                            type="text"
                            name="beta"
                            value={formNorm.beta}
                            onChange={handleChangeNorm}
                            placeholder=""
                            className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#9b702c] focus:border-[#9b702c]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <label className="block w-50 text-sm font-medium text-gray-700">Frecuencia Natural (ω₀)</label>
                          <input
                            type="text"
                            name="omega_sq"
                            value={formNorm.omega_sq}
                            onChange={handleChangeNorm}
                            placeholder=""
                            className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#9b702c] focus:border-[#9b702c]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <label className="block w-50 text-sm font-medium text-gray-700">Fuerza externa F(t)</label>
                          <input
                            type="text"
                            name="force"
                            value={formNorm.force}
                            onChange={handleChangeNorm}
                            placeholder=""
                            className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#9b702c] focus:border-[#9b702c]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <label className="block w-50 text-sm font-medium text-gray-700">Posición x(0)</label>
                          <input
                            type="text"
                            name="initial_position"
                            value={formNorm.initial_position}
                            onChange={handleChangeNorm}
                            placeholder=""
                            className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#9b702c] focus:border-[#9b702c]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <label className="block w-50 text-sm font-medium text-gray-700">Velocidad x'(0)</label>
                          <input
                            type="text"
                            name="initial_velocity"
                            value={formNorm.initial_velocity}
                            onChange={handleChangeNorm}
                            placeholder=""
                            className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#9b702c] focus:border-[#9b702c]"
                          />
                        </div>
                      </div>

                      <button 
                        type="submit" 
                        className="w-40 bg-[#9b702c] text-white py-2 px-4 rounded hover:bg-[#7d5923] transition-colors"
                        disabled={loading}
                      >
                        {loading ? 'Enviando...' : 'Calcular'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}