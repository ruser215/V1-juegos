import "../Estilos/MostrarCategoriasPlataformas.css";

function MostrarCategorias({
  listaCategorias,
  categoriasSeleccionadas,
  setCategoriasSeleccionadas
}) {

  const toggleCategoria = (id) => {
    setCategoriasSeleccionadas((prev) =>
      prev.includes(id)
        ? prev.filter((catId) => catId !== id) // quitar
        : [...prev, id]                        // añadir
    );
  };

  return (
    <div className="categorias">
      {listaCategorias.map((categoria) => (
        <label key={categoria.id} className="categoria-item">
          <input
            type="checkbox"
            checked={categoriasSeleccionadas.includes(categoria.id)}
            onChange={() => toggleCategoria(categoria.id)}
          />
          <span className="checkmark"></span>
          {categoria.nombre}
        </label>
      ))}
    </div>
  );
}

export default MostrarCategorias;

