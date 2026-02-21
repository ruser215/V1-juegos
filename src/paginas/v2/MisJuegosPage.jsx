import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../../api/client";
import Loading from "../../Componentes/Loading";
import NavV2 from "../../Componentes/NavV2";
import { Alert, Box, Button, Card, CardActions, CardContent, Container, Stack, Typography } from "@mui/material";

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
    <Box component="main" sx={{ pb: 4 }}>
      <NavV2 />
      <Container maxWidth="md" sx={{ pt: 3 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          Mis videojuegos
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2}>
          {games.map((game) => (
            <Card key={game.id}>
              <CardContent>
                <Typography variant="h6">{game.nombre}</Typography>
                <Typography color="primary" sx={{ mt: 1 }}>€{game.precio}</Typography>
              </CardContent>
              <CardActions>
                <Button component={Link} to={`/juegos/${game.id}`} size="small">
                  Ver detalle
                </Button>
                <Button color="error" onClick={() => eliminar(game.id)} size="small">
                  Eliminar
                </Button>
              </CardActions>
            </Card>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}

export default MisJuegosPage;
