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
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h4" component="h1">
              Registro
            </Typography>
            <Typography color="text.secondary">
              Crea una cuenta para comprar videojuegos y guardar tu carrito.
            </Typography>

            <Box component="form" onSubmit={onSubmit} sx={{ display: "grid", gap: 2 }}>
              <TextField
                id="register-username"
                label="Nombre de usuario"
                placeholder="Ej: clase23"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                fullWidth
              />
              <TextField
                id="register-email"
                type="email"
                label="Correo electrónico"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
              />
              <TextField
                id="register-password"
                type="password"
                label="Contraseña"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
              />
              <Button type="submit" variant="contained" disabled={isLoading}>
                {isLoading ? "Registrando..." : "Crear cuenta"}
              </Button>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            <Typography variant="body2">
              ¿Ya tienes cuenta?{" "}
              <MuiLink component={Link} to="/login">
                Inicia sesión
              </MuiLink>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}

export default RegisterPage;
