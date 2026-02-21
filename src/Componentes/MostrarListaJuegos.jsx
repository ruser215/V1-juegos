import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography
} from "@mui/material";

function MostrarJuegos({ listaJuegos, listaCategorias, listaPlataformas, onEliminarJuego }) {
  const [juegoActivo, setJuegoActivo] = useState(null);
  const [imagenSeleccionada, setImagenSeleccionada] = useState("");

  const cortarTexto = (texto, limite = 100) => {
    return texto.length > limite ? texto.substring(0, limite) + "..." : texto;
  };

  // Función para obtener nombres de categorías
  const obtenerCategorias = (ids) => {
    return listaCategorias
      .filter(cat => ids.includes(String(cat.id)))
      .map(cat => cat.nombre);
  };

  // Función para obtener nombres de plataformas
  const obtenerPlataformas = (ids) => {
    return listaPlataformas
      .filter(plat => ids.includes(String(plat.id)))
      .map(plat => plat.nombre);
  };

  const obtenerCampo = (juego, campos) => {
    for (const campo of campos) {
      if (juego[campo]) return juego[campo];
    }
    return "No disponible";
  };

  const obtenerListaImagenes = (juego) => {
    const imagenes = [
      juego.Portada,
      juego.portada,
      juego.urlImagen,
      juego.url_imagen,
      ...(Array.isArray(juego.imagenes) ? juego.imagenes : [])
    ].filter(Boolean);

    return [...new Set(imagenes)];
  };

  const obtenerUrlVideo = (juego) => {
    return juego.video || juego.urlVideo || juego.url_video || "";
  };

  const convertirYoutubeAEmbed = (urlVideo) => {
    if (!urlVideo) return "";

    if (urlVideo.includes("youtube.com/watch?v=")) {
      const id = urlVideo.split("v=")[1]?.split("&")[0];
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    if (urlVideo.includes("youtu.be/")) {
      const id = urlVideo.split("youtu.be/")[1]?.split("?")[0];
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    return "";
  };

  const eliminarJuego = async () => {
    if (!juegoActivo) return;
    const confirmado = window.confirm(`¿Eliminar ${juegoActivo.nombre}?`);
    if (!confirmado) return;

    await onEliminarJuego(juegoActivo.id);
    setJuegoActivo(null);
    setImagenSeleccionada("");
  };

  const abrirModal = (juego) => {
    const imagenes = obtenerListaImagenes(juego);
    setJuegoActivo(juego);
    setImagenSeleccionada(imagenes[0] || juego.Portada || "");
  };

  const cerrarModal = () => {
    setJuegoActivo(null);
    setImagenSeleccionada("");
  };

  const colorPlataforma = (nombre) => {
    switch (nombre.toLowerCase()) {
      case "pc":
      case "playstation 5":
      case "playstation 4":
      case "xbox series x/s":
      case "xbox one":
      case "nintendo switch":
        return "secondary";
      default:
        return "default";
    }
  };

  const portadaPrincipal = (juego) => obtenerListaImagenes(juego)[0] || juego.Portada || juego.portada || "";

  return (
    <>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 2
        }}
      >
        {listaJuegos.map((juego) => (
          <Card
            key={juego.id}
            onClick={() => abrirModal(juego)}
            sx={{ cursor: "pointer" }}
          >
            {!!portadaPrincipal(juego) && (
              <CardMedia component="img" height="170" image={portadaPrincipal(juego)} alt={juego.nombre} />
            )}
            <CardContent>
              <Typography variant="h6" gutterBottom>{juego.nombre}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {cortarTexto(juego.Descripcion || juego.descripcion || "")}
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
              {obtenerPlataformas(juego.plataforma_ids).map(plat => (
                <Chip key={plat} label={plat} size="small" color={colorPlataforma(plat)} />
              ))}
              </Stack>
              <Typography variant="h6" color="primary">€{juego.precio}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Dialog open={Boolean(juegoActivo)} onClose={cerrarModal} fullWidth maxWidth="md">
        {juegoActivo && (
          <>
            <DialogTitle>{juegoActivo.nombre}</DialogTitle>
            <DialogContent dividers>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  gap: 2
                }}
              >
                <Box>
                  <Box
                    component="img"
                    src={imagenSeleccionada || portadaPrincipal(juegoActivo)}
                    alt={juegoActivo.nombre}
                    sx={{ width: "100%", borderRadius: 1, maxHeight: 320, objectFit: "cover", mb: 1 }}
                  />
                  {obtenerListaImagenes(juegoActivo).length > 1 && (
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {obtenerListaImagenes(juegoActivo).map((imagen, indice) => (
                    <Box
                      key={`${imagen}-${indice}`}
                      component="img"
                      src={imagen}
                      alt={`${juegoActivo.nombre} ${indice + 1}`}
                      onClick={() => setImagenSeleccionada(imagen)}
                      sx={{ width: 72, height: 56, objectFit: "cover", borderRadius: 1, cursor: "pointer" }}
                    />
                  ))}
                    </Stack>
                  )}
                </Box>

                <Stack spacing={1.2}>
                  <Typography>{juegoActivo.Descripcion || juegoActivo.descripcion || "No disponible"}</Typography>
                  <Typography><strong>Fecha de lanzamiento:</strong> {obtenerCampo(juegoActivo, ["fecha_lanzamiento", "fechaLanzamiento", "fecha"])} </Typography>
                  <Typography><strong>Compañía:</strong> {obtenerCampo(juegoActivo, ["compania", "compañia", "empresa"])} </Typography>

                  {!!obtenerUrlVideo(juegoActivo) && (
                    <Box>
                      {convertirYoutubeAEmbed(obtenerUrlVideo(juegoActivo)) ? (
                        <Box
                          component="iframe"
                          src={convertirYoutubeAEmbed(obtenerUrlVideo(juegoActivo))}
                          title={`Trailer de ${juegoActivo.nombre}`}
                          sx={{ width: "100%", minHeight: 240, border: 0, borderRadius: 1 }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <Box component="video" controls src={obtenerUrlVideo(juegoActivo)} sx={{ width: "100%" }} />
                      )}
                    </Box>
                  )}

                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {obtenerCategorias(juegoActivo.categoria_ids).map(cat => (
                      <Chip key={cat} label={cat} size="small" />
                    ))}
                  </Stack>

                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {obtenerPlataformas(juegoActivo.plataforma_ids).map(plat => (
                      <Chip key={plat} label={plat} size="small" color={colorPlataforma(plat)} />
                    ))}
                  </Stack>

                  <Typography variant="h6" color="primary">Precio: €{juegoActivo.precio}</Typography>
                </Stack>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button color="error" variant="contained" onClick={eliminarJuego}>Eliminar videojuego</Button>
              <Button onClick={cerrarModal}>Cerrar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}

export default MostrarJuegos;





