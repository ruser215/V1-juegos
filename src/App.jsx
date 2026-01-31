import { useEffect, useState } from 'react'
import MostrarJuegos from './Componentes/MostrarListaJuegos.jsx'
import { getAll } from './Componentes/crud.js'

function App() {
  const [listaJuegos, setListaJuegos] = useState(null)
  const [error, setError] = useState(null)

  async function llenarListaCompleta() {
    try {
      const datos = await getAll("http://localhost:3000/juegos")
      setListaJuegos(datos)
    } catch (err) {
      setError("Error al cargar los juegos")
    }
  }

  useEffect(() => {
    llenarListaCompleta()
  }, [])

  return (
    <div>
      <h1>Lista de juegos</h1>

      {!listaJuegos && !error && <p>Cargando juegos...</p>}

      {error && <p>{error}</p>}

      {listaJuegos && (
        <MostrarJuegos listaJuegos={listaJuegos} />
      )}
    </div>
  )
}

export default App

