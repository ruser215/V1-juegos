import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function NavV2() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <nav style={{ display: "flex", gap: "12px", padding: "12px", flexWrap: "wrap" }}>
      <Link to="/juegos">Todos los juegos</Link>
      <Link to="/carrito">Carrito</Link>
      <Link to="/mis-juegos">Mis juegos</Link>
      <Link to="/juegos/nuevo">Alta videojuego</Link>
      {!isAuthenticated && <Link to="/login">Login</Link>}
      {!isAuthenticated && <Link to="/register">Registro</Link>}
      {user && <span>Usuario: {user.username} ({user.role})</span>}
      {isAuthenticated && <button onClick={logout}>Cerrar sesión</button>}
    </nav>
  );
}

export default NavV2;
