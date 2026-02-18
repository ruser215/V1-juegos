import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../../api/client";
import Loading from "../../Componentes/Loading";
import NavV2 from "../../Componentes/NavV2";

function MisJuegosPage() {
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState([]);
  const [error, setError] = useState("");

  const cargar = async () => {
    setLoading(true);
    try {
      const response = await client.get("/games/mine?page=1&limit=20");
      setGames(response.data.data);
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudieron cargar tus juegos");
    } finally {
      setLoading(false);
    }
  };

  const eliminar = async (id) => {
    await client.delete(`/games/${id}`);
    await cargar();
  };

  useEffect(() => {
    cargar();
  }, []);

  if (loading) return <Loading texto="Cargando tus videojuegos..." />;

  return (
    <main style={{ padding: 16 }}>
      <NavV2 />
      <h1>Mis videojuegos</h1>
      {error && <p>{error}</p>}
      <ul style={{ display: "grid", gap: 12 }}>
        {games.map((game) => (
          <li key={game.id}>
            <strong>{game.nombre}</strong> - €{game.precio}{" "}
            <Link to={`/juegos/${game.id}`}>Ver detalle</Link>{" "}
            <button onClick={() => eliminar(game.id)}>Eliminar</button>
          </li>
        ))}
      </ul>
    </main>
  );
}

export default MisJuegosPage;
