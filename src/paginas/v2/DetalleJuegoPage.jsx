import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import client from "../../api/client";
import Loading from "../../Componentes/Loading";
import NavV2 from "../../Componentes/NavV2";
import { useAuth } from "../../context/AuthContext";
import "../../Estilos/DetalleJuegoV2.css";

function toEmbed(url) {
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
}

function DetalleJuegoPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState(null);
  const [error, setError] = useState("");
  const [plataformas, setPlataformas] = useState([]);
  const [categorias, setCategorias] = useState([]);

  const comprar = () => {
    if (!isAuthenticated) {
      navigate("/register");
      return;
    }

    navigate("/carrito");
  };

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const [gameResponse, plataformasResponse, categoriasResponse] = await Promise.all([
          client.get(`/games/${id}`),
          client.get("/catalogo/plataformas"),
          client.get("/catalogo/categorias")
        ]);
        setGame(gameResponse.data);
        setPlataformas(plataformasResponse.data);
        setCategorias(categoriasResponse.data);
      } catch (e) {
        setError(e?.response?.data?.message || "No se pudo cargar el detalle");
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [id]);

  if (loading) return <Loading texto="Cargando detalle..." />;
  if (error) return <p style={{ padding: 16 }}>{error}</p>;
  if (!game) return <p style={{ padding: 16 }}>No encontrado</p>;

  const embedUrl = toEmbed(game.video);

  const nombresCategorias = Array.isArray(game.categoria_ids)
    ? game.categoria_ids
        .map((idCategoria) =>
          categorias.find((categoria) => String(categoria.id) === String(idCategoria))?.nombre
        )
        .filter(Boolean)
    : [];

  const nombresPlataformas = Array.isArray(game.plataforma_ids)
    ? game.plataforma_ids
        .map((idPlataforma) =>
          plataformas.find((plataforma) => String(plataforma.id) === String(idPlataforma))?.nombre
        )
        .filter(Boolean)
    : [];

  const clasePlataforma = (nombre = "") => {
    const texto = nombre.toLowerCase();
    if (texto.includes("xbox")) return "chip-plat chip-xbox";
    if (texto.includes("switch")) return "chip-plat chip-switch";
    if (texto.includes("playstation") || texto.includes("ps5") || texto.includes("ps4")) return "chip-plat chip-playstation";
    if (texto.includes("pc")) return "chip-plat chip-pc";
    if (texto.includes("android")) return "chip-plat chip-android";
    if (texto.includes("ios")) return "chip-plat chip-ios";
    return "chip-plat chip-default";
  };

  return (
    <main className="detalle-page">
      <NavV2 />
      <h1>{game.nombre}</h1>
      <section className="detalle-card">
        <div className="detalle-left">
          {game.portada && <img src={game.portada} alt={game.nombre} className="detalle-portada" />}
        </div>

        <div className="detalle-right">
          <p><b>Añadido por:</b> {game.owner_username}</p>
          <p>{game.descripcion}</p>
          <p><b>Fecha:</b> {game.fecha_lanzamiento || "No disponible"}</p>
          <p><b>Compañía:</b> {game.compania || "No disponible"}</p>
          <p><b>Precio:</b> €{game.precio}</p>

          <div>
            <b>Categorías:</b>
            <div className="chips-categorias">
              {nombresCategorias.length > 0 ? (
                nombresCategorias.map((nombre) => (
                  <span key={nombre} className="chip-cat">{nombre}</span>
                ))
              ) : (
                <span className="chip-cat">No disponible</span>
              )}
            </div>
          </div>

          <div>
            <b>Plataformas:</b>
            <div className="chips-plataformas">
              {nombresPlataformas.length > 0 ? (
                nombresPlataformas.map((nombre) => (
                  <span key={nombre} className={clasePlataforma(nombre)}>{nombre}</span>
                ))
              ) : (
                <span className="chip-plat chip-default">No disponible</span>
              )}
            </div>
          </div>

          <button onClick={comprar} className="detalle-buy">Comprar</button>

          {embedUrl && (
            <iframe
              title="video"
              src={embedUrl}
              className="detalle-video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </section>
    </main>
  );
}

export default DetalleJuegoPage;
