import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../Estilos/AuthPages.css";

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
    <main className="auth-page">
      <section className="auth-card">
      <h1 className="auth-title">Login</h1>
      <p className="auth-subtitle">Inicia sesión con tu cuenta para comprar y acceder al carrito.</p>
      <form onSubmit={onSubmit} className="auth-form">
        <div className="auth-field">
          <label htmlFor="login-email" className="auth-label">Correo electrónico</label>
          <input id="login-email" className="auth-input" type="email" placeholder="ejemplo@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="auth-field">
          <label htmlFor="login-password" className="auth-label">Contraseña</label>
          <input id="login-password" className="auth-input" type="password" placeholder="Tu contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="auth-button" type="submit" disabled={isLoading}>{isLoading ? "Entrando..." : "Entrar"}</button>
      </form>
      {error && <p className="auth-error">{error}</p>}
      <p className="auth-footer">¿No tienes cuenta? <Link to="/register">Regístrate</Link></p>
      </section>
    </main>
  );
}

export default LoginPage;
