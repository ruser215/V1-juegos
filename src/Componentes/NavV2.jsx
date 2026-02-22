import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AppBar, Box, Button, Chip, Toolbar, Typography } from "@mui/material";

function NavV2() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
        <Typography variant="h6" sx={{ mr: 1 }}>
          GameStore
        </Typography>

        <Button component={RouterLink} to="/juegos" variant="text">
          Todos los juegos
        </Button>
        <Button component={RouterLink} to="/carrito" variant="text">
          Carrito
        </Button>
        <Button component={RouterLink} to="/mis-juegos" variant="text">
          Mis juegos
        </Button>
        <Button component={RouterLink} to="/juegos/nuevo" variant="text">
          Alta videojuego
        </Button>
        {user?.role === "admin" && (
          <Button component={RouterLink} to="/admin/reportes" variant="text">
            Juegos reportados
          </Button>
        )}

        <Box sx={{ ml: "auto", display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          {!isAuthenticated && (
            <Button component={RouterLink} to="/login" variant="outlined">
              Login
            </Button>
          )}
          {!isAuthenticated && (
            <Button component={RouterLink} to="/register" variant="contained">
              Registro
            </Button>
          )}
          {user && (
            <Chip
              color="primary"
              label={`Usuario: ${user.username}`}
              variant="outlined"
            />
          )}
          {isAuthenticated && (
            <Button onClick={logout} color="error" variant="contained">
              Cerrar sesión
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default NavV2;
