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

async function deleteById(enlaceBase, id) {
    try {
        const response = await axios.delete(`${enlaceBase}/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error al eliminar dato:", error);
        throw error;
    }
}

export { getAll, deleteById };
