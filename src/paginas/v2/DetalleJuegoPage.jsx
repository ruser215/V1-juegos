import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import client from "../../api/client";
import Loading from "../../Componentes/Loading";
import NavV2 from "../../Componentes/NavV2";
import { useAuth } from "../../context/AuthContext";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";

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
  const { isAuthenticated, user } = useAuth();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState(null);
  const [error, setError] = useState("");
  const [plataformas, setPlataformas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

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
        const [gameResponse, plataformasResponse, categoriasResponse, commentsResponse] = await Promise.all([
          client.get(`/games/${id}`),
          client.get("/catalogo/plataformas"),
          client.get("/catalogo/categorias"),
          client.get(`/games/${id}/comments`)
        ]);
        setGame(gameResponse.data);
        setPlataformas(plataformasResponse.data);
        setCategorias(categoriasResponse.data);
        setComments(commentsResponse.data);
      } catch (e) {
        setError(e?.response?.data?.message || "No se pudo cargar el detalle");
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [id]);

  const cargarComentarios = async () => {
    const response = await client.get(`/games/${id}/comments`);
    setComments(response.data);
  };

  const comentar = async (parentCommentId = null) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    const content = parentCommentId ? replyText : newComment;
    if (!content.trim()) return;

    try {
      await client.post(`/games/${id}/comments`, { content, parentCommentId });
      if (parentCommentId) {
        setReplyingTo(null);
        setReplyText("");
      } else {
        setNewComment("");
      }
      await cargarComentarios();
      setActionError("");
      setActionMessage("Comentario publicado");
    } catch (e) {
      setActionMessage("");
      setActionError(e?.response?.data?.message || "No se pudo publicar el comentario");
    }
  };

  const eliminarComentario = async (commentId) => {
    try {
      await client.delete(`/comments/${commentId}`);
      await cargarComentarios();
      setActionError("");
      setActionMessage("Comentario eliminado");
    } catch (e) {
      setActionMessage("");
      setActionError(e?.response?.data?.message || "No se pudo eliminar el comentario");
    }
  };

  const reportarJuego = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    try {
      await client.post(`/games/${id}/report`, { reason: "Contenido inapropiado" });
      setActionError("");
      setActionMessage("Videojuego reportado correctamente");
    } catch (e) {
      setActionMessage("");
      setActionError(e?.response?.data?.message || "No se pudo reportar el videojuego");
    }
  };

  const votar = async (voteType) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    try {
      const response = await client.post(`/games/${id}/vote`, { voteType });
      const voteData = response.data;

      setGame((prev) => ({
        ...prev,
        likes: voteData.likes,
        dislikes: voteData.dislikes,
        popularidad: voteData.popularidad,
        my_vote: voteData.my_vote
      }));

      setActionError("");
      setActionMessage("Voto registrado");
    } catch (e) {
      setActionMessage("");
      setActionError(e?.response?.data?.message || "No se pudo registrar el voto");
    }
  };

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

  const comentariosRaiz = comments.filter((comment) => !comment.parent_comment_id);
  const respuestasDe = (commentId) =>
    comments.filter((comment) => Number(comment.parent_comment_id) === Number(commentId));

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
              <Stack direction="row" spacing={1}>
                <Chip size="small" color="success" label={`Likes: ${game.likes || 0}`} />
                <Chip size="small" color="error" label={`Dislikes: ${game.dislikes || 0}`} />
                <Chip size="small" label={`Popularidad: ${game.popularidad || 0}`} />
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  color="success"
                  variant="outlined"
                  disabled={Boolean(game.my_vote)}
                  onClick={() => votar("like")}
                >
                  Like
                </Button>
                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  disabled={Boolean(game.my_vote)}
                  onClick={() => votar("dislike")}
                >
                  Dislike
                </Button>
              </Stack>

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
                <Stack direction="row" spacing={1}>
                  <Button variant="contained" onClick={comprar}>Comprar</Button>
                  <Button color="warning" variant="outlined" onClick={reportarJuego}>
                    Reportar inapropiado
                  </Button>
                </Stack>
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

        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>Comentarios</Typography>

          {actionMessage && <Alert severity="success" sx={{ mb: 2 }}>{actionMessage}</Alert>}
          {actionError && <Alert severity="error" sx={{ mb: 2 }}>{actionError}</Alert>}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Escribe un comentario"
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
            />
            <Button variant="contained" onClick={() => comentar()}>
              Comentar
            </Button>
          </Stack>

          <Divider sx={{ mb: 2 }} />

          <Stack spacing={2}>
            {comentariosRaiz.length === 0 && (
              <Typography color="text.secondary">Todavía no hay comentarios.</Typography>
            )}

            {comentariosRaiz.map((comment) => {
              const respuestas = respuestasDe(comment.id);
              const isAdmin = user?.role === "admin";
              const isOwner = Number(comment.user_id) === Number(user?.id);
              const puedeEliminar = isAdmin || (isOwner && Number(comment.replies_count || 0) === 0);

              return (
                <Paper key={comment.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2">{comment.username}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {new Date(comment.created_at).toLocaleString()}
                  </Typography>
                  <Typography sx={{ mb: 1 }}>{comment.content}</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" onClick={() => setReplyingTo(comment.id)}>
                      Responder
                    </Button>
                    {puedeEliminar && (
                      <Button
                        size="small"
                        color="error"
                        onClick={() => eliminarComentario(comment.id)}
                      >
                        Eliminar
                      </Button>
                    )}
                  </Stack>

                  {replyingTo === comment.id && (
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Escribe una respuesta"
                        value={replyText}
                        onChange={(event) => setReplyText(event.target.value)}
                      />
                      <Button variant="contained" size="small" onClick={() => comentar(comment.id)}>
                        Enviar
                      </Button>
                    </Stack>
                  )}

                  {respuestas.length > 0 && (
                    <Stack spacing={1} sx={{ mt: 1, pl: { xs: 1, sm: 3 } }}>
                      {respuestas.map((reply) => {
                        const replyIsAdmin = user?.role === "admin";
                        const replyIsOwner = Number(reply.user_id) === Number(user?.id);
                        const replyPuedeEliminar = replyIsAdmin || (replyIsOwner && Number(reply.replies_count || 0) === 0);

                        return (
                          <Paper key={reply.id} variant="outlined" sx={{ p: 1 }}>
                            <Typography variant="subtitle2">{reply.username}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              {new Date(reply.created_at).toLocaleString()}
                            </Typography>
                            <Typography>{reply.content}</Typography>
                            {replyPuedeEliminar && (
                              <Button
                                size="small"
                                color="error"
                                sx={{ mt: 0.5 }}
                                onClick={() => eliminarComentario(reply.id)}
                              >
                                Eliminar
                              </Button>
                            )}
                          </Paper>
                        );
                      })}
                    </Stack>
                  )}
                </Paper>
              );
            })}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}

export default DetalleJuegoPage;
