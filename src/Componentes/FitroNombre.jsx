import { useEffect, useState } from "react";

function FiltroNombre({ busqueda, setBusqueda }) {
    return (
        <div>
            <input
                type="text"
                placeholder="Filtrar por nombre"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
            />
        </div>
    );
}

export default FiltroNombre;