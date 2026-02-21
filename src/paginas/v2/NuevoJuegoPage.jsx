import { useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import NavV2 from "../../Componentes/NavV2";
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from "@mui/material";

function NuevoJuegoPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    fecha_lanzamiento: "",
    compania: "",
    precio: "",
    portada: "",
    video: "",
    categoria_ids: "",
    plataforma_ids: ""
  });
  const [error, setError] = useState("");

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      await client.post("/games", {
        ...form,
        precio: Number(form.precio),
        categoria_ids: form.categoria_ids
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        plataforma_ids: form.plataforma_ids
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      });

      navigate("/mis-juegos");
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo crear el videojuego");
    }
  };

  return (
    <Box component="main" sx={{ pb: 4 }}>
      <NavV2 />
      <Container maxWidth="sm" sx={{ pt: 3 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          Alta de videojuego
        </Typography>
        <Paper sx={{ p: 2 }}>
          <Stack component="form" onSubmit={onSubmit} spacing={2}>
            <TextField name="nombre" label="Nombre" value={form.nombre} onChange={onChange} required fullWidth />
            <TextField
              name="descripcion"
              label="Descripción"
              value={form.descripcion}
              onChange={onChange}
              required
              fullWidth
              multiline
              minRows={3}
            />
            <TextField
              name="fecha_lanzamiento"
              label="Fecha lanzamiento (YYYY-MM-DD)"
              value={form.fecha_lanzamiento}
              onChange={onChange}
              fullWidth
            />
            <TextField name="compania" label="Compañía" value={form.compania} onChange={onChange} fullWidth />
            <TextField
              name="precio"
              type="number"
              inputProps={{ step: "0.01" }}
              label="Precio"
              value={form.precio}
              onChange={onChange}
              required
              fullWidth
            />
            <TextField name="portada" label="URL portada" value={form.portada} onChange={onChange} fullWidth />
            <TextField name="video" label="URL video" value={form.video} onChange={onChange} fullWidth />
            <TextField
              name="categoria_ids"
              label="Categorías IDs separadas por coma (ej: 1,2)"
              value={form.categoria_ids}
              onChange={onChange}
              fullWidth
            />
            <TextField
              name="plataforma_ids"
              label="Plataformas IDs separadas por coma (ej: 1,3)"
              value={form.plataforma_ids}
              onChange={onChange}
              fullWidth
            />
            <Button type="submit" variant="contained">Guardar</Button>
          </Stack>
        </Paper>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </Container>
    </Box>
  );
}

export default NuevoJuegoPage;
