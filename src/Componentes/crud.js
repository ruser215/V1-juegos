import axios from "axios";

async function getAll(enlace) {
    try {
        const response = await axios.get(enlace);
        return response.data;
    } catch (error) {
        console.error("Error al obtener datos:", error);
        throw error;
    }
}

export { getAll };
