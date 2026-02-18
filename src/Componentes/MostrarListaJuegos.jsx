import { useState } from "react";
import "../Estilos/MostrarJuegos.css";

function MostrarJuegos({ listaJuegos, listaCategorias, listaPlataformas, onEliminarJuego }) {
  const [juegoActivo, setJuegoActivo] = useState(null);
  const [imagenSeleccionada, setImagenSeleccionada] = useState("");

  const cortarTexto = (texto, limite = 100) => {
    return texto.length > limite ? texto.substring(0, limite) + "..." : texto;
  };

  // Función para obtener nombres de categorías
  const obtenerCategorias = (ids) => {
    return listaCategorias
      .filter(cat => ids.includes(String(cat.id)))
      .map(cat => cat.nombre);
  };

  // Función para obtener nombres de plataformas
  const obtenerPlataformas = (ids) => {
    return listaPlataformas
      .filter(plat => ids.includes(String(plat.id)))
      .map(plat => plat.nombre);
  };

  const obtenerCampo = (juego, campos) => {
    for (const campo of campos) {
      if (juego[campo]) return juego[campo];
    }
    return "No disponible";
  };

  const obtenerListaImagenes = (juego) => {
    const imagenes = [
      juego.Portada,
      juego.portada,
      juego.urlImagen,
      juego.url_imagen,
      ...(Array.isArray(juego.imagenes) ? juego.imagenes : [])
    ].filter(Boolean);

    return [...new Set(imagenes)];
  };

  const obtenerUrlVideo = (juego) => {
    return juego.video || juego.urlVideo || juego.url_video || "";
  };

  const convertirYoutubeAEmbed = (urlVideo) => {
    if (!urlVideo) return "";

    if (urlVideo.includes("youtube.com/watch?v=")) {
      const id = urlVideo.split("v=")[1]?.split("&")[0];
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    if (urlVideo.includes("youtu.be/")) {
      const id = urlVideo.split("youtu.be/")[1]?.split("?")[0];
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    return "";
  };

  const eliminarJuego = async () => {
    if (!juegoActivo) return;
    const confirmado = window.confirm(`¿Eliminar ${juegoActivo.nombre}?`);
    if (!confirmado) return;

    await onEliminarJuego(juegoActivo.id);
    setJuegoActivo(null);
    setImagenSeleccionada("");
  };

  const abrirModal = (juego) => {
    const imagenes = obtenerListaImagenes(juego);
    setJuegoActivo(juego);
    setImagenSeleccionada(imagenes[0] || juego.Portada || "");
  };

  const cerrarModal = () => {
    setJuegoActivo(null);
    setImagenSeleccionada("");
  };

  // Función para asignar clase según plataforma
  const clasePlataforma = (nombre) => {
    switch (nombre.toLowerCase()) {
      case "pc": return "plat-pc";
      case "playstation 5": return "plat-ps5";
      case "playstation 4": return "plat-ps4";
      case "xbox series x/s": return "plat-xboxsx";
      case "xbox one": return "plat-xboxone";
      case "nintendo switch": return "plat-switch";
      case "ios": return "plat-ios";
      case "android": return "plat-android";
      case "mac": return "plat-mac";
      case "linux": return "plat-linux";
      default: return "plat-default";
    }
  };

  return (
    <>
      {/* Tarjetas de juegos */}
      <div className="grid-juegos">
        {listaJuegos.map((juego) => (
          <div
            key={juego.id}
            className="card-juego"
            onClick={() => abrirModal(juego)}
          >
            <img src={juego.Portada} alt={juego.nombre} />
            <h2>{juego.nombre}</h2>
            <p>{cortarTexto(juego.Descripcion)}</p>
            <div className="chips">
              {obtenerPlataformas(juego.plataforma_ids).map(plat => (
                <span key={plat} className={`chip plataforma ${clasePlataforma(plat)}`}>
                  {plat}
                </span>
              ))}
            </div>
            <p className="precio">€{juego.precio}</p>
          </div>
        ))}
      </div>

      {/* Modal emergente */}
      {juegoActivo && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-left">
              <img src={imagenSeleccionada || juegoActivo.Portada} alt={juegoActivo.nombre} />
              {obtenerListaImagenes(juegoActivo).length > 1 && (
                <div className="media-fila">
                  {obtenerListaImagenes(juegoActivo).map((imagen, indice) => (
                    <img
                      key={`${imagen}-${indice}`}
                      src={imagen}
                      alt={`${juegoActivo.nombre} ${indice + 1}`}
                      onClick={() => setImagenSeleccionada(imagen)}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="modal-right">
              <h2>{juegoActivo.nombre}</h2>
              <p>{juegoActivo.Descripcion}</p>
              <p><strong>Fecha de lanzamiento:</strong> {obtenerCampo(juegoActivo, ["fecha_lanzamiento", "fechaLanzamiento", "fecha"])} </p>
              <p><strong>Compañía:</strong> {obtenerCampo(juegoActivo, ["compania", "compañia", "empresa"])} </p>

              {!!obtenerUrlVideo(juegoActivo) && (
                <div className="video-container">
                  {convertirYoutubeAEmbed(obtenerUrlVideo(juegoActivo)) ? (
                    <iframe
                      src={convertirYoutubeAEmbed(obtenerUrlVideo(juegoActivo))}
                      title={`Trailer de ${juegoActivo.nombre}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video controls src={obtenerUrlVideo(juegoActivo)} />
                  )}
                </div>
              )}

              <div className="chips">
                {obtenerCategorias(juegoActivo.categoria_ids).map(cat => (
                  <span key={cat} className="chip categoria">{cat}</span>
                ))}
              </div>

              <div className="chips">
                {obtenerPlataformas(juegoActivo.plataforma_ids).map(plat => (
                  <span key={plat} className={`chip plataforma ${clasePlataforma(plat)}`}>
                    {plat}
                  </span>
                ))}
              </div>

              <p className="precio-modal">Precio: €{juegoActivo.precio}</p>
              <button onClick={eliminarJuego}>Eliminar videojuego</button>
              <button onClick={cerrarModal}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MostrarJuegos;





