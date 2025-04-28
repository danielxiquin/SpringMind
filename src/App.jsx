import { useState } from 'react'
import Hero from './components/hero'
import Menu from './components/menu'
import Parmeters from './components/parameters'
import ResultsDisplay from './components/results'
import './App.css'

function App() {
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
    </>
    
  )
}

export default App
