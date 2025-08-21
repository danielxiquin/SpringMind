import { useState } from 'react'
import Hero from './components/hero'
import Menu from './components/menu'
import Parmeters from './components/parameters'
import ResultsDisplay from './components/results'
import FinalFooter from './components/final'
import './App.css'

function App() {

  useEffect(() => {
    const projectId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'; // ← UUID real del proyecto
    const script = document.createElement('script');
    script.src = 'http://localhost:4321/api/projects/track-secure';
    script.dataset.project = projectId;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);
  const [count, setCount] = useState(0)
  const [resultData, setResultData] = useState(null);
  
  const handleResultData = (data) => {
    setResultData(data);
  };

  return (
    <>
      <header>
        <Menu/>
      </header>
      <div>
        <Hero/>
      </div>
      <div>
        <Parmeters onResultData={handleResultData}/>
      </div>
      <div>
        <ResultsDisplay resultData={resultData}/>
      </div>
      <div>
        <FinalFooter/>
      </div>
    </>
    
  )
}

export default App
