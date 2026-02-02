import { useState } from "react";
import "../Estilos/MostrarJuegos.css";

function MostrarJuegos({ listaJuegos, listaCategorias, listaPlataformas }) {
  const [juegoActivo, setJuegoActivo] = useState(null);

  const obtenerNombres = (ids, lista) =>
    lista
      .filter(item => ids.includes(String(item.id)))
      .map(item => item.nombre);


  
  return (
    <>
      {/* ===== GRID DE TARJETAS ===== */}
      <div className="grid-juegos">
        {listaJuegos.map(juego => (
          <div
            key={juego.id}
            className="card-juego"
            onClick={() => setJuegoActivo(juego)}
          >
            <img src={juego.Portada} alt={juego.nombre} />
            <h3>{juego.nombre}</h3>
            <span className="precio">{juego.precio} €</span>
          </div>
        ))}
      </div>

      {/* ===== MODAL ===== */}
      {juegoActivo && (
        <div className="modal-overlay" onClick={() => setJuegoActivo(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            
            <img
              src={juegoActivo.Portada}
              alt={juegoActivo.nombre}
              className="modal-portada"
            />

            <div className="modal-info">
              <h2>{juegoActivo.nombre}</h2>
              <p>{juegoActivo.Descripcion}</p>

              <h4>Categorías</h4>
              <div className="chips">
                {obtenerNombres(juegoActivo.categoria_ids, listaCategorias).map(cat => (
                  <span key={cat} className="chip categoria">{cat}</span>
                ))}
              </div>

              <h4>Plataformas</h4>
              <div className="chips">
                {obtenerNombres(juegoActivo.plataforma_ids, listaPlataformas).map(plat => (
                  <span key={plat} className="chip plataforma">{plat}</span>
                ))}
              </div>

              <div className="precio-modal">{juegoActivo.precio} €</div>

              <button onClick={() => setJuegoActivo(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MostrarJuegos;




