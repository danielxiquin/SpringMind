import { useState, useEffect, useRef, useCallback } from 'react';
import * as math from 'mathjs';
import Plot from 'react-plotly.js';
import { MathJax, MathJaxContext } from 'better-react-mathjax';
import SpringMassVisualization from './SpringMassVisualization';

const mathJaxConfig = {
  loader: { load: ["input/tex", "output/svg"] },
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']],
    processEscapes: true,      
    processEnvironments: true  
  },
  svg: {
    fontCache: 'global',
    scale: 1,                  
    minScale: 0.5,             
    mtextInheritFont: false,   
    merrorInheritFont: true,  
    mathmlSpacing: false       
  },
  startup: {
    typeset: true              
  }
};

// Función para crear función JavaScript desde LaTeX
const createFunctionFromLatex = (latexStr, classification) => {
  const hasC1 = /C_?1|c_?1/.test(latexStr);
  const hasC2 = /C_?2|c_?2/.test(latexStr);
  
  const defaultC1 = 1;
  const defaultC2 = 1;
  
  try {
    if (classification && classification.includes("subamortiguado_forzado")) {
      const constantMatch = latexStr.match(/^([+-]?\s*\d*\.?\d*)/);
      const constant = constantMatch ? parseFloat(constantMatch[1]) || 0 : 0;
      
      const coefMatch = latexStr.match(/([+-]?\s*\d*\.?\d*)\s*e\^/);
      const coef = coefMatch ? parseFloat(coefMatch[1]) || 1 : 1;
      
      const expMatch = latexStr.match(/e\^\{\s*-\s*([^{}]+)\s*\}/);
      let alpha = 0.5; 
      if (expMatch) {
        const fracMatch = expMatch[1].match(/\\frac\{([^{}]+)\}\{([^{}]+)\}/);
        if (fracMatch) {
          const numerator = parseFloat(fracMatch[1].replace(/[^0-9.-]/g, ''));
          const denominator = parseFloat(fracMatch[2].replace(/[^0-9.-]/g, ''));
          if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
            alpha = numerator / denominator;
          }
        } else {
          alpha = parseFloat(expMatch[1].replace(/[^0-9.-]/g, '')) || 0.5;
        }
      }
      
      const sinMatch = latexStr.match(/\\sin\{\\left\(\s*([^{}]+)\s*\\right\)\}/);
      let omega = 1;
      if (sinMatch) {
        const fracMatch = sinMatch[1].match(/\\frac\{([^{}]+)\}\{([^{}]+)\}/);
        if (fracMatch) {
          const numerator = parseFloat(fracMatch[1].replace(/[^0-9.-]/g, ''));
          const denominator = parseFloat(fracMatch[2].replace(/[^0-9.-]/g, ''));
          if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
            omega = numerator / denominator;
          }
        } else {
          omega = parseFloat(sinMatch[1].replace(/[^0-9.-]/g, '')) || 1;
        }
      }
      
      return (t) => {
        return constant + coef * Math.exp(-alpha * t) * Math.sin(omega * t);
      };
    } else if (classification && classification.includes("criticamente_amortiguado")) {
      return (t) => {
        const match = latexStr.match(/\\left\(\s*([+-]?\d*\.?\d*)\s*t\s*[+-]\s*([+-]?\d*\.?\d*)\\right\)\s*e\^\{\s*-\s*([+-]?\d*\.?\d*)\s*t\s*\}/);
        
        if (match) {
          const c2 = hasC2 ? defaultC2 : parseFloat(match[1]) || 0; 
          const c1 = hasC1 ? defaultC1 : parseFloat(match[2]) || 0;
          const dampRate = parseFloat(match[3]) || 1;
          
          return (c1 + c2 * t) * Math.exp(-dampRate * t);
        }
        
        return (defaultC1 + defaultC2 * t) * Math.exp(-t);
      };
    } else if (classification && classification.includes("subamortiguado")) {
      return (t) => {
        const expMatch = latexStr.match(/e\^\{\s*-\s*([+-]?\d*\.?\d*)\s*t\s*\}/);
        const sinMatch = latexStr.match(/([+-]?\s*\d*\.?\d*)\s*\\sin\(\s*([+-]?\d*\.?\d*)\s*t\s*\)/);
        const cosMatch = latexStr.match(/([+-]?\s*\d*\.?\d*)\s*\\cos\(\s*([+-]?\d*\.?\d*)\s*t\s*\)/);
        
        const alpha = expMatch ? parseFloat(expMatch[1]) : 0.2;
        const sinCoef = hasC1 ? defaultC1 : (sinMatch ? parseFloat(sinMatch[1]) || 0 : 0);
        const cosCoef = hasC2 ? defaultC2 : (cosMatch ? parseFloat(cosMatch[1]) || 0 : 1);
        const omega = (sinMatch && parseFloat(sinMatch[2])) || (cosMatch && parseFloat(cosMatch[2])) || 1;
        
        return Math.exp(-alpha * t) * (sinCoef * Math.sin(omega * t) + cosCoef * Math.cos(omega * t));
      };
    } else if (classification && classification.includes("sobreamortiguado")) {
      return (t) => {
        const terms = latexStr.match(/([+-]?\s*\d*\.?\d*)\s*e\^\{\s*-\s*([+-]?\d*\.?\d*)\s*t\s*\}/g) || [];
        
        let c1 = hasC1 ? defaultC1 : 1;
        let r1 = 0.5;
        let c2 = hasC2 ? defaultC2 : 1;
        let r2 = 2;
        
        if (terms.length >= 1) {
          const match1 = terms[0].match(/([+-]?\s*\d*\.?\d*)\s*e\^\{\s*-\s*([+-]?\d*\.?\d*)\s*t\s*\}/);
          if (match1) {
            c1 = hasC1 ? defaultC1 : (parseFloat(match1[1]) || 1);
            r1 = parseFloat(match1[2]) || 0.5;
          }
        }
        
        if (terms.length >= 2) {
          const match2 = terms[1].match(/([+-]?\s*\d*\.?\d*)\s*e\^\{\s*-\s*([+-]?\d*\.?\d*)\s*t\s*\}/);
          if (match2) {
            c2 = hasC2 ? defaultC2 : (parseFloat(match2[1]) || 1);
            r2 = parseFloat(match2[2]) || 2;
          }
        }
        
        return c1 * Math.exp(-r1 * t) + c2 * Math.exp(-r2 * t);
      };
    } else {
      return (t) => {
        const sinMatch = latexStr.match(/([+-]?\s*\d*\.?\d*)\s*\\sin\(\s*([+-]?\d*\.?\d*)\s*t\s*\)/);
        const cosMatch = latexStr.match(/([+-]?\s*\d*\.?\d*)\s*\\cos\(\s*([+-]?\d*\.?\d*)\s*t\s*\)/);
        
        const sinCoef = hasC1 ? defaultC1 : (sinMatch ? parseFloat(sinMatch[1]) || 0 : 0);
        const cosCoef = hasC2 ? defaultC2 : (cosMatch ? parseFloat(cosMatch[1]) || 0 : 1);
        const omega = (sinMatch && parseFloat(sinMatch[2])) || (cosMatch && parseFloat(cosMatch[2])) || 1;
        
        return sinCoef * Math.sin(omega * t) + cosCoef * Math.cos(omega * t);
      };
    }
  } catch (error) {
    console.error("Error creating function from LaTeX:", error);
    return (t) => Math.exp(-0.2 * t) * Math.cos(t);
  }
};

// Componente principal optimizado
export default function ResultsDisplay({ resultData }) {
  // Constantes optimizadas para mejor rendimiento
  const maxTime = 20;
  const timeStep = 0.05;
  const maxDataPoints = 300;
  const animationSpeed = 50; // Velocidad de animación más lenta
  
  const [positionData, setPositionData] = useState({ x: [], y: [] });
  const [velocityData, setVelocityData] = useState({ x: [], y: [] });
  const [currentTime, setCurrentTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false); 
  const [parseError, setParseError] = useState(null);
  const [usingDefaultConstants, setUsingDefaultConstants] = useState(false);
  const [systemParams, setSystemParams] = useState({
    mass: 1,
    k: 10,
    c: 0.5,
    F: 1
  });
  
  const animationRef = useRef();
  const positionFunctionRef = useRef();
  const lastUpdateTime = useRef(0);
  
  // Crear función una sola vez cuando cambian los datos
  useEffect(() => {
    if (resultData?.solution) {
      positionFunctionRef.current = createFunctionFromLatex(
        resultData.solution,
        resultData.classification || ''
      );
      
      setCurrentTime(0);
      setPositionData({ x: [], y: [] });
      setVelocityData({ x: [], y: [] });
      setIsAnimating(false); 
    }
  }, [resultData]);
  
  const calculateData = useCallback((upToTime) => {
    if (!positionFunctionRef.current) return { pos: { x: [], y: [] }, vel: { x: [], y: [] } };
    
    const posFunction = positionFunctionRef.current;
    const newPosData = { x: [], y: [] };
    const newVelData = { x: [], y: [] };
    
    const h = 0.01; // Para derivada numérica
    const step = Math.max(timeStep, upToTime / maxDataPoints);
    
    for (let t = 0; t <= upToTime; t += step) {
      try {
        const position = posFunction(t);
        
        if (!isFinite(position)) continue;
        
        newPosData.x.push(t);
        newPosData.y.push(position);
        
        // Calcular velocidad usando derivada numérica
        if (t > h) {
          const positionPlus = posFunction(t + h);
          const positionMinus = posFunction(t - h);
          const velocity = (positionPlus - positionMinus) / (2 * h);
          
          if (isFinite(velocity)) {
            newVelData.x.push(t);
            newVelData.y.push(velocity);
          }
        }
      } catch (err) {
        console.error(`Error at t=${t}:`, err);
        break;
      }
    }
    
    return { pos: newPosData, vel: newVelData };
  }, [timeStep, maxDataPoints]);
  
  useEffect(() => {
    if (window.MathJax) {
      window.MathJax.typesetPromise && window.MathJax.typesetPromise();
    }

    if (resultData && resultData.solution) {
      const hasUnassignedConstants = /C[1-2]|c[1-2]/.test(resultData.solution);
      setUsingDefaultConstants(hasUnassignedConstants);
      
      if (resultData.parameters) {
        const newParams = {
          mass: resultData.parameters.m || resultData.parameters.mass || 1,
          k: resultData.parameters.k || resultData.parameters.spring_constant || 10,
          c: resultData.parameters.c || resultData.parameters.damping || 0.5,
          F: resultData.parameters.F || resultData.parameters.force || 1,
          omega_0: resultData.parameters.omega_0,
          omega_d: resultData.parameters.omega_d,
          zeta: resultData.parameters.zeta || resultData.parameters.damping_ratio,
          tau: resultData.parameters.tau || resultData.parameters.time_constant
        };
        
        Object.keys(newParams).forEach(key => {
          if (newParams[key] === undefined) {
            delete newParams[key];
          }
        });
        
        setSystemParams(prevParams => ({ ...prevParams, ...newParams }));
      }
      
      setParseError(null);
    }
  }, [resultData]);
  
  // Animación optimizada
  useEffect(() => {
    let timeoutId;
    
    if (isAnimating && positionFunctionRef.current) {
      const animate = () => {
        const now = Date.now();
        
        if (now - lastUpdateTime.current < animationSpeed) {
          timeoutId = setTimeout(animate, animationSpeed - (now - lastUpdateTime.current));
          return;
        }
        
        lastUpdateTime.current = now;
        
        setCurrentTime(prevTime => {
          const newTime = prevTime + 0.1;
          
          // Detener cuando llegue al final
          if (newTime >= maxTime) {
            setIsAnimating(false);
            return maxTime;
          }
          
          // Calcular datos progresivamente
          const { pos, vel } = calculateData(newTime);
          setPositionData(pos);
          setVelocityData(vel);
          
          return newTime;
        });
        
        timeoutId = setTimeout(animate, animationSpeed);
      };
      
      timeoutId = setTimeout(animate, animationSpeed);
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isAnimating, calculateData, maxTime, animationSpeed]);
  
  const toggleAnimation = () => {
    if (isAnimating) {
      // Al pausar, limpiar memoria y mostrar datos completos
      setIsAnimating(false);
      setCurrentTime(0);
      
      // Limpiar arrays para liberar memoria
      setPositionData({ x: [], y: [] });
      setVelocityData({ x: [], y: [] });
      
      // Forzar garbage collection si está disponible
      if (window.gc) {
        window.gc();
      }
      
      // Generar datos completos después de limpiar
      setTimeout(() => {
        if (positionFunctionRef.current) {
          const { pos, vel } = calculateData(maxTime);
          setPositionData(pos);
          setVelocityData(vel);
        }
      }, 100);
    } else {
      // Al iniciar animación, limpiar datos previos
      setPositionData({ x: [], y: [] });
      setVelocityData({ x: [], y: [] });
      setCurrentTime(0);
      setIsAnimating(true);
    }
  };
  
  // Generar datos completos para gráfica estática (cuando no está animando)
  useEffect(() => {
    if (!isAnimating && positionFunctionRef.current && resultData?.solution) {
      const { pos, vel } = calculateData(maxTime);
      setPositionData(pos);
      setVelocityData(vel);
    }
  }, [isAnimating, resultData, calculateData, maxTime]);
  
  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="bg-[#242021] p-8 flex flex-col items-center">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-white">
            Resultados del Sistema Masa-Resorte
          </h2>
          <p className="text-[#cccccc] text-center mt-2">Análisis y visualización de la dinámica del sistema</p>
        </div>
        
        <div className="w-full max-w-6xl grid grid-cols-5 gap-6 max-md:flex max-md:flex-col">
          {/* Tarjeta 1: Ecuación Diferencial */}
          <div className="rounded-xl col-span-2 border border-[#444444] bg-[#333333] flex flex-col justify-center items-start gap-2 p-6 relative overflow-hidden max-sm:overflow-auto shadow-md">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#9b702c]"></div>
            <h3 className="text-xl font-semibold text-[#9b702c] mb-3">Ecuación Diferencial</h3>
            <div className="bg-[#1e1e1e] p-4 rounded-lg w-full overflow-x-hidden flex justify-center">
              <MathJax className="text-white">
                {resultData && resultData.equation 
                  ? "$" + resultData.equation + "$" 
                  : "$m\\frac{d^2x}{dt^2} + c\\frac{dx}{dt} + kx = F(t)$"}
              </MathJax>
            </div>
          </div>
          
          {/* Tarjeta 2: Solución */}             
          <div className="rounded-xl col-span-3 border border-[#444444] bg-[#333333] flex flex-col justify-center items-start gap-2 p-6 relative overflow-hidden max-sm:overflow-auto shadow-md">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#9b702c]"></div>
            <h3 className="text-xl font-semibold text-[#9b702c] mb-3">Solución</h3>
            <div className="bg-[#1e1e1e] p-4 rounded-lg w-full overflow-x-auto">
              <MathJax className="text-white">
                {resultData && resultData.solution 
                  ? "$x(t) = " + resultData.solution + "$" 
                  : "$x(t) = $ [La solución aparecerá aquí]"}
              </MathJax>
            </div>
          </div>

          {/* Tarjeta 3: Gráfica de Posición */}
          <div className="rounded-xl col-span-3 border border-[#444444] bg-[#333333] flex flex-col justify-center items-start gap-2 p-6 relative overflow-hidden shadow-md">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#9b702c]"></div>
            
            <div className="flex justify-between items-center w-full mb-3">
              <h3 className="text-xl font-semibold text-[#9b702c]">Gráfica de Posición vs. Tiempo</h3>
              <div className="flex gap-2">
                <button
                  onClick={toggleAnimation}
                  className="px-3 py-1 bg-[#9b702c] text-white rounded-md hover:bg-[#b28235] text-sm transition-colors"
                  disabled={!resultData?.solution}
                >
                  {isAnimating ? 'Pausar' : 'Animar'}
                </button>
              </div>
            </div>
            
            {parseError ? (
              <div className="text-red-400">{parseError}</div>
            ) : (
              <>
                {usingDefaultConstants && (
                  <div className="bg-[#1e1e1e] border-l-4 border-[#9b702c] p-4 mb-4 text-[#cccccc] text-sm">
                    <p className="font-semibold text-[#9b702c]">Nota:</p>
                    <p>Esta gráfica usa valores predeterminados (C₁=1, C₂=1) 
                    ya que la solución contiene constantes sin valores específicos.</p>
                  </div>
                )}
                
                <div className="h-64 w-full">
                  <Plot
                    data={[
                      {
                        x: positionData.x,
                        y: positionData.y,
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Posición',
                        line: { color: '#9b702c', width: 2 }
                      }
                    ]}
                    layout={{
                      title: {
                        text: isAnimating 
                          ? `Animación en Progreso (t = ${currentTime.toFixed(2)}s)` 
                          : 'Respuesta Completa del Sistema',
                        font: { color: '#ffffff' }
                      },
                      paper_bgcolor: 'rgba(30, 30, 30, 0.8)',
                      plot_bgcolor: 'rgba(26, 26, 26, 0.5)',
                      xaxis: {
                        title: 'Tiempo (s)',
                        color: '#cccccc',
                        gridcolor: '#444444',
                        range: [0, maxTime]
                      },
                      yaxis: {
                        title: 'Posición x(t)',
                        color: '#cccccc',
                        gridcolor: '#444444'
                      },
                      margin: { t: 40, l: 60, r: 30, b: 50 },
                      autosize: true,
                      font: { color: '#ffffff' },
                      showlegend: false
                    }}
                    style={{ width: '100%', height: '100%' }}
                    useResizeHandler={true}
                    config={{ 
                      responsive: true,
                      displayModeBar: false
                    }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Tarjeta 4: Clasificación */}
          <div className="rounded-xl col-span-2 border border-[#444444] bg-[#333333] flex flex-col justify-center items-start gap-2 p-6 relative overflow-hidden shadow-md">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#9b702c]"></div>
            <h3 className="text-xl font-semibold text-[#9b702c] mb-3">Clasificación del Sistema</h3>
            <p className="text-lg text-white capitalize">
              {resultData && resultData.classification 
                ? resultData.classification.replace(/_/g, ' ') 
                : "Sin datos aún"}
            </p>
            
            {resultData && resultData.system_properties && (
              <div className="mt-4 text-sm text-[#cccccc]">
                <div className="grid grid-cols-2 gap-2">
                  {resultData.system_properties.omega_0 && (
                    <div>ω₀: {resultData.system_properties.omega_0.toFixed(3)}</div>
                  )}
                  {resultData.system_properties.omega_d && (
                    <div>ωd: {resultData.system_properties.omega_d.toFixed(3)}</div>
                  )}
                  {resultData.system_properties.zeta && (
                    <div>ζ: {resultData.system_properties.zeta.toFixed(3)}</div>
                  )}
                  {resultData.system_properties.tau && (
                    <div>τ: {resultData.system_properties.tau.toFixed(3)}</div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Tarjeta 5: Gráfica de Velocidad */}
          <div className="rounded-xl col-span-5 border border-[#444444] bg-[#333333] flex flex-col justify-center items-start gap-2 p-6 relative overflow-hidden shadow-md">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#9b702c]"></div>
            
            <h3 className="text-xl font-semibold text-[#9b702c] mb-3">Gráfica de Velocidad vs. Tiempo</h3>
            
            {parseError ? (
              <div className="text-red-400">{parseError}</div>
            ) : (
              <>
                {usingDefaultConstants && (
                  <div className="bg-[#1e1e1e] border-l-4 border-[#9b702c] p-4 mb-4 text-[#cccccc] text-sm">
                    <p className="font-semibold text-[#9b702c]">Nota:</p>
                    <p>Esta gráfica usa valores predeterminados y cálculo de derivadas numéricas.</p>
                  </div>
                )}
                
                <div className="h-80 w-full">
                  <Plot
                    data={[
                      {
                        x: velocityData.x,
                        y: velocityData.y,
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Velocidad',
                        line: { color: '#2c9b70', width: 2 }
                      }
                    ]}
                    layout={{
                      title: {
                        text: isAnimating 
                          ? `Velocidad - Animación en Progreso (t = ${currentTime.toFixed(2)}s)` 
                          : 'Velocidad Completa del Sistema',
                        font: { color: '#ffffff', size: 14 }
                      },
                      paper_bgcolor: 'rgba(30, 30, 30, 0.8)',
                      plot_bgcolor: 'rgba(26, 26, 26, 0.5)',
                      xaxis: {
                        title: {
                          text: 'Tiempo (s)',
                          font: { color: '#cccccc', size: 12 }
                        },
                        color: '#cccccc',
                        gridcolor: '#444444',
                        range: [0, maxTime],
                        automargin: true
                      },
                      yaxis: {
                        title: {
                          text: 'Velocidad v(t)',
                          font: { color: '#cccccc', size: 12 }
                        },
                        color: '#cccccc',
                        gridcolor: '#444444',
                        automargin: true
                      },
                      margin: { t: 60, l: 80, r: 40, b: 80 },
                      autosize: true,
                      font: { color: '#ffffff', size: 11 },
                      showlegend: false
                    }}
                    style={{ width: '100%', height: '100%' }}
                    useResizeHandler={true}
                    config={{ 
                      responsive: true,
                      displayModeBar: false
                    }}
                  />
                </div>
              </>
            )}
          </div>
          
          {/* Tarjeta 6: Visualización del Resorte */}
          <div className="rounded-xl col-span-5 border border-[#444444] bg-[#333333] flex flex-col justify-center items-start gap-2 p-6 relative overflow-hidden shadow-md mt-6">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#9b702c]"></div>
            
            <SpringMassVisualization
                solution={resultData?.solution}
                classification={resultData?.classification}
                parameters={resultData?.parameters}
                systemProperties={resultData?.system_properties}
                numericalCoefficients={resultData?.numerical_coefficients}
                solutionRaw={resultData?.solution_raw}
            />
          </div>
        </div>
      </div>
    </MathJaxContext>
  );
}