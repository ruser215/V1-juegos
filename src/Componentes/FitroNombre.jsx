import { TextField } from "@mui/material";

function FiltroNombre({ busqueda, setBusqueda }) {
    return (
        <TextField
            type="text"
            label="Buscar"
            placeholder="Filtrar por nombre"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            fullWidth
        />
    );
}

export default FiltroNombre;