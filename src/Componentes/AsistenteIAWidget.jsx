import { useState } from "react";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import {
  Box,
  Fab,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  Button,
  CircularProgress
} from "@mui/material";
import client from "../api/client";

const MENSAJE_INICIAL = {
  role: "assistant",
  content: "Hola. Soy tu asistente de videojuegos. Puedo buscar y recomendar solo juegos de esta base de datos."
};

function AsistenteIAWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([MENSAJE_INICIAL]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const enviarMensaje = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await client.post("/assistant/chat", { message: userMessage.content });
      setMessages((prev) => [...prev, { role: "assistant", content: response.data.answer }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error?.response?.data?.message ||
            "No pude responder ahora. Revisa que Ollama y el modelo estén activos."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Fab
        color="secondary"
        aria-label="asistente-ia"
        onClick={() => setOpen((prev) => !prev)}
        sx={{
          position: "fixed",
          right: 20,
          bottom: 20,
          zIndex: 1400,
          boxShadow: "0 0 16px rgba(255, 43, 214, 0.65)"
        }}
      >
        {open ? <CloseIcon /> : <SmartToyIcon />}
      </Fab>

      {open && (
        <Paper
          elevation={8}
          sx={{
            position: "fixed",
            right: 20,
            bottom: 90,
            width: { xs: "calc(100vw - 30px)", sm: 380 },
            height: 500,
            display: "grid",
            gridTemplateRows: "auto 1fr auto",
            overflow: "hidden",
            zIndex: 1400,
            border: "1px solid rgba(0, 246, 255, 0.35)"
          }}
        >
          <Box sx={{ p: 1.5, borderBottom: "1px solid rgba(0, 246, 255, 0.25)", display: "flex", alignItems: "center", gap: 1 }}>
            <SmartToyIcon color="secondary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Asistente IA
            </Typography>
            <Box sx={{ ml: "auto" }}>
              <IconButton size="small" onClick={() => setOpen(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          <Stack spacing={1} sx={{ p: 1.5, overflowY: "auto" }}>
            {messages.map((msg, index) => (
              <Box
                key={`${msg.role}-${index}`}
                sx={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "90%",
                  px: 1.2,
                  py: 0.9,
                  borderRadius: 1.5,
                  backgroundColor: msg.role === "user" ? "rgba(0,246,255,0.16)" : "rgba(255,43,214,0.14)",
                  border: "1px solid rgba(255,255,255,0.12)"
                }}
              >
                <Typography variant="body2">{msg.content}</Typography>
              </Box>
            ))}
            {loading && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">Pensando...</Typography>
              </Box>
            )}
          </Stack>

          <Stack direction="row" spacing={1} sx={{ p: 1.2, borderTop: "1px solid rgba(0, 246, 255, 0.25)" }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Pregunta por juegos o recomendaciones..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  enviarMensaje();
                }
              }}
            />
            <Button variant="contained" onClick={enviarMensaje} disabled={loading || !input.trim()}>
              <SendIcon fontSize="small" />
            </Button>
          </Stack>
        </Paper>
      )}
    </>
  );
}

export default AsistenteIAWidget;
