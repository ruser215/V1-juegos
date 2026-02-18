import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import client from "../../api/client";
import Loading from "../../Componentes/Loading";
import NavV2 from "../../Componentes/NavV2";

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
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const response = await client.get(`/games/${id}`);
        setGame(response.data);
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

  return (
    <main style={{ padding: 16 }}>
      <NavV2 />
      <h1>{game.nombre}</h1>
      <p><b>Añadido por:</b> {game.owner_username}</p>
      <p>{game.descripcion}</p>
      <p><b>Fecha:</b> {game.fecha_lanzamiento || "No disponible"}</p>
      <p><b>Compañía:</b> {game.compania || "No disponible"}</p>
      <p><b>Precio:</b> €{game.precio}</p>
      {game.portada && <img src={game.portada} alt={game.nombre} style={{ maxWidth: 320, display: "block", marginBottom: 12 }} />}
      {embedUrl && (
        <iframe
          title="video"
          src={embedUrl}
          width="560"
          height="315"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}
    </main>
  );
}

export default DetalleJuegoPage;
