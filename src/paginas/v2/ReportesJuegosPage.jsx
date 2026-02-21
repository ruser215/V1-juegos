import { useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardActions, CardContent, CardMedia, Container, Stack, Typography } from "@mui/material";
import client from "../../api/client";
import Loading from "../../Componentes/Loading";
import NavV2 from "../../Componentes/NavV2";

function ReportesJuegosPage() {
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const cargar = async () => {
    setLoading(true);
    try {
      const response = await client.get("/reports/games");
      setGames(response.data);
      setError("");
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudieron cargar los reportes");
    } finally {
      setLoading(false);
    }
  };

  const eliminarJuego = async (id) => {
    try {
      await client.delete(`/games/${id}`);
      setOk("Videojuego eliminado");
      await cargar();
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo eliminar el videojuego");
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  if (loading) return <Loading texto="Cargando juegos reportados..." />;

  return (
    <Box component="main" sx={{ pb: 4 }}>
      <NavV2 />
      <Container maxWidth="md" sx={{ pt: 3 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          Videojuegos reportados
        </Typography>

        {ok && <Alert severity="success" sx={{ mb: 2 }}>{ok}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Stack spacing={2}>
          {games.length === 0 && (
            <Alert severity="info">No hay videojuegos reportados.</Alert>
          )}

          {games.map((game) => (
            <Card key={game.id}>
              {game.portada && (
                <CardMedia component="img" height="180" image={game.portada} alt={game.nombre} />
              )}
              <CardContent>
                <Typography variant="h6">{game.nombre}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total de reportes: {game.total_reports}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Último reporte: {new Date(game.last_report_at).toLocaleString()}
                </Typography>
              </CardContent>
              <CardActions>
                <Button color="error" variant="contained" onClick={() => eliminarJuego(game.id)}>
                  Eliminar videojuego
                </Button>
              </CardActions>
            </Card>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}

export default ReportesJuegosPage;
