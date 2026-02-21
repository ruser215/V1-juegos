import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../Estilos/AuthPages.css";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Link as MuiLink,
  Stack,
  TextField,
  Typography
} from "@mui/material";

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
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h4" component="h1">
              Login
            </Typography>
            <Typography color="text.secondary">
              Inicia sesión con tu cuenta para comprar y acceder al carrito.
            </Typography>

            <Box component="form" onSubmit={onSubmit} sx={{ display: "grid", gap: 2 }}>
              <TextField
                id="login-email"
                type="email"
                label="Correo electrónico"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
              />
              <TextField
                id="login-password"
                type="password"
                label="Contraseña"
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
              />
              <Button type="submit" variant="contained" disabled={isLoading}>
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            <Typography variant="body2">
              ¿No tienes cuenta?{" "}
              <MuiLink component={Link} to="/register">
                Regístrate
              </MuiLink>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}

export default LoginPage;
