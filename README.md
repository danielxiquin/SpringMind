# 🧠 SpringMind

SpringMind es una API avanzada desarrollada en Python que resuelve sistemas resorte-masa-amortiguador utilizando algoritmos simbólicos optimizados. Este backend forma parte de un proyecto web completo que incluye frontend y backend desarrollados por [@danielxiquin](https://github.com/danielxiquin).

## 🚀 Características principales

- ✅ Soporte para entradas físicas (`masa`, `rigidez`, `amortiguamiento`) y canónicas (`beta`, `omega²`)
- ✅ Resolución simbólica de ecuaciones diferenciales con fuerza externa compleja
- ✅ Clasificación automática del sistema (`subamortiguado`, `sobreamortiguado`, `criticamente_amortiguado`, `no_amortiguado`)
- ✅ Análisis de fuerzas: sinusoidal, exponencial, polinomial, constante y combinaciones
- ✅ Simplificación avanzada de soluciones simbólicas
- ✅ Aplicación inteligente de condiciones iniciales
- ✅ Análisis numérico y verificación de estabilidad
- ✅ Retorno de propiedades físicas útiles como:
 - Frecuencia natural
 - Razón de amortiguamiento
 - Tiempo de asentamiento
 - Análisis de resonancia
 - Factor de calidad
 - Periodo amortiguado y más

## 📦 Tecnologías utilizadas

- 🐍 **Python 3.11+**
- 🔬 **[SymPy](https://www.sympy.org/en/index.html)** - Matemática simbólica
- 📊 **NumPy** - Computación numérica
- ⚡ **FastAPI** - Framework web moderno
- 🌐 **Frontend externo** (React + Astro, no incluido en este repo)

## 📐 ¿Qué puede resolver?

SpringMind resuelve ecuaciones diferenciales de segundo orden del tipo:

### Forma física:
m·x'' + c·x' + k·x = f(t)

### Forma canónica:
x'' + 2·β·x' + ω₀²·x = f(t)

Con condiciones iniciales opcionales:
- Posición inicial: `x(0)`
- Velocidad inicial: `x'(0)`

Y fuerzas externas de la forma:
- `sin(ωt)`, `cos(ωt)`
- `exp(-t)`, `exp(-0.1t)*cos(5t)`
- `t² + 3`
- Combinaciones como `exp(-0.2t)*sin(2t) + 5`

## 📂 Estructura del proyecto

SpringMind/
├── solver.py          # Clase principal del solver simbólico
├── models.py          # Modelo de entrada (SystemParams)
├── main.py            # Archivo de entrada de FastAPI
├── requirements.txt   # Dependencias del proyecto
└── README.md         # Este archivo

## 🛠 Instalación y uso

### 1. Clona el repositorio
```bash
git clone https://github.com/danielxiquin/SpringMind.git
cd SpringMind

2. Crea y activa un entorno virtual (recomendado)
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

3. Instala las dependencias
pip install -r requirements.txt

4. Ejecuta el servidor de desarrollo
uvicorn main:app --reload

5. Accede a la documentación interactiva
Abre tu navegador en: http://localhost:8000/docs

POST /api/solver
Content-Type: application/json

 Ejemplo de uso
{
  "mass": 2,
  "stiffness": 8,
  "damping": 1,
  "force": "5*cos(3*t)",
  "initial_position": 0,
  "initial_velocity": 1
}

{
  "equation": "2 x''(t) + x'(t) + 8 x(t) = 5 cos(3 t)",
  "solution": "exp(...) + sin(...) + ...",
  "classification": "subamortiguado_forzado",
  "system_properties": {
    "natural_frequency": 2.0,
    "damping_coefficient": 0.25,
    "quality_factor": 4.0,
    "time_constant": 4.0,
    "damped_frequency": 1.9849,
    "damped_period": 3.166
  },
  "numerical_analysis": {
    "solution_type": "analytical",
    "complexity_metrics": {
      "total_terms": 6,
      "trig_terms": 2,
      "exp_terms": 1
    },
    "stability": {
      "is_stable": true
    }
  },
  "performance_metrics": {
    "solve_time": 0.123,
    "cache_hits": 12,
    "complexity_score": 47.8
  }
}
```
##Frontend
Esta API se puede conectar con cualquier cliente HTTP. En este proyecto, se ha integrado con un frontend moderno desarrollado en Astro + React, que permite:

Formulario para ingreso de parámetros físicos o canónicos
Visualización interactiva de la solución y sus propiedades
Exportación de resultados en LaTeX

##Dependencias
sympy>=1.12
numpy>=1.24.0
fastapi>=0.103.0
uvicorn>=0.23.0
