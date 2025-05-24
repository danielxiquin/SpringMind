import { useState, useEffect, useRef } from 'react';
import Plot from 'react-plotly.js';

// Componente para la gráfica animada
function AnimatedPlot({ solution, classification }) {
  const [frames, setFrames] = useState([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const animationRef = useRef(null);
  
  // Preparar datos para la animación
  useEffect(() => {
    if (solution) {
      try {
        // Crea la función basada en la solución proporcionada
        const jsFunction = createFunctionFromLatex(solution, classification);
        
        // Generar frames para la animación
        const totalFrames = 200;
        const maxTime = 20;
        const newFrames = [];
        
        for (let i = 0; i <= totalFrames; i++) {
          const t_max = (i / totalFrames) * maxTime;
          
          const xValues = [];
          const yValues = [];
          
          // Calcular puntos para cada cuadro
          for (let t = 0; t <= t_max; t += 0.1) {
            xValues.push(t);
            yValues.push(jsFunction(t));
          }
          
          newFrames.push({ x: xValues, y: yValues, t_max });
        }
        
        setFrames(newFrames);
      } catch (err) {
        console.error("Error al generar frames:", err);
      }
    }
  }, [solution, classification]);
  
  // Manejar la animación
  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animate);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentFrame]);
  
  const animate = () => {
    setCurrentFrame((prev) => {
      // Si llegamos al final, reiniciar
      if (prev >= frames.length - 1) {
        return 0;
      }
      return prev + 1;
    });
    
    animationRef.current = requestAnimationFrame(animate);
  };
  
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };
  
  const resetAnimation = () => {
    setIsPlaying(false);
    setCurrentFrame(0);
  };
  
  // Función auxiliar para interpretar la solución en LaTeX
  // Reutiliza el código de tu función original createFunctionFromLatex
  const createFunctionFromLatex = (latexStr, classification) => {
    // Manejar el caso donde la solución aún contiene C1 y C2
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
          alpha = parseFraction(expMatch[1]);
        }
        
        const sinMatch = latexStr.match(/\\sin\{\\left\(\s*([^{}]+)\s*\\right\)\}/);
        let omega = 1;
        if (sinMatch) {
          omega = parseFraction(sinMatch[1]);
        }
        
        console.log("Parámetros extraídos:", { constant, coef, alpha, omega });
        
        return (t) => {
          return constant + coef * Math.exp(-alpha * t) * Math.sin(omega * t);
        };
      } else if (classification && classification.includes("criticamente_amortiguado")) {
        // Código para sistema críticamente amortiguado
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
        // Código para sistema subamortiguado sin forzamiento
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
      return (t) => Math.cos(t);
    }
  };
  
  
  function parseFraction(fractionStr) {
    if (!fractionStr) return 1;
    
    const fracMatch = fractionStr.match(/\\frac\{([^{}]+)\}\{([^{}]+)\}/);
    if (fracMatch) {
      const numerator = parseFloat(fracMatch[1].replace(/[^0-9.-]/g, ''));
      const denominator = parseFloat(fracMatch[2].replace(/[^0-9.-]/g, ''));
      if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
        return numerator / denominator;
      }
    }
    
    return parseFloat(fractionStr.replace(/[^0-9.-]/g, '')) || 1;
  }
  
  return (
    <div className="flex flex-col w-full">
      {frames.length > 0 && (
        <>
          <div className="h-64 w-full mb-4">
            <Plot
              data={[
                {
                  x: frames[currentFrame]?.x || [],
                  y: frames[currentFrame]?.y || [],
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Posición',
                  line: { color: '#9b702c', width: 2 }
                }
              ]}
              layout={{
                title: {
                  text: `Respuesta del Sistema (t = ${frames[currentFrame]?.t_max.toFixed(2)} s)`,
                  font: { color: '#ffffff' }
                },
                paper_bgcolor: 'rgba(30, 30, 30, 0.8)',
                plot_bgcolor: 'rgba(26, 26, 26, 0.5)',
                xaxis: {
                  title: 'Tiempo (s)',
                  color: '#cccccc',
                  gridcolor: '#444444',
                  range: [0, 20]
                },
                yaxis: {
                  title: 'Posición x(t)',
                  color: '#cccccc',
                  gridcolor: '#444444',
                  range: [-2, 2] // Ajusta según tu sistema
                },
                margin: { t: 40 },
                autosize: true,
                font: { color: '#ffffff' }
              }}
              style={{ width: '100%', height: '100%' }}
              useResizeHandler={true}
              config={{ responsive: true }}
            />
          </div>
          
          <div className="flex justify-center gap-4 mt-2">
            <button
              onClick={togglePlay}
              className="px-4 py-2 bg-[#9b702c] text-white rounded-md hover:bg-[#b28235]"
            >
              {isPlaying ? 'Pausar' : 'Reproducir'}
            </button>
            <button
              onClick={resetAnimation}
              className="px-4 py-2 bg-[#333333] text-white rounded-md hover:bg-[#444444]"
            >
              Reiniciar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default AnimatedPlot;