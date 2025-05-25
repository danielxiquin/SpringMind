
import { useState } from 'react';
import { Calculator, Info, AlertCircle, CheckCircle, X, Play } from 'lucide-react';

export default function Parameters(props) {
  const [activeTab, setActiveTab] = useState('FISICOS');
  const [showForceCalculator, setShowForceCalculator] = useState(false);
  const [forcePreview, setForcePreview] = useState('');
  
  const [formFisc, setFormFisc] = useState({
    mass: '', 
    stiffness: '', 
    damping: '', 
    force: '', 
    initial_position: '', 
    initial_velocity: ''
  });
  
  const [formNorm, setFormNorm] = useState({
    beta: '', 
    omega_sq: '', 
    force: '', 
    initial_position: '', 
    initial_velocity: ''
  });

  const [resultData, setResultData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Función para extraer el valor real de un número complejo
  const getComplexValue = (value) => {
    if (typeof value === 'object' && value !== null) {
      if (typeof value.real === 'number') {
        return value.real;
      }
    }
    return typeof value === 'number' ? value : 0;
  };

  // Función para procesar datos de la API que puedan tener números complejos
  const processApiResponse = (data) => {
    const processed = { ...data };
    
    // Procesar system_properties que pueden tener números complejos
    if (data.system_properties) {
      const systemProps = { ...data.system_properties };
      
      // Campos que pueden ser números complejos
      const complexFields = ['damped_period', 'logarithmic_decrement'];
      
      complexFields.forEach(field => {
        if (systemProps[field]) {
          systemProps[field] = getComplexValue(systemProps[field]);
        }
      });
      
      processed.system_properties = systemProps;
    }
    
    // Procesar force_analysis si tiene números complejos
    if (data.force_analysis && data.force_analysis.parsed) {
      processed.force_analysis.parsed = getComplexValue(data.force_analysis.parsed);
    }
    
    return processed;
  };

  // Plantillas de fuerza mejoradas
  const forceTemplates = {
    constant: { 
      formula: "10", 
      description: "Fuerza constante",
      category: "Básica",
      example: "F(t) = 10 N"
    },
    sine: { 
      formula: "5*sin(2*t)", 
      description: "Senoidal simple",
      category: "Periódica",
      example: "Amplitud: 5, ω = 2 rad/s"
    },
    cosine: { 
      formula: "3*cos(4*t + pi/3)", 
      description: "Cosenoidal con desfase",
      category: "Periódica",
      example: "Amplitud: 3, ω = 4 rad/s, φ = π/3"
    },
    combined: { 
      formula: "2*cos(3*t) + 4*sin(5*t)", 
      description: "Frecuencias múltiples",
      category: "Compleja",
      example: "Superposición de ondas"
    },
    exponential: { 
      formula: "7*exp(-0.5*t)", 
      description: "Decaimiento exponencial",
      category: "Transitoria",
      example: "Impulso que decae"
    },
    impulse: { 
      formula: "20*t*exp(-2*t)", 
      description: "Pulso tipo impulso",
      category: "Transitoria",
      example: "Pico rápido y decaimiento"
    },
    damped_sine: { 
      formula: "exp(-0.1*t)*sin(5*t)", 
      description: "Seno amortiguado",
      category: "Compleja",
      example: "Oscilación decreciente"
    },
    linear: { 
      formula: "2*t", 
      description: "Crecimiento lineal",
      category: "Básica",
      example: "Rampa ascendente"
    },
    quadratic: { 
      formula: "t**2", 
      description: "Crecimiento cuadrático",
      category: "Básica",
      example: "Aceleración constante"
    },
    step: { 
      formula: "10", 
      description: "Escalón unitario",
      category: "Básica",
      example: "Fuerza constante aplicada súbitamente"
    }
  };

  const handleChangeFisicos = (e) => {
    setFormFisc({...formFisc, [e.target.name]: e.target.value });
    setError(null);
    setSuccess(false);
  }

  const handleChangeNorm = (e) => {
    setFormNorm({...formNorm, [e.target.name]: e.target.value});
    setError(null);
    setSuccess(false);
  }

  // Procesar datos antes del envío - CORREGIDO
  const processFormData = (formData) => {
    const processed = {};
    
    Object.keys(formData).forEach(key => {
      const value = formData[key].toString().trim();
      
      // Campos que pueden ser null (vacíos) o cero
      if (['initial_position', 'initial_velocity', 'damping', 'force', 'beta'].includes(key)) {
        if (value === '' || value === 'null') {
          processed[key] = '';
        } else if (value === '0') {
          processed[key] = key === 'force' ? "0" : 0;
        } else {
          processed[key] = key === 'force' ? value : parseFloat(value);
        }
      } else {
        if (value === '' || isNaN(parseFloat(value))) {
          throw new Error(`El campo ${key} es requerido y debe ser un número válido`);
        }
        processed[key] = parseFloat(value);
      }
    });
    
    return processed;
  };

  const validateForm = (formData, isPhysical = true) => {
    const errors = [];
    
    if (isPhysical) {
      if (!formData.mass || formData.mass <= 0) {
        errors.push("La masa debe ser un valor positivo");
      }
      if (!formData.stiffness || formData.stiffness <= 0) {
        errors.push("La constante del resorte debe ser un valor positivo");
      }
      if (formData.damping !== null && formData.damping < 0) {
        errors.push("El amortiguamiento no puede ser negativo");
      }
    } else {
      if (!formData.omega_sq || formData.omega_sq <= 0) {
        errors.push("La frecuencia natural debe ser un valor positivo");
      }
      if (formData.beta !== null && formData.beta < 0) {
        errors.push("El factor de amortiguamiento no puede ser negativo");
      }
    }
    
    // Validar expresión de fuerza si no está vacía
    if (formData.force && formData.force !== "0") {
      if (!isValidForceExpression(formData.force)) {
        errors.push("La expresión de fuerza contiene caracteres no válidos");
      }
    }
    
    return errors;
  };

  // Validar expresión matemática
  const isValidForceExpression = (expression) => {
    // Permitir solo caracteres seguros para expresiones matemáticas
    const allowedPattern = /^[0-9+\-*/().sincoexpitanlg\s]+$/;
    return allowedPattern.test(expression);
  };

  const handleSubmitFisic = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const processedData = processFormData(formFisc);
      const validationErrors = validateForm(processedData, true);
      console.log(processedData)
      
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('. '));
      }
      
      // Simular API call - reemplaza con tu endpoint real
      const res = await fetch('https://spring-solver-api.onrender.com/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedData),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let errorMessage = 'Error en el cálculo del servidor';
        
        if (errorData.detail) {
          if (errorData.detail.includes('mass')) {
            errorMessage = 'Error: Verifica que la masa sea un número positivo';
          } else if (errorData.detail.includes('stiffness')) {
            errorMessage = 'Error: Verifica que la constante del resorte sea un número positivo';
          } else if (errorData.detail.includes('force')) {
            errorMessage = 'Error: La expresión de fuerza no es válida. Usa funciones como sin, cos, exp, t, pi';
          } else {
            errorMessage = `Error del servidor: ${errorData.detail}`;
          }
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await res.json();
      const processedApiData = processApiResponse(data);
      setResultData(processedApiData);
      setSuccess(true);
      if (props.onResultData) props.onResultData(processedApiData);
      
    } catch (err) {
      console.error('Error en cálculo:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmitNorm = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const processedData = processFormData(formNorm);
      const validationErrors = validateForm(processedData, false);
      
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('. '));
      }
      
      const res = await fetch('https://spring-solver-api.onrender.com/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedData),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let errorMessage = 'Error en el cálculo del servidor';
        
        if (errorData.detail) {
          if (errorData.detail.includes('omega') || errorData.detail.includes('frequency')) {
            errorMessage = 'Error: Verifica que la frecuencia natural sea un número positivo';
          } else if (errorData.detail.includes('beta')) {
            errorMessage = 'Error: Verifica que el factor de amortiguamiento sea válido';
          } else if (errorData.detail.includes('force')) {
            errorMessage = 'Error: La expresión de fuerza no es válida. Usa funciones como sin, cos, exp, t, pi';
          } else {
            errorMessage = `Error del servidor: ${errorData.detail}`;
          }
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await res.json();
      const processedApiData = processApiResponse(data);
      setResultData(processedApiData);
      setSuccess(true);
      if (props.onResultData) props.onResultData(processedApiData);
      
    } catch (err) {
      console.error('Error en cálculo:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const applyForceTemplate = (template) => {
    if (activeTab === 'FISICOS') {
      setFormFisc({...formFisc, force: template.formula});
    } else {
      setFormNorm({...formNorm, force: template.formula});
    }
    setForcePreview(template.formula);
  };

  const copyFormulaToClipboard = (formula) => {
    navigator.clipboard.writeText(formula);
  };

  const clearForm = () => {
    if (activeTab === 'FISICOS') {
      setFormFisc({
        mass: '', 
        stiffness: '', 
        damping: '', 
        force: '', 
        initial_position: '', 
        initial_velocity: ''
      });
    } else {
      setFormNorm({
        beta: '', 
        omega_sq: '', 
        force: '', 
        initial_position: '', 
        initial_velocity: ''
      });
    }
    setError(null);
    setSuccess(false);
  };

  const currentForce = activeTab === 'FISICOS' ? formFisc.force : formNorm.force;

  return (
    <section className="bg-[#242021] p-6 flex flex-col justify-center gap-10 min-h-screen">
      <div className="text-center flex flex-col">
        <h1 className="text-6xl font-bold text-[#f1f1f1]">INICIA</h1>
        <p className="text-xl text-[#f1f1f1] mt-2">Simula el comportamiento de un sistema masa-resorte-amortiguador</p>
      </div>

      {/* Mensajes de estado */}
      {error && (
        <div className="w-full max-w-4xl mx-auto bg-red-600/20 border border-red-500 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
          <p className="text-red-300">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="w-full max-w-4xl mx-auto bg-green-600/20 border border-green-500 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="text-green-400 flex-shrink-0" size={20} />
          <p className="text-green-300">¡Cálculo completado exitosamente! Los resultados están disponibles.</p>
          <button 
            onClick={() => setSuccess(false)}
            className="ml-auto text-green-400 hover:text-green-300"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="w-full max-w-4xl mx-auto">
        <div className="w-full flex flex-col items-center gap-1">
          {/* Tabs */}
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('FISICOS')}
              className={`px-6 py-4 text-center font-medium max-sm:text-sm transition-colors ${
                activeTab === 'FISICOS'
                  ? 'bg-[#333333] text-[#f1f1f1] border-t-2 border-[#9b702c]'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              } rounded-t-md`}
            >
              PARÁMETROS FÍSICOS
            </button>
            <button
              onClick={() => setActiveTab('NORM')}
              className={`px-6 py-4 text-center font-medium max-sm:text-sm transition-colors ${
                activeTab === 'NORM'
                  ? 'bg-[#333333] text-[#f1f1f1] border-t-2 border-[#9b702c]'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              } rounded-t-md`}
            >
              PARÁMETROS <br /> NORMALIZADOS
            </button>
          </div>

          {/* Tab Content */}                                                                     
          <div className="bg-[#333333] p-8 w-full rounded-md shadow-lg">
            {activeTab === 'FISICOS' && (
              <div>
                {/* Header */}
                <div className="flex flex-col justify-between items-start mb-8 gap-2">
                  <div className="flex justify-between items-center w-full">
                    <h2 className="text-2xl font-bold text-[#f1f1f1]">Parámetros Físicos</h2>
                    <button
                      onClick={clearForm}
                      className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
                    >
                      Limpiar
                    </button>
                  </div>
                  <p className="text-[#f1f1f1] mt-1 text-base text-justify">
                    Ingresa los valores reales de tu sistema: masa, constante del resorte, amortiguamiento y fuerza externa. 
                    Ideal si estás resolviendo un problema con unidades físicas concretas.
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmitFisic} className="w-full space-y-8">
                  <div className="w-full">
                    <div className="space-y-4 flex flex-col gap-4 items-center">
                      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                          <label className="block text-sm font-medium text-[#f1f1f1]">
                            Masa (m) (kg) <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="number"
                            step="any"
                            name="mass"
                            value={formFisc.mass}
                            onChange={handleChangeFisicos}
                            placeholder="Ej: 1.5"
                            className="w-full p-3 bg-[#1e1e1e] rounded-md outline-none text-[#f1f1f1] border border-gray-600 focus:border-[#9b702c] transition-colors"
                            required
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="block text-sm font-medium text-[#f1f1f1]">
                            Constante del resorte (k) (N/m) <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="number"
                            step="any"
                            name="stiffness"
                            value={formFisc.stiffness}
                            onChange={handleChangeFisicos}
                            placeholder="Ej: 10"
                            className="w-full p-3 bg-[#1e1e1e] rounded-md outline-none text-[#f1f1f1] border border-gray-600 focus:border-[#9b702c] transition-colors"
                            required
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="block text-sm font-medium text-[#f1f1f1] flex items-center gap-1">
                            Coeficiente de amortiguamiento (B) (kg/s)
                            <Info size={14} className="text-gray-400" title="Opcional: dejar vacío para sistema sin amortiguamiento" />
                          </label>
                          <input
                            type="number"
                            step="any"
                            name="damping"
                            value={formFisc.damping}
                            onChange={handleChangeFisicos}
                            placeholder="Opcional (0 o vacío)"
                            className="w-full p-3 bg-[#1e1e1e] rounded-md outline-none text-[#f1f1f1] border border-gray-600 focus:border-[#9b702c] transition-colors"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="block text-sm font-medium text-[#f1f1f1] flex items-center gap-1">
                            Fuerza externa F(t) (N)
                            <button
                              type="button"
                              onClick={() => setShowForceCalculator(!showForceCalculator)}
                              className="text-[#9b702c] hover:text-[#7d5923] transition-colors"
                              title="Abrir calculadora de fuerza"
                            >
                              <Calculator size={14} />
                            </button>
                          </label>
                          <input
                            type="text"
                            name="force"
                            value={formFisc.force}
                            onChange={handleChangeFisicos}
                            placeholder="Ej: 10*sin(2*t) o vacío"
                            className="w-full p-3 bg-[#1e1e1e] rounded-md outline-none text-[#f1f1f1] border border-gray-600 focus:border-[#9b702c] transition-colors"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="block text-sm font-medium text-[#f1f1f1] flex items-center gap-1">
                            Posición inicial x(0) (m)
                            <Info size={14} className="text-gray-400" title="Opcional: posición inicial del sistema" />
                          </label>
                          <input
                            type="number"
                            step="any"
                            name="initial_position"
                            value={formFisc.initial_position}
                            onChange={handleChangeFisicos}
                            placeholder="Opcional"
                            className="w-full p-3 bg-[#1e1e1e] rounded-md outline-none text-[#f1f1f1] border border-gray-600 focus:border-[#9b702c] transition-colors"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="block text-sm font-medium text-[#f1f1f1] flex items-center gap-1">
                            Velocidad inicial x'(0) (m/s)
                            <Info size={14} className="text-gray-400" title="Opcional: velocidad inicial del sistema" />
                          </label>
                          <input
                            type="number"
                            step="any"
                            name="initial_velocity"
                            value={formFisc.initial_velocity}
                            onChange={handleChangeFisicos}
                            placeholder="Opcional"
                            className="w-full p-3 bg-[#1e1e1e] rounded-md outline-none text-[#f1f1f1] border border-gray-600 focus:border-[#9b702c] transition-colors"
                          />
                        </div>
                      </div>

                      <button 
                        type="submit"
                        className="w-40 bg-[#9b702c] text-white py-3 px-6 rounded-md hover:bg-[#7d5923] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            Calculando...
                          </>
                        ) : (
                          <>
                            <Play size={16} />
                            Calcular
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'NORM' && (
              <div>
                {/* Header */}
                <div className="flex flex-col gap-2 justify-between items-start mb-8">
                  <div className="flex justify-between items-center w-full">
                    <h2 className="text-2xl font-bold text-[#f1f1f1]">Parámetros Normalizados</h2>
                    <button
                      onClick={clearForm}
                      className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
                    >
                      Limpiar
                    </button>
                  </div>
                  <p className="text-[#f1f1f1] mt-1 text-base text-justify">
                    Trabaja con el sistema en su forma reducida: solo necesitas el factor de amortiguamiento β, 
                    la frecuencia natural ω₀ y la fuerza externa dividida entre la masa. Ideal para análisis teóricos o simulaciones.
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmitNorm} className="w-full space-y-8">
                  <div className="w-full">
                    <div className="space-y-4 flex flex-col gap-4 items-center">
                      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                          <label className="block text-sm font-medium text-[#f1f1f1] flex items-center gap-1">
                            Factor de amortiguamiento (β)
                            <Info size={14} className="text-gray-400" title="Opcional: factor de amortiguamiento normalizado" />
                          </label>
                          <input
                            type="number"
                            step="any"
                            name="beta" 
                            value={formNorm.beta}
                            onChange={handleChangeNorm}
                            placeholder="Opcional"
                            className="w-full p-3 bg-[#1e1e1e] rounded-md outline-none text-[#f1f1f1] border border-gray-600 focus:border-[#9b702c] transition-colors"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="block text-sm font-medium text-[#f1f1f1]">
                            Frecuencia natural (ω₀) (rad/s) <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="number"
                            step="any"
                            name="omega_sq"
                            value={formNorm.omega_sq}
                            onChange={handleChangeNorm}
                            placeholder="Ej: 2.5"
                            className="w-full p-3 bg-[#1e1e1e] rounded-md outline-none text-[#f1f1f1] border border-gray-600 focus:border-[#9b702c] transition-colors"
                            required
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="block text-sm font-medium text-[#f1f1f1] flex items-center gap-1">
                            Fuerza externa F(t) (N)
                            <button
                              type="button"
                              onClick={() => setShowForceCalculator(!showForceCalculator)}
                              className="text-[#9b702c] hover:text-[#7d5923] transition-colors"
                              title="Abrir calculadora de fuerza"
                            >
                              <Calculator size={14} />
                            </button>
                          </label>
                          <input
                            type="text"
                            name="force"
                            value={formNorm.force}
                            onChange={handleChangeNorm}
                            placeholder="Ej: 5*cos(3*t) o vacío"
                            className="w-full p-3 bg-[#1e1e1e] rounded-md outline-none text-[#f1f1f1] border border-gray-600 focus:border-[#9b702c] transition-colors"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="block text-sm font-medium text-[#f1f1f1] flex items-center gap-1">
                            Posición inicial x(0) (m)
                            <Info size={14} className="text-gray-400" title="Opcional: posición inicial del sistema" />
                          </label>
                          <input
                            type="number"
                            step="any"
                            name="initial_position"
                            value={formNorm.initial_position}
                            onChange={handleChangeNorm}
                            placeholder="Opcional"
                            className="w-full p-3 bg-[#1e1e1e] rounded-md outline-none text-[#f1f1f1] border border-gray-600 focus:border-[#9b702c] transition-colors"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="block text-sm font-medium text-[#f1f1f1] flex items-center gap-1">
                            Velocidad inicial x'(0) (m/s)
                            <Info size={14} className="text-gray-400" title="Opcional: velocidad inicial del sistema" />
                          </label>
                          <input
                            type="number"
                            step="any"
                            name="initial_velocity"
                            value={formNorm.initial_velocity}                                               
                            onChange={handleChangeNorm}
                            placeholder="Opcional"
                            className="w-full p-3 bg-[#1e1e1e] rounded-md outline-none text-[#f1f1f1] border border-gray-600 focus:border-[#9b702c] transition-colors"
                          />
                        </div>
                      </div>

                      <button 
                        type="submit"
                        className="w-40 bg-[#9b702c] text-white py-3 px-6 rounded-md hover:bg-[#7d5923] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            Calculando...
                          </>
                        ) : (
                          <>
                            <Play size={16} />
                            Calcular
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Calculadora de Fuerza */}
            {showForceCalculator && (
              <div className="mt-8 p-6 bg-[#2a2a2a] rounded-lg border border-[#9b702c]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-[#f1f1f1] flex items-center gap-2">
                    <Calculator size={20} />
                    Calculadora de Fuerza Externa
                  </h3>
                  <button
                    onClick={() => setShowForceCalculator(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    ×
                  </button>
                </div>
                
                <p className="text-gray-300 mb-4 text-sm">
                  Selecciona un tipo de fuerza o edita la fórmula manualmente:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {Object.entries(forceTemplates).map(([key, template]) => (
                    <button
                      key={key}
                      onClick={() => applyForceTemplate(template)}
                      className="p-3 bg-[#1e1e1e] rounded border border-gray-600 hover:border-[#9b702c] transition-colors text-left"
                    >
                      <div className="text-[#9b702c] font-mono text-sm mb-1">
                        {template.formula}
                      </div>
                      <div className="text-gray-300 text-xs">
                        {template.description}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="border-t border-gray-600 pt-4">
                  <h4 className="text-[#f1f1f1] font-medium mb-2">Fórmula actual:</h4>
                  <div className="p-3 bg-[#1e1e1e] rounded border border-gray-600 font-mono text-[#9b702c]">
                    {currentForce || "Sin fuerza externa"}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Funciones disponibles: sin, cos, exp, t, pi. Ejemplo: 5*sin(2*t + pi/4)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}