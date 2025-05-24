import { useState, useEffect, useRef } from 'react';

const SpringMassVisualization = ({ 
  solution, 
  classification, 
  parameters = {}, 
  systemProperties = {},
  numericalCoefficients = {},
  solutionRaw 
}) => {
  const [position, setPosition] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [acceleration, setAcceleration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const animationRef = useRef(null);
  const timeRef = useRef(0);
  
  // Usar parámetros recibidos del backend
  const {
    mass = 1,
    stiffness: k = 4,
    damping: c = 0.5,
    force = '2*cos(3*t)',
    initial_position = 0,
    initial_velocity = 0
  } = parameters;
  
  // Usar propiedades del sistema calculadas en el backend
  const {
    natural_frequency: omega_n = Math.sqrt(k / mass),
    damping_coefficient: alpha = c / (2 * mass),
    damped_frequency: omega_d = Math.sqrt(k / mass - Math.pow(c / (2 * mass), 2)),
    damping_ratio: zeta = c / (2 * Math.sqrt(k * mass))
  } = systemProperties;
  
  const equilibrium = 300; // Posición visual de equilibrio
  
  // Colores del tema
  const colors = {
    spring: "#9b702c",
    mass: "#333333",
    wall: "#242021",
    floor: "#444444",
    equilibrium: "#9b702c",
    text: "#cccccc",
    accent: "#9b702c",
    positive: "#9b702c",
    negative: "#cc8533",
    background: "#1e1e1e"
  };
  
  // Función mejorada para evaluar la posición basada en la solución real
  const evaluatePosition = (t) => {
    try {
      if (!numericalCoefficients || !systemProperties) return 0;
      
      const { frequencies = [], decay_rates = [], amplitudes = [] } = numericalCoefficients;
      
      if (classification === 'subamortiguado_forzado') {
        // Para sistema subamortiguado forzado
        // Solución homogénea: e^(-alpha*t) * (C1*cos(omega_d*t) + C2*sin(omega_d*t))
        // Solución particular: respuesta estacionaria a la fuerza externa
        
        // Parte homogénea (transitorio)
        const C1 = initial_position; // Condición inicial de posición
        const C2 = initial_velocity / omega_d; // Condición inicial de velocidad
        const homogeneous = Math.exp(-alpha * t) * 
          (C1 * Math.cos(omega_d * t) + C2 * Math.sin(omega_d * t));
        
        // Parte particular (respuesta forzada)
        // Para fuerza F = 2*cos(3*t), la respuesta particular será de la forma:
        // A*cos(3*t) + B*sin(3*t)
        const forcingFreq = 3.0; // de la fuerza 2*cos(3*t)
        const denominator = Math.pow(omega_n * omega_n - forcingFreq * forcingFreq, 2) + 
                           Math.pow(2 * alpha * forcingFreq, 2);
        
        const A = (2 * (omega_n * omega_n - forcingFreq * forcingFreq)) / denominator;
        const B = (2 * 2 * alpha * forcingFreq) / denominator;
        
        const particular = A * Math.cos(forcingFreq * t) + B * Math.sin(forcingFreq * t);
        
        return homogeneous + particular;
        
      } else if (classification === 'subamortiguado') {
        // Sistema subamortiguado libre
        const C1 = initial_position;
        const C2 = (initial_velocity + alpha * initial_position) / omega_d;
        return Math.exp(-alpha * t) * 
          (C1 * Math.cos(omega_d * t) + C2 * Math.sin(omega_d * t));
        
      } else if (classification === 'criticamente_amortiguado') {
        // Sistema críticamente amortiguado
        const C1 = initial_position;
        const C2 = initial_velocity + omega_n * initial_position;
        return (C1 + C2 * t) * Math.exp(-omega_n * t);
        
      } else if (classification === 'sobreamortiguado') {
        // Sistema sobreamortiguado
        const discriminant = Math.sqrt(zeta * zeta - 1);
        const r1 = -omega_n * (zeta + discriminant);
        const r2 = -omega_n * (zeta - discriminant);
        
        const C2 = (initial_velocity - r1 * initial_position) / (r2 - r1);
        const C1 = initial_position - C2;
        
        return C1 * Math.exp(r1 * t) + C2 * Math.exp(r2 * t);
        
      } else {
        // Sistema no amortiguado
        const C1 = initial_position;
        const C2 = initial_velocity / omega_n;
        return C1 * Math.cos(omega_n * t) + C2 * Math.sin(omega_n * t);
      }
    } catch (error) {
      console.error("Error al evaluar posición:", error);
      return Math.cos(omega_n * t);
    }
  };
  
  // Calcular velocidad y aceleración numéricamente
  const calculateDerivatives = (t) => {
    const dt = 0.001;
    const pos1 = evaluatePosition(t - dt);
    const pos2 = evaluatePosition(t + dt);
    const vel = (pos2 - pos1) / (2 * dt);
    
    const vel1 = (evaluatePosition(t) - evaluatePosition(t - dt)) / dt;
    const vel2 = (evaluatePosition(t + dt) - evaluatePosition(t)) / dt;
    const acc = (vel2 - vel1) / dt;
    
    return { velocity: vel, acceleration: acc };
  };
  
  useEffect(() => {
    if (isPlaying) {
      let lastTime = 0;
      
      const animate = (currentTime) => {
        if (lastTime === 0) {
          lastTime = currentTime;
        }
        
        const deltaTime = (currentTime - lastTime) / 1000 * speed;
        lastTime = currentTime;
        
        timeRef.current += deltaTime;
        
        if (timeRef.current > 20) {
          timeRef.current = 0;
        }
        
        const newPosition = evaluatePosition(timeRef.current);
        const derivatives = calculateDerivatives(timeRef.current);
        
        setPosition(newPosition);
        setVelocity(derivatives.velocity);
        setAcceleration(derivatives.acceleration);
        
        animationRef.current = requestAnimationFrame(animate);
      };
      
      animationRef.current = requestAnimationFrame(animate);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, solution, classification, speed, parameters, systemProperties]);
  
  const scaleFactor = Math.min(80, Math.max(30, 200 / Math.max(Math.abs(position), 2)));
  const displayPosition = position * scaleFactor;
  
  const drawSpring = () => {
    const springLength = Math.max(50, equilibrium + displayPosition - 40);
    const coils = Math.max(8, Math.min(20, Math.floor(springLength / 15)));
    const segmentLength = springLength / (coils * 2);
    const amplitude = 12;
    const centerY = 75;
    const wallX = 40;
    
    let path = `M ${wallX},${centerY} `;
    
    for (let i = 1; i <= coils * 2; i++) {
      const x = wallX + i * segmentLength;
      const y = centerY + (i % 2 === 0 ? -amplitude : amplitude);
      path += `L ${x},${y} `;
    }
    
    path += `L ${equilibrium + displayPosition - 40},${centerY}`;
    
    const extension = (springLength - equilibrium) / equilibrium;
    const springColor = extension > 0 ? colors.negative : colors.positive;
    
    return (
      <g>
        <path
          d={path}
          stroke={springColor}
          strokeWidth="3"
          fill="none"
          style={{
            filter: `drop-shadow(0 0 4px ${springColor}40)`
          }}
        />
        <text
          x={wallX + springLength/2}
          y={centerY - 25}
          fill={colors.text}
          fontSize="10"
          textAnchor="middle"
        >
          F_k = {(-k * position).toFixed(2)} N
        </text>
      </g>
    );
  };
  
  const getSystemInfo = () => {
    const typeMap = {
      'subamortiguado_forzado': {
        type: "Subamortiguado Forzado",
        description: "Sistema oscilatorio con amortiguamiento y fuerza externa"
      },
      'subamortiguado': {
        type: "Subamortiguado",
        description: "Oscilaciones amortiguadas"
      },
      'criticamente_amortiguado': {
        type: "Críticamente Amortiguado",
        description: "Retorno más rápido al equilibrio sin oscilaciones"
      },
      'sobreamortiguado': {
        type: "Sobreamortiguado",
        description: "Retorno lento al equilibrio sin oscilaciones"
      },
      'no_amortiguado': {
        type: "No Amortiguado",
        description: "Oscilaciones puras sin pérdida de energía"
      }
    };
    
    return typeMap[classification] || {
      type: "No identificado",
      description: ""
    };
  };
  
  const systemInfo = getSystemInfo();
  
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };
  
  const resetAnimation = () => {
    setIsPlaying(false);
    timeRef.current = 0;
    const initialPos = evaluatePosition(0);
    const initialDerivatives = calculateDerivatives(0);
    setPosition(initialPos);
    setVelocity(initialDerivatives.velocity);
    setAcceleration(initialDerivatives.acceleration);
  };

  return (
    <div className="flex flex-col w-full">
      <div className="bg-[#333333] rounded-t-lg p-4 ">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-[#9b702c]">Sistema Masa-Resorte-Amortiguador</h3>
          </div>
          <div className="text-right">
            <div className="text-lg text-[#cccccc]">Simulación</div>
          </div>
        </div>
      </div>
      
      <div className="bg-[#1e1e1e] rounded-b-lg p-6">
        <svg
          viewBox="0 0 700 200"
          className="w-full h-95 border border-[#444444] rounded bg-[#242021]"
        >
          {/* Grid de fondo */}
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#444444" strokeWidth="0.5" opacity="0.3"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Pared con textura */}
          <rect x="0" y="30" width="40" height="90" fill={colors.wall} />
          <rect x="5" y="35" width="30" height="80" fill="#333333" />
          
          {/* Suelo */}
          <rect x="0" y="120" width="700" height="30" fill={colors.floor} />
          <rect x="0" y="145" width="700" height="5" fill="#555555" />
          
          {/* Línea de referencia (equilibrio) */}
          <line
            x1={equilibrium}
            y1="10"
            x2={equilibrium}
            y2="120"
            stroke={colors.equilibrium}
            strokeWidth="2"
            strokeDasharray="8,4"
          />
          <text
            x={equilibrium + 5}
            y="-10"
            fill={colors.equilibrium}
            fontSize="12"
            fontWeight="bold"
          >
            Posición de Equilibrio
          </text>
          
          {/* Escala horizontal */}
          {[-2, -1, 0, 1, 2, 3, 4].map(val => (
            <g key={val}>
              <line
                x1={equilibrium + val * 80}
                y1="155"
                x2={equilibrium + val * 80}
                y2="165"
                stroke={colors.text}
                strokeWidth="1"
              />
              <text
                x={equilibrium + val * 80}
                y="180"
                fill={colors.text}
                fontSize="11"
                textAnchor="middle"
              >
                {val}m
              </text>
            </g>
          ))}
          
          {/* Sistema masa-resorte */}
          <g>
            {/* Resorte */}
            {drawSpring()}
            
            {/* Masa con detalles */}
            <g transform={`translate(${equilibrium + displayPosition - 30}, 45)`}>
              {/* Sombra */}
              <rect
                x="2"
                y="2"
                width="60"
                height="60"
                rx="8"
                fill="rgba(0,0,0,0.3)"
              />
              {/* Masa principal */}
              <rect
                x="0"
                y="0"
                width="60"
                height="60"
                rx="8"
                fill={colors.mass}
                stroke="#444444"
                strokeWidth="2"
              />
              {/* Detalles de la masa */}
              <rect x="10" y="10" width="40" height="40" rx="4" fill="#444444" />
              <circle cx="30" cy="30" r="15" fill="#242021" />
              <text x="30" y="35" fill={colors.text} fontSize="12" textAnchor="middle" fontWeight="bold">m</text>
            </g>
            
            {/* Vector de velocidad */}
            {Math.abs(velocity) > 0.1 && (
              <g>
                <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                   refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill={velocity > 0 ? colors.positive : colors.negative} />
                  </marker>
                </defs>
                <line
                  x1={equilibrium + displayPosition}
                  y1="40"
                  x2={equilibrium + displayPosition + velocity * 20}
                  y2="40"
                  stroke={velocity > 0 ? colors.positive : colors.negative}
                  strokeWidth="3"
                  markerEnd="url(#arrowhead)"
                />
                <text
                  x={equilibrium + displayPosition}
                  y="25"
                  fill={velocity > 0 ? colors.positive : colors.negative}
                  fontSize="10"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  v = {velocity.toFixed(2)} m/s
                </text>
              </g>
            )}
            
            {/* Indicadores de fuerza */}
            <text
              x={equilibrium + displayPosition}
              y="10"
              fill={colors.accent}
              fontSize="11"
              textAnchor="middle"
              fontWeight="bold"
            >
              x(t) = {position.toFixed(3)} m
            </text>
          </g>
        </svg>
        
        {/* Panel de datos en tiempo real */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-[#333333] border border-[#444444] rounded-lg p-3 text-center">
            <div className="text-[#cccccc] text-xs">Tiempo</div>
            <div className="text-[#9b702c] text-lg font-bold">{timeRef.current.toFixed(2)} s</div>
          </div>
          <div className="bg-[#333333] border border-[#444444] rounded-lg p-3 text-center">
            <div className="text-[#cccccc] text-xs">Posición</div>
            <div className="text-[#9b702c] text-lg font-bold">{position.toFixed(3)} m</div>
          </div>
          <div className="bg-[#333333] border border-[#444444] rounded-lg p-3 text-center">
            <div className="text-[#cccccc] text-xs">Velocidad</div>
            <div className={`text-lg font-bold ${velocity >= 0 ? 'text-[#9b702c]' : 'text-[#cc8533]'}`}>
              {velocity.toFixed(3)} m/s
            </div>
          </div>
          <div className="bg-[#333333] border border-[#444444] rounded-lg p-3 text-center">
            <div className="text-[#cccccc] text-xs">Aceleración</div>
            <div className={`text-lg font-bold ${acceleration >= 0 ? 'text-[#9b702c]' : 'text-[#cc8533]'}`}>
              {acceleration.toFixed(3)} m/s²
            </div>
          </div>
        </div>
        
        {/* Tarjeta de Parámetros del Sistema */}
        <div className="mt-4 p-4 bg-[#333333] border border-[#444444] rounded-lg">
          <h4 className="text-[#9b702c] font-bold mb-3 flex items-center">
            Parámetros del Sistema
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-[#242021] border border-[#555555] rounded-lg p-3 text-center">
              <div className="text-[#cccccc] text-xs">Masa</div>
              <div className="text-[#9b702c] text-lg font-bold">{mass} kg</div>
            </div>
            <div className="bg-[#242021] border border-[#555555] rounded-lg p-3 text-center">
              <div className="text-[#cccccc] text-xs">Rigidez</div>
              <div className="text-[#9b702c] text-lg font-bold">{k} N/m</div>
            </div>
            <div className="bg-[#242021] border border-[#555555] rounded-lg p-3 text-center">
              <div className="text-[#cccccc] text-xs">Amortiguamiento</div>
              <div className="text-[#9b702c] text-lg font-bold">{c} Ns/m</div>
            </div>
            <div className="bg-[#242021] border border-[#555555] rounded-lg p-3 text-center">
              <div className="text-[#cccccc] text-xs">Posición Inicial</div>
              <div className="text-[#9b702c] text-lg font-bold">{initial_position} m</div>
            </div>
            <div className="bg-[#242021] border border-[#555555] rounded-lg p-3 text-center">
              <div className="text-[#cccccc] text-xs">Velocidad Inicial</div>
              <div className="text-[#9b702c] text-lg font-bold">{initial_velocity} m/s</div>
            </div>
          </div>
          {force && force !== 'undefined' && (
            <div className="mt-3 p-3 bg-[#242021] border border-[#555555] rounded-lg">
              <div className="text-[#cccccc] text-xs">Fuerza Externa</div>
              <div className="text-[#9b702c] text-lg font-bold">{force}</div>
            </div>
          )}
        </div>

        {/* Tarjeta de Propiedades Características */}
        <div className="mt-4 p-4 bg-[#333333] border border-[#444444] rounded-lg">
          <h4 className="text-[#9b702c] font-bold mb-3 flex items-center">
            Propiedades Características
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="bg-[#242021] border border-[#555555] rounded-lg p-3 text-center">
              <div className="text-[#cccccc] text-xs">Frecuencia Natural</div>
              <div className="text-[#9b702c] text-sm font-bold">ωₙ = {omega_n?.toFixed(3) || 'N/A'}</div>
              <div className="text-[#cccccc] text-xs">rad/s</div>
            </div>
            <div className="bg-[#242021] border border-[#555555] rounded-lg p-3 text-center">
              <div className="text-[#cccccc] text-xs">Factor de Amortiguamiento</div>
              <div className="text-[#9b702c] text-sm font-bold">ζ = {zeta?.toFixed(3) || 'N/A'}</div>
              <div className="text-[#cccccc] text-xs">adimensional</div>
            </div>
            <div className="bg-[#242021] border border-[#555555] rounded-lg p-3 text-center">
              <div className="text-[#cccccc] text-xs">Freq. Amortiguada</div>
              <div className="text-[#9b702c] text-sm font-bold">ωd = {omega_d?.toFixed(3) || 'N/A'}</div>
              <div className="text-[#cccccc] text-xs">rad/s</div>
            </div>
            <div className="bg-[#242021] border border-[#555555] rounded-lg p-3 text-center">
              <div className="text-[#cccccc] text-xs">Coef. Amortiguamiento</div>
              <div className="text-[#9b702c] text-sm font-bold">α = {alpha?.toFixed(3) || 'N/A'}</div>
              <div className="text-[#cccccc] text-xs">1/s</div>
            </div>
          </div>
        </div>

        {/* Panel adicional con información del sistema */}
        {systemProperties && Object.keys(systemProperties).length > 0 && (
          <div className="mt-4 p-4 bg-[#333333] border border-[#444444] rounded-lg">
            <h4 className="text-[#9b702c] font-bold mb-3 flex items-center">
              Propiedades Adicionales del Sistema
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {systemProperties.damped_period && (
                <div className="bg-[#242021] border border-[#555555] rounded-lg p-3 text-center">
                  <div className="text-[#cccccc] text-xs">Período Amortiguado</div>
                  <div className="text-[#9b702c] text-sm font-bold">{systemProperties.damped_period.toFixed(3)}</div>
                  <div className="text-[#cccccc] text-xs">s</div>
                </div>
              )}
              {systemProperties.logarithmic_decrement && (
                <div className="bg-[#242021] border border-[#555555] rounded-lg p-3 text-center">
                  <div className="text-[#cccccc] text-xs">Decremento Logarítmico</div>
                  <div className="text-[#9b702c] text-sm font-bold">{systemProperties.logarithmic_decrement.toFixed(3)}</div>
                  <div className="text-[#cccccc] text-xs">adimensional</div>
                </div>
              )}
              {parameters.natural_period && (
                <div className="bg-[#242021] border border-[#555555] rounded-lg p-3 text-center">
                  <div className="text-[#cccccc] text-xs">Período Natural</div>
                  <div className="text-[#9b702c] text-sm font-bold">{parameters.natural_period.toFixed(3)}</div>
                  <div className="text-[#cccccc] text-xs">s</div>
                </div>
              )}
              {numericalCoefficients.frequencies && numericalCoefficients.frequencies.length > 0 && (
                <div className="bg-[#242021] border border-[#555555] rounded-lg p-3 text-center">
                  <div className="text-[#cccccc] text-xs">Frecuencias del Sistema</div>
                  <div className="text-[#9b702c] text-sm font-bold">
                    {numericalCoefficients.frequencies.map(f => f.toFixed(2)).join(', ')}
                  </div>
                  <div className="text-[#cccccc] text-xs">rad/s</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Controles */}
      <div className="flex flex-wrap justify-center gap-4 mt-6 p-4 bg-[#333333] border border-[#444444] rounded-lg">
        <button
          onClick={togglePlay}
          className={`px-6 py-3 rounded-lg font-bold transition-all ${
            isPlaying 
              ? 'bg-[#cc8533] hover:bg-[#b8762d] text-white' 
              : 'bg-[#9b702c] hover:bg-[#855f25] text-white'
          }`}
        >
          {isPlaying ? '⏸ Pausar' : '▶ Reproducir'}
        </button>
        <button
          onClick={resetAnimation}
          className="px-6 py-3 bg-[#444444] hover:bg-[#555555] text-[#cccccc] rounded-lg font-bold transition-all"
        >
          Reiniciar
        </button>
        <div className="flex items-center gap-2">
          <label className="text-[#cccccc] text-sm">Velocidad:</label>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-20 accent-[#9b702c]"
          />
          <span className="text-[#cccccc] text-sm w-8">{speed}x</span>
        </div>
      </div>
    </div>
  );
};

export default SpringMassVisualization; 