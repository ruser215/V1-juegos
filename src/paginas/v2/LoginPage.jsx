import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      await login(email, password);
      navigate("/juegos");
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo iniciar sesión");
    }
  };

  return (
    <main style={{ padding: 16 }}>
      <h1>Login</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, maxWidth: 360 }}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit" disabled={isLoading}>{isLoading ? "Entrando..." : "Entrar"}</button>
      </form>
      {error && <p>{error}</p>}
      <p>¿No tienes cuenta? <Link to="/register">Regístrate</Link></p>
    </main>
  );
}

export default LoginPage;
