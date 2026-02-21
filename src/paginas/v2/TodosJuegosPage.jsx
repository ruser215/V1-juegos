import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client from "../../api/client";
import Loading from "../../Componentes/Loading";
import NavV2 from "../../Componentes/NavV2";
import { useAuth } from "../../context/AuthContext";
import "../../Estilos/TodosJuegosV2.css";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Checkbox,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
  TextField,
  Typography
} from "@mui/material";

function TodosJuegosPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState([]);
  const [error, setError] = useState("");
  const [juegoActivo, setJuegoActivo] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [plataformas, setPlataformas] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState([]);
  const [plataformasSeleccionadas, setPlataformasSeleccionadas] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [orden, setOrden] = useState("recientes");

  const comprar = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    navigate("/carrito");
  };

  const toggleJuegoActivo = (game) => {
    setJuegoActivo((prev) => (prev?.id === game.id ? null : game));
  };

  useEffect(() => {
    const fetchGames = async () => {
      setLoading(true);
      try {
        const sortQuery = orden === "popularidad" ? "&sort=popularidad" : "";
        const [gamesResponse, categoriasResponse, plataformasResponse] = await Promise.all([
          client.get(`/games?page=1&limit=200${sortQuery}`),
          client.get("/catalogo/categorias"),
          client.get("/catalogo/plataformas")
        ]);

        setGames(gamesResponse.data.data);
        setCategorias(categoriasResponse.data);
        setPlataformas(plataformasResponse.data);
        setCategoriasSeleccionadas([]);
        setPlataformasSeleccionadas([]);
        setError("");
      } catch (e) {
        setError(e?.response?.data?.message || "No se pudieron cargar los juegos");
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [orden]);

  const votar = async (gameId, voteType) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    try {
      const response = await client.post(`/games/${gameId}/vote`, { voteType });
      const voteData = response.data;

      setGames((prev) =>
        prev.map((item) =>
          item.id === gameId
            ? {
                ...item,
                likes: voteData.likes,
                dislikes: voteData.dislikes,
                popularidad: voteData.popularidad,
                my_vote: voteData.my_vote
              }
            : item
        )
      );

      setJuegoActivo((prev) =>
        prev?.id === gameId
          ? {
              ...prev,
              likes: voteData.likes,
              dislikes: voteData.dislikes,
              popularidad: voteData.popularidad,
              my_vote: voteData.my_vote
            }
          : prev
      );

      setError("");
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo registrar el voto");
    }
  };

  const nombresCategorias = (ids = []) => {
    if (!Array.isArray(ids)) return [];
    return ids
      .map((id) => categorias.find((categoria) => String(categoria.id) === String(id))?.nombre)
      .filter(Boolean);
  };

  const textoCategorias = (ids = []) => {
    const nombres = nombresCategorias(ids);
    if (nombres.length > 0) return nombres.join(", ");
    if (!Array.isArray(ids) || ids.length === 0) return "No disponible";
    return ids.join(", ");
  };

  const nombresPlataformas = (ids = []) => {
    if (!Array.isArray(ids)) return [];
    return ids
      .map((id) => plataformas.find((plataforma) => String(plataforma.id) === String(id))?.nombre)
      .filter(Boolean);
  };

  const textoPlataformas = (ids = []) => {
    const nombres = nombresPlataformas(ids);
    if (nombres.length > 0) return nombres.join(", ");
    if (!Array.isArray(ids) || ids.length === 0) return "No disponible";
    return ids.join(", ");
  };

  const videoEmbed = (url = "") => {
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
  };

  const toggleCategoria = (idCategoria) => {
    setCategoriasSeleccionadas((prev) =>
      prev.includes(idCategoria)
        ? prev.filter((id) => id !== idCategoria)
        : [...prev, idCategoria]
    );
  };

  const togglePlataforma = (idPlataforma) => {
    setPlataformasSeleccionadas((prev) =>
      prev.includes(idPlataforma)
        ? prev.filter((id) => id !== idPlataforma)
        : [...prev, idPlataforma]
    );
  };

  const gamesFiltrados = games.filter((game) => {
    const coincideBusqueda =
      busqueda.trim() === "" ||
      game.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      game.descripcion?.toLowerCase().includes(busqueda.toLowerCase());

    const coincideCategoria =
      categoriasSeleccionadas.length === 0 ||
      (Array.isArray(game.categoria_ids) &&
        game.categoria_ids.some((id) => categoriasSeleccionadas.includes(String(id))));

    const coincidePlataforma =
      plataformasSeleccionadas.length === 0 ||
      (Array.isArray(game.plataforma_ids) &&
        game.plataforma_ids.some((id) => plataformasSeleccionadas.includes(String(id))));

    return coincideBusqueda && coincideCategoria && coincidePlataforma;
  });

  const totalPages = Math.max(Math.ceil(gamesFiltrados.length / pageSize), 1);
  const inicio = (page - 1) * pageSize;
  const fin = inicio + pageSize;
  const gamesPaginados = gamesFiltrados.slice(inicio, fin);

  useEffect(() => {
    setPage(1);
  }, [busqueda, categoriasSeleccionadas, plataformasSeleccionadas, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  if (loading) return <Loading texto="Cargando videojuegos..." />;

  return (
    <Box component="main" sx={{ pb: 4 }}>
      <NavV2 />
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          Todos los videojuegos
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Paper sx={{ p: 2, mb: 3 }}>
          <Stack spacing={2}>
            <TextField
              id="buscador-juegos"
              label="Buscar juego"
              type="text"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Nombre o descripción"
              fullWidth
            />

            <FormControl sx={{ minWidth: 220 }} size="small">
              <InputLabel id="page-size-label">Juegos por página</InputLabel>
              <Select
                labelId="page-size-label"
                id="page-size"
                value={pageSize}
                label="Juegos por página"
                onChange={(event) => setPageSize(Number(event.target.value))}
              >
                <MenuItem value={4}>4</MenuItem>
                <MenuItem value={8}>8</MenuItem>
                <MenuItem value={12}>12</MenuItem>
                <MenuItem value={20}>20</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 220 }} size="small">
              <InputLabel id="orden-label">Orden</InputLabel>
              <Select
                labelId="orden-label"
                id="orden"
                value={orden}
                label="Orden"
                onChange={(event) => setOrden(event.target.value)}
              >
                <MenuItem value="recientes">Más recientes</MenuItem>
                <MenuItem value="popularidad">Popularidad (likes - dislikes)</MenuItem>
              </Select>
            </FormControl>

            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>Categorías</Typography>
              <FormGroup row>
                {categorias.map((categoria) => (
                  <FormControlLabel
                    key={categoria.id}
                    control={(
                      <Checkbox
                        checked={categoriasSeleccionadas.includes(String(categoria.id))}
                        onChange={() => toggleCategoria(String(categoria.id))}
                      />
                    )}
                    label={categoria.nombre}
                  />
                ))}
              </FormGroup>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>Plataformas</Typography>
              <FormGroup row>
                {plataformas.map((plataforma) => (
                  <FormControlLabel
                    key={plataforma.id}
                    control={(
                      <Checkbox
                        checked={plataformasSeleccionadas.includes(String(plataforma.id))}
                        onChange={() => togglePlataforma(String(plataforma.id))}
                      />
                    )}
                    label={plataforma.nombre}
                  />
                ))}
              </FormGroup>
            </Box>
          </Stack>
        </Paper>

        {gamesFiltrados.length === 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            No hay juegos que coincidan con los filtros actuales.
          </Alert>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 2
          }}
        >
          {gamesPaginados.map((game) => (
            <Card key={game.id} onClick={() => toggleJuegoActivo(game)} sx={{ cursor: "pointer" }}>
              {game.portada && (
                <CardMedia component="img" height="170" image={game.portada} alt={game.nombre} />
              )}
              <CardContent>
                <Typography variant="h6" gutterBottom>{game.nombre}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Añadido por: {game.owner_username}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {(game.descripcion || "").slice(0, 100)}
                  {(game.descripcion || "").length > 100 ? "..." : ""}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}><strong>Géneros:</strong> {textoCategorias(game.categoria_ids)}</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}><strong>Plataformas:</strong> {textoPlataformas(game.plataforma_ids)}</Typography>
                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                  <Chip size="small" color="success" label={`Likes: ${game.likes || 0}`} />
                  <Chip size="small" color="error" label={`Dislikes: ${game.dislikes || 0}`} />
                  <Chip size="small" label={`Popularidad: ${game.popularidad || 0}`} />
                </Stack>
                <Typography variant="h6" color="primary">€{game.precio}</Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  color="success"
                  disabled={Boolean(game.my_vote)}
                  onClick={(event) => {
                    event.stopPropagation();
                    votar(game.id, "like");
                  }}
                >
                  Like
                </Button>
                <Button
                  size="small"
                  color="error"
                  disabled={Boolean(game.my_vote)}
                  onClick={(event) => {
                    event.stopPropagation();
                    votar(game.id, "dislike");
                  }}
                >
                  Dislike
                </Button>
                <Button
                  component={Link}
                  to={`/juegos/${game.id}`}
                  onClick={(event) => event.stopPropagation()}
                  size="small"
                >
                  Ver más
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    comprar(game.id);
                  }}
                >
                  Comprar
                </Button>
              </CardActions>
            </Card>
          ))}
        </Box>

        {gamesFiltrados.length > 0 && (
          <Stack direction="row" justifyContent="center" sx={{ mt: 3 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_event, value) => setPage(value)}
              color="primary"
            />
          </Stack>
        )}

        <Dialog
          open={Boolean(juegoActivo)}
          onClose={() => setJuegoActivo(null)}
          fullWidth
          maxWidth="md"
        >
          {juegoActivo && (
            <>
              <DialogTitle>{juegoActivo.nombre}</DialogTitle>
              <DialogContent dividers>
                <Stack spacing={2}>
                  {juegoActivo.portada && (
                    <Box
                      component="img"
                      src={juegoActivo.portada}
                      alt={juegoActivo.nombre}
                      sx={{ width: "100%", maxHeight: 320, objectFit: "cover", borderRadius: 1 }}
                    />
                  )}

                  <Typography><strong>Descripción completa:</strong> {juegoActivo.descripcion || "No disponible"}</Typography>
                  <Typography><strong>Fecha de lanzamiento:</strong> {juegoActivo.fecha_lanzamiento || "No disponible"}</Typography>
                  <Typography><strong>Compañía:</strong> {juegoActivo.compania || "No disponible"}</Typography>
                  <Typography><strong>Añadido por:</strong> {juegoActivo.owner_username || "No disponible"}</Typography>
                  <Typography><strong>Precio:</strong> €{juegoActivo.precio}</Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip size="small" color="success" label={`Likes: ${juegoActivo.likes || 0}`} />
                    <Chip size="small" color="error" label={`Dislikes: ${juegoActivo.dislikes || 0}`} />
                    <Chip size="small" label={`Popularidad: ${juegoActivo.popularidad || 0}`} />
                  </Stack>

                  <Box>
                    <Typography variant="subtitle1" gutterBottom>Géneros</Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>{textoCategorias(juegoActivo.categoria_ids)}</Typography>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                      {nombresCategorias(juegoActivo.categoria_ids).length > 0 ? (
                        nombresCategorias(juegoActivo.categoria_ids).map((nombre) => (
                          <Chip key={nombre} label={nombre} size="small" />
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          IDs: {Array.isArray(juegoActivo.categoria_ids) ? juegoActivo.categoria_ids.join(", ") : "No disponible"}
                        </Typography>
                      )}
                    </Stack>
                  </Box>

                  <Box>
                    <Typography variant="subtitle1" gutterBottom>Plataformas</Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>{textoPlataformas(juegoActivo.plataforma_ids)}</Typography>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                      {nombresPlataformas(juegoActivo.plataforma_ids).length > 0 ? (
                        nombresPlataformas(juegoActivo.plataforma_ids).map((nombre) => (
                          <Chip key={nombre} label={nombre} size="small" color="secondary" />
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          IDs: {Array.isArray(juegoActivo.plataforma_ids) ? juegoActivo.plataforma_ids.join(", ") : "No disponible"}
                        </Typography>
                      )}
                    </Stack>
                  </Box>

                  {!!juegoActivo.video && (
                    <Box>
                      {videoEmbed(juegoActivo.video) ? (
                        <Box
                          component="iframe"
                          src={videoEmbed(juegoActivo.video)}
                          title={`Trailer de ${juegoActivo.nombre}`}
                          sx={{ width: "100%", minHeight: 280, border: 0, borderRadius: 1 }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <Box component="video" src={juegoActivo.video} controls sx={{ width: "100%" }} />
                      )}
                    </Box>
                  )}
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button
                  component={Link}
                  to={`/juegos/${juegoActivo.id}`}
                  onClick={() => setJuegoActivo(null)}
                >
                  Ver detalle completo
                </Button>
                <Button
                  variant="contained"
                  onClick={() => {
                    setJuegoActivo(null);
                    comprar(juegoActivo.id);
                  }}
                >
                  Comprar
                </Button>
                <Button color="inherit" onClick={() => setJuegoActivo(null)}>
                  Cerrar
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Container>
    </Box>
  );
}

export default TodosJuegosPage;
