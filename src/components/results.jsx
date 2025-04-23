import { useState, useEffect } from 'react';
import * as math from 'mathjs';
import Plot from 'react-plotly.js';
import { MathJax, MathJaxContext } from 'better-react-mathjax';

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

export default function ResultsDisplay({ resultData }) {
  const [graphData, setGraphData] = useState({ x: [], y: [] });
  const [parseError, setParseError] = useState(null);
  const [usingDefaultConstants, setUsingDefaultConstants] = useState(false);
  
  useEffect(() => {

    if (window.MathJax) {
      window.MathJax.typesetPromise && window.MathJax.typesetPromise();
    }

    if (resultData && resultData.solution) {
      try {
        console.log("Procesando solución:", resultData.solution);
        const classification = resultData.classification || '';
        const hasUnassignedConstants = /C[1-2]|c[1-2]/.test(resultData.solution);
        
        if (hasUnassignedConstants) {
          setUsingDefaultConstants(true);
        } else {
          setUsingDefaultConstants(false);
        }
        
        const data = generateGraphData(resultData.solution, classification);
        setGraphData(data);
        setParseError(null);
      } catch (err) {
        console.error("Error parsing solution:", err);
        setParseError("No se pudo analizar la solución para generar la gráfica: " + err.message);
      }
    } else {
      const defaultData = generateDefaultGraphData();
      setGraphData(defaultData);
    }
  }, [resultData]);
  
  const generateDefaultGraphData = () => {
    const xValues = [];
    const yValues = [];
    
    for (let t = 0; t <= 20; t += 0.1) {
      xValues.push(t);
      yValues.push(Math.exp(-0.2 * t) * Math.cos(t));
    }
    
    return { x: xValues, y: yValues };
  };
  
  const generateGraphData = (solutionLatex, classification) => {
    const xValues = [];
    const yValues = [];
    
    const jsFunction = createFunctionFromLatex(solutionLatex, classification);
    
    // Para depuración
    console.log("Evaluando función en algunos puntos:");
    console.log("f(0) =", jsFunction(0));
    console.log("f(1) =", jsFunction(1));
    console.log("f(5) =", jsFunction(5));
    
    for (let t = 0; t <= 20; t += 0.1) {
      try {
        const position = jsFunction(t);
        xValues.push(t);
        yValues.push(position);
      } catch (err) {
        console.error(`Error evaluating function at t=${t}:`, err);
      }
    }
    
    return { x: xValues, y: yValues };
  };
  
  const parseFraction = (fractionStr) => {
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
  };
  
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
          const cosCoef = hasC2 ? defaultC2 : (cosMatch ? parseFloat(cosMatch[1]) || 1 : 1);
          const omega = (sinMatch && parseFloat(sinMatch[2])) || (cosMatch && parseFloat(cosMatch[2])) || 1;
          
          return sinCoef * Math.sin(omega * t) + cosCoef * Math.cos(omega * t);
        };
      }
    } catch (error) {
      console.error("Error creating function from LaTeX:", error);
      return (t) => Math.cos(t);
    }
  };
  
  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="bg-white p-8 rounded-md shadow-md mt-8">
        <h2 className="text-2xl font-bold mb-4">Resultados del Sistema Masa-Resorte</h2>
        
        <div className="mb-6">
          <h3 className="text-xl font-semibold">Clasificación del Sistema</h3>
          <p className="text-lg capitalize">
            {resultData && resultData.classification 
              ? resultData.classification.replace(/_/g, ' ') 
              : "Sin datos aún"}
          </p>
        </div>
        
        <div className="mb-6">
          <h3 className="text-xl font-semibold">Ecuación Diferencial</h3>
          <div className="bg-gray-100 p-4 rounded overflow-x-auto">
            <MathJax>
              {resultData && resultData.equation 
                ? "$" + resultData.equation + "$" 
                : "$m\\frac{d^2x}{dt^2} + c\\frac{dx}{dt} + kx = F(t)$"}
            </MathJax>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-xl font-semibold">Solución</h3>
          <div className="bg-gray-100 p-4 rounded overflow-x-auto">
            <MathJax>
              {resultData && resultData.solution 
                ? "$x(t) = " + resultData.solution + "$" 
                : "$x(t) = $ [La solución aparecerá aquí]"}
            </MathJax>
          </div>
        </div>
        
        <div>
          <h3 className="text-xl font-semibold mb-4">Gráfica de la Posición vs. Tiempo</h3>
          {parseError ? (
            <div className="text-red-500">{parseError}</div>
          ) : (
            <>
              {usingDefaultConstants && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
                  <p className="font-semibold">Nota:</p>
                  <p>Esta gráfica es una representación aproximada usando valores predeterminados (C₁=1, C₂=1) 
                  ya que la solución contiene constantes sin valores específicos. La gráfica real puede variar 
                  dependiendo de las condiciones iniciales.</p>
                </div>
              )}
              <div className="h-96">
                <Plot
                  data={[
                    {
                      x: graphData.x,
                      y: graphData.y,
                      type: 'scatter',
                      mode: 'lines',
                      name: 'Posición',
                      line: { color: '#3B82F6' }
                    }
                  ]}
                  layout={{
                    title: resultData ? 'Respuesta del Sistema' : 'Gráfica de Ejemplo',
                    xaxis: {
                      title: 'Tiempo (s)'
                    },
                    yaxis: {
                      title: 'Posición x(t)'
                    },
                    margin: { t: 40 },
                    autosize: true
                  }}
                  style={{ width: '100%', height: '100%' }}
                  useResizeHandler={true}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </MathJaxContext>
  );
}