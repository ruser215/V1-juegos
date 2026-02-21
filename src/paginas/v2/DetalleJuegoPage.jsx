import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import client from "../../api/client";
import Loading from "../../Componentes/Loading";
import NavV2 from "../../Componentes/NavV2";
import { useAuth } from "../../context/AuthContext";
import { Box, Button, Chip, Container, Paper, Stack, Typography } from "@mui/material";

function toEmbed(url) {
  if (!url) return "";
  if (url.includes("youtube.com/watch?v=")) {
    const id = url.split("v=")[1]?.split("&")[0];
    return id ? `https://www.youtube.com/embed/${id}` : "";
  }
  if (url.includes("youtu.be/")) {
    const id = url.split("youtu.be/")[1]?.split("?")[0];
    return id ? `https://www.youtube.com/embed/${id}` : "";
  }
  return "";
}

function DetalleJuegoPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState(null);
  const [error, setError] = useState("");
  const [plataformas, setPlataformas] = useState([]);
  const [categorias, setCategorias] = useState([]);

  const comprar = () => {
    if (!isAuthenticated) {
      navigate("/register");
      return;
    }

    navigate("/carrito");
  };

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const [gameResponse, plataformasResponse, categoriasResponse] = await Promise.all([
          client.get(`/games/${id}`),
          client.get("/catalogo/plataformas"),
          client.get("/catalogo/categorias")
        ]);
        setGame(gameResponse.data);
        setPlataformas(plataformasResponse.data);
        setCategorias(categoriasResponse.data);
      } catch (e) {
        setError(e?.response?.data?.message || "No se pudo cargar el detalle");
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [id]);

  if (loading) return <Loading texto="Cargando detalle..." />;
  if (error) return <p style={{ padding: 16 }}>{error}</p>;
  if (!game) return <p style={{ padding: 16 }}>No encontrado</p>;

  const embedUrl = toEmbed(game.video);

  const nombresCategorias = Array.isArray(game.categoria_ids)
    ? game.categoria_ids
        .map((idCategoria) =>
          categorias.find((categoria) => String(categoria.id) === String(idCategoria))?.nombre
        )
        .filter(Boolean)
    : [];

  const nombresPlataformas = Array.isArray(game.plataforma_ids)
    ? game.plataforma_ids
        .map((idPlataforma) =>
          plataformas.find((plataforma) => String(plataforma.id) === String(idPlataforma))?.nombre
        )
        .filter(Boolean)
    : [];

  return (
    <Box component="main" sx={{ pb: 4 }}>
      <NavV2 />
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          {game.nombre}
        </Typography>

        <Paper sx={{ p: 2 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "360px 1fr" },
              gap: 2
            }}
          >
            <Box>
              {game.portada && (
                <Box
                  component="img"
                  src={game.portada}
                  alt={game.nombre}
                  sx={{ width: "100%", borderRadius: 1, objectFit: "cover" }}
                />
              )}
            </Box>

            <Stack spacing={1.5}>
              <Typography><b>Añadido por:</b> {game.owner_username}</Typography>
              <Typography>{game.descripcion}</Typography>
              <Typography><b>Fecha:</b> {game.fecha_lanzamiento || "No disponible"}</Typography>
              <Typography><b>Compañía:</b> {game.compania || "No disponible"}</Typography>
              <Typography variant="h6" color="primary"><b>Precio:</b> €{game.precio}</Typography>

              <Box>
                <Typography variant="subtitle1" sx={{ mb: 1 }}><b>Categorías:</b></Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {nombresCategorias.length > 0 ? (
                    nombresCategorias.map((nombre) => (
                      <Chip key={nombre} label={nombre} size="small" />
                    ))
                  ) : (
                    <Chip label="No disponible" size="small" />
                  )}
                </Stack>
              </Box>

              <Box>
                <Typography variant="subtitle1" sx={{ mb: 1 }}><b>Plataformas:</b></Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {nombresPlataformas.length > 0 ? (
                    nombresPlataformas.map((nombre) => (
                      <Chip key={nombre} label={nombre} size="small" color="secondary" />
                    ))
                  ) : (
                    <Chip label="No disponible" size="small" color="secondary" />
                  )}
                </Stack>
              </Box>

              <Box>
                <Button variant="contained" onClick={comprar}>Comprar</Button>
              </Box>

              {embedUrl && (
                <Box
                  component="iframe"
                  title="video"
                  src={embedUrl}
                  sx={{ width: "100%", minHeight: 280, border: 0, borderRadius: 1 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </Stack>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default DetalleJuegoPage;
