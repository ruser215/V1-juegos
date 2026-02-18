import { Routes, Route } from "react-router-dom";
import ListaJuegos from "./paginas/ListaJuegos";

function App() {
  

  return (
    <Routes>
      <Route path="/" element={<ListaJuegos />} />
    </Routes>
  );
}

export default App;



