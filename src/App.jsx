import { useState } from 'react'
import Hero from './components/hero'
import Menu from './components/menu'
import Parmeters from './components/parameters'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <header>
        <Menu/>
      </header>
      <div>
        <Hero/>
      </div>
      <div>
        <Parmeters/>
      </div>
    </>
    
  )
}

export default App
