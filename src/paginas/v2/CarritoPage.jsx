import NavV2 from "../../Componentes/NavV2";
import { Box, Container, Paper, Typography } from "@mui/material";

function CarritoPage() {
  return (
    <Box component="main" sx={{ pb: 4 }}>
      <NavV2 />
      <Container maxWidth="md" sx={{ pt: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
            Carrito
          </Typography>
          <Typography color="text.secondary">Tu carrito está vacío por ahora.</Typography>
        </Paper>
      </Container>
    </Box>
  );
}

export default CarritoPage;
