import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client from "../../api/client";
import Loading from "../../Componentes/Loading";
import NavV2 from "../../Componentes/NavV2";
import { useAuth } from "../../context/AuthContext";
import "../../Estilos/TodosJuegosV2.css";

function TodosJuegosPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState([]);
  const [error, setError] = useState("");
  const [juegoActivo, setJuegoActivo] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [plataformas, setPlataformas] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState([]);
  const [plataformasSeleccionadas, setPlataformasSeleccionadas] = useState([]);

  const comprar = (idJuego) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    navigate("/carrito");
  };

  const toggleJuegoActivo = (game) => {
    setJuegoActivo((prev) => (prev?.id === game.id ? null : game));
  };

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const [gamesResponse, categoriasResponse, plataformasResponse] = await Promise.all([
          client.get("/games?page=1&limit=20"),
          client.get("/catalogo/categorias"),
          client.get("/catalogo/plataformas")
        ]);

        setGames(gamesResponse.data.data);
        setCategorias(categoriasResponse.data);
        setPlataformas(plataformasResponse.data);
        setCategoriasSeleccionadas([]);
        setPlataformasSeleccionadas([]);
      } catch (e) {
        setError(e?.response?.data?.message || "No se pudieron cargar los juegos");
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  const nombresCategorias = (ids = []) => {
    if (!Array.isArray(ids)) return [];
    return ids
      .map((id) => categorias.find((categoria) => String(categoria.id) === String(id))?.nombre)
      .filter(Boolean);
  };

  const textoCategorias = (ids = []) => {
    const nombres = nombresCategorias(ids);
    if (nombres.length > 0) return nombres.join(", ");
    if (!Array.isArray(ids) || ids.length === 0) return "No disponible";
    return ids.join(", ");
  };

  const nombresPlataformas = (ids = []) => {
    if (!Array.isArray(ids)) return [];
    return ids
      .map((id) => plataformas.find((plataforma) => String(plataforma.id) === String(id))?.nombre)
      .filter(Boolean);
  };

  const textoPlataformas = (ids = []) => {
    const nombres = nombresPlataformas(ids);
    if (nombres.length > 0) return nombres.join(", ");
    if (!Array.isArray(ids) || ids.length === 0) return "No disponible";
    return ids.join(", ");
  };

  const videoEmbed = (url = "") => {
    if (!url) return "";
    if (url.includes("youtube.com/watch?v=")) {
      const id = url.split("v=")[1]?.split("&")[0];
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }
    if (url.includes("youtu.be/")) {
      const id = url.split("youtu.be/")[1]?.split("?")[0];
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }
    return "";
  };

  const toggleCategoria = (idCategoria) => {
    setCategoriasSeleccionadas((prev) =>
      prev.includes(idCategoria)
        ? prev.filter((id) => id !== idCategoria)
        : [...prev, idCategoria]
    );
  };

  const togglePlataforma = (idPlataforma) => {
    setPlataformasSeleccionadas((prev) =>
      prev.includes(idPlataforma)
        ? prev.filter((id) => id !== idPlataforma)
        : [...prev, idPlataforma]
    );
  };

  const gamesFiltrados = games.filter((game) => {
    const coincideBusqueda =
      busqueda.trim() === "" ||
      game.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      game.descripcion?.toLowerCase().includes(busqueda.toLowerCase());

    const coincideCategoria =
      categoriasSeleccionadas.length === 0 ||
      (Array.isArray(game.categoria_ids) &&
        game.categoria_ids.some((id) => categoriasSeleccionadas.includes(String(id))));

    const coincidePlataforma =
      plataformasSeleccionadas.length === 0 ||
      (Array.isArray(game.plataforma_ids) &&
        game.plataforma_ids.some((id) => plataformasSeleccionadas.includes(String(id))));

    return coincideBusqueda && coincideCategoria && coincidePlataforma;
  });

  if (loading) return <Loading texto="Cargando videojuegos..." />;

  return (
    <main className="v2-page">
      <NavV2 />
      <h1 className="v2-heading">Todos los videojuegos</h1>
      {error && <p>{error}</p>}

      <section className="v2-filtros">
        <div className="v2-search-box">
          <label htmlFor="buscador-juegos">Buscar juego</label>
          <input
            id="buscador-juegos"
            className="v2-search-input"
            type="text"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Nombre o descripción"
          />
        </div>

        <div className="v2-filtro-grupo">
          <h3>Categorías</h3>
          <div className="v2-filtro-checks">
            {categorias.map((categoria) => (
              <label key={categoria.id} className="v2-check-item">
                <input
                  type="checkbox"
                  className="v2-check-input"
                  checked={categoriasSeleccionadas.includes(String(categoria.id))}
                  onChange={() => toggleCategoria(String(categoria.id))}
                />
                <span>{categoria.nombre}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="v2-filtro-grupo">
          <h3>Plataformas</h3>
          <div className="v2-filtro-checks">
            {plataformas.map((plataforma) => (
              <label key={plataforma.id} className="v2-check-item">
                <input
                  type="checkbox"
                  className="v2-check-input"
                  checked={plataformasSeleccionadas.includes(String(plataforma.id))}
                  onChange={() => togglePlataforma(String(plataforma.id))}
                />
                <span>{plataforma.nombre}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {gamesFiltrados.length === 0 && (
        <p className="v2-empty">No hay juegos que coincidan con los filtros actuales.</p>
      )}

      <ul className="v2-grid">
        {gamesFiltrados.map((game) => (
          <li key={game.id} className="v2-card" onClick={() => toggleJuegoActivo(game)}>
            {game.portada && (
              <img src={game.portada} alt={game.nombre} />
            )}
            <strong className="v2-title">{game.nombre}</strong>
            <span className="v2-sub">Añadido por: {game.owner_username}</span>
            <span className="v2-sub">
              {(game.descripcion || "").slice(0, 100)}{(game.descripcion || "").length > 100 ? "..." : ""}
            </span>
            <span className="v2-sub"><strong>Géneros:</strong> {textoCategorias(game.categoria_ids)}</span>
            <span className="v2-sub"><strong>Plataformas:</strong> {textoPlataformas(game.plataforma_ids)}</span>
            <span className="v2-price">€{game.precio}</span>
            <div className="v2-card-actions">
              <Link className="v2-link-btn" to={`/juegos/${game.id}`} onClick={(event) => event.stopPropagation()}>Ver más</Link>
              <button
                className="v2-buy-btn"
                onClick={(event) => {
                  event.stopPropagation();
                  comprar(game.id);
                }}
              >
                Comprar
              </button>
            </div>
          </li>
        ))}
      </ul>

      {juegoActivo && (
        <div onClick={() => setJuegoActivo(null)} className="v2-overlay">
          <div onClick={(event) => event.stopPropagation()} className="v2-modal">
            <div className="v2-modal-left">
              {juegoActivo.portada && <img src={juegoActivo.portada} alt={juegoActivo.nombre} />}
            </div>
            <div className="v2-modal-right">
              <h2>{juegoActivo.nombre}</h2>
              <p><strong>Descripción completa:</strong> {juegoActivo.descripcion || "No disponible"}</p>
              <p><strong>Fecha de lanzamiento:</strong> {juegoActivo.fecha_lanzamiento || "No disponible"}</p>
              <p><strong>Compañía:</strong> {juegoActivo.compania || "No disponible"}</p>
              <p><strong>Añadido por:</strong> {juegoActivo.owner_username || "No disponible"}</p>
              <p><strong>Precio:</strong> €{juegoActivo.precio}</p>

              <div>
                <strong>Géneros</strong>
                <p>{textoCategorias(juegoActivo.categoria_ids)}</p>
                <div className="v2-chips">
                  {nombresCategorias(juegoActivo.categoria_ids).length > 0 ? (
                    nombresCategorias(juegoActivo.categoria_ids).map((nombre) => (
                      <span key={nombre} className="v2-chip">{nombre}</span>
                    ))
                  ) : (
                    <span className="v2-sub">IDs: {Array.isArray(juegoActivo.categoria_ids) ? juegoActivo.categoria_ids.join(", ") : "No disponible"}</span>
                  )}
                </div>
              </div>

              <div>
                <strong>Plataformas</strong>
                <p>{textoPlataformas(juegoActivo.plataforma_ids)}</p>
                <div className="v2-chips">
                  {nombresPlataformas(juegoActivo.plataforma_ids).length > 0 ? (
                    nombresPlataformas(juegoActivo.plataforma_ids).map((nombre) => (
                      <span key={nombre} className="v2-chip plat">{nombre}</span>
                    ))
                  ) : (
                    <span className="v2-sub">IDs: {Array.isArray(juegoActivo.plataforma_ids) ? juegoActivo.plataforma_ids.join(", ") : "No disponible"}</span>
                  )}
                </div>
              </div>

              {!!juegoActivo.video && (
                <div className="v2-video">
                  {videoEmbed(juegoActivo.video) ? (
                    <iframe
                      src={videoEmbed(juegoActivo.video)}
                      title={`Trailer de ${juegoActivo.nombre}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video src={juegoActivo.video} controls />
                  )}
                </div>
              )}

              <div className="v2-modal-actions">
              <Link className="v2-link-btn" to={`/juegos/${juegoActivo.id}`} onClick={() => setJuegoActivo(null)}>Ver detalle completo</Link>
              <button
                className="v2-buy-btn"
                onClick={() => {
                  setJuegoActivo(null);
                  comprar(juegoActivo.id);
                }}
              >
                Comprar
              </button>
              <button className="v2-close-btn" onClick={() => setJuegoActivo(null)}>Cerrar</button>
            </div>
          </div>
        </div>
        </div>
      )}
    </main>
  );
}

export default TodosJuegosPage;
