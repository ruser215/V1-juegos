import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../Estilos/AuthPages.css";

function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      await register(username, email, password);
      navigate("/juegos");
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo registrar");
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
      <h1 className="auth-title">Registro</h1>
      <p className="auth-subtitle">Crea una cuenta para comprar videojuegos y guardar tu carrito.</p>
      <form onSubmit={onSubmit} className="auth-form">
        <div className="auth-field">
          <label htmlFor="register-username" className="auth-label">Nombre de usuario</label>
          <input id="register-username" className="auth-input" placeholder="Ej: clase23" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="auth-field">
          <label htmlFor="register-email" className="auth-label">Correo electrónico</label>
          <input id="register-email" className="auth-input" type="email" placeholder="ejemplo@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="auth-field">
          <label htmlFor="register-password" className="auth-label">Contraseña</label>
          <input id="register-password" className="auth-input" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="auth-button" type="submit" disabled={isLoading}>{isLoading ? "Registrando..." : "Crear cuenta"}</button>
      </form>
      {error && <p className="auth-error">{error}</p>}
      <p className="auth-footer">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
      </section>
    </main>
  );
}

export default RegisterPage;
