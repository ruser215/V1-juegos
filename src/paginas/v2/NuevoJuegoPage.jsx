import { useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import NavV2 from "../../Componentes/NavV2";

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
    <main style={{ padding: 16 }}>
      <NavV2 />
      <h1>Alta de videojuego</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, maxWidth: 520 }}>
        <input name="nombre" placeholder="Nombre" value={form.nombre} onChange={onChange} required />
        <textarea name="descripcion" placeholder="Descripción" value={form.descripcion} onChange={onChange} required />
        <input name="fecha_lanzamiento" placeholder="Fecha lanzamiento (YYYY-MM-DD)" value={form.fecha_lanzamiento} onChange={onChange} />
        <input name="compania" placeholder="Compañía" value={form.compania} onChange={onChange} />
        <input name="precio" type="number" step="0.01" placeholder="Precio" value={form.precio} onChange={onChange} required />
        <input name="portada" placeholder="URL portada" value={form.portada} onChange={onChange} />
        <input name="video" placeholder="URL video" value={form.video} onChange={onChange} />
        <input name="categoria_ids" placeholder="Categorías IDs separadas por coma (ej: 1,2)" value={form.categoria_ids} onChange={onChange} />
        <input name="plataforma_ids" placeholder="Plataformas IDs separadas por coma (ej: 1,3)" value={form.plataforma_ids} onChange={onChange} />
        <button type="submit">Guardar</button>
      </form>
      {error && <p>{error}</p>}
    </main>
  );
}

export default NuevoJuegoPage;
