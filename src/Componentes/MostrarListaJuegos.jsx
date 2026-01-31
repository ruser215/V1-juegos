import { useState } from "react";
import "../Estilos/MostrarJuegos.css";

function MostrarJuegos({ listaJuegos }) {
  const [juegoActivo, setJuegoActivo] = useState(null);

  const cortarTexto = (texto, limite = 100) => {
    return texto.length > limite
      ? texto.substring(0, limite) + "..."
      : texto;
  };

  return (
    <>
      <div className="grid-juegos">
        {listaJuegos.map((juego) => (
          <div
            key={juego.id}
            className="card-juego"
            onClick={() => setJuegoActivo(juego)}
          >
            <img src={juego.Portada} alt={juego.nombre} />
            <h2>{juego.nombre}</h2>
            <p>{cortarTexto(juego.Descripcion)}</p>
          </div>
        ))}
      </div>

      {juegoActivo && (
        <div className="modal-overlay" onClick={() => setJuegoActivo(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <img src={juegoActivo.Portada} alt={juegoActivo.nombre} />
            <h2>{juegoActivo.nombre}</h2>
            <p>{juegoActivo.Descripcion}</p>
            <button onClick={() => setJuegoActivo(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </>
  );
}

export default MostrarJuegos;

