import { CircularProgress, Stack, Typography } from "@mui/material";

function Loading({ texto = "Cargando..." }) {
  return (
    <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
      <CircularProgress />
      <Typography color="text.secondary">{texto}</Typography>
    </Stack>
  );
}

export default Loading;
