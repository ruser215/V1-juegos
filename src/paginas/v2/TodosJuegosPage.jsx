import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client from "../../api/client";
import Loading from "../../Componentes/Loading";
import NavV2 from "../../Componentes/NavV2";
import { useAuth } from "../../context/AuthContext";

function TodosJuegosPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState([]);
  const [error, setError] = useState("");

  const comprar = (idJuego) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    navigate("/carrito");
  };

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await client.get("/games?page=1&limit=20");
        setGames(response.data.data);
      } catch (e) {
        setError(e?.response?.data?.message || "No se pudieron cargar los juegos");
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  if (loading) return <Loading texto="Cargando videojuegos..." />;

  return (
    <main style={{ padding: 16 }}>
      <NavV2 />
      <h1>Todos los videojuegos</h1>
      {error && <p>{error}</p>}
      <ul style={{ display: "grid", gap: 12 }}>
        {games.map((game) => (
          <li key={game.id}>
            <strong>{game.nombre}</strong> - añadido por <b>{game.owner_username}</b> - €{game.precio}{" "}
            <Link to={`/juegos/${game.id}`}>Ver detalle</Link>{" "}
            <button onClick={() => comprar(game.id)}>Comprar</button>
          </li>
        ))}
      </ul>
    </main>
  );
}

export default TodosJuegosPage;
