import { Checkbox, FormControlLabel, FormGroup } from "@mui/material";

function MostrarCategorias({
  listaCategorias,
  categoriasSeleccionadas,
  setCategoriasSeleccionadas
}) {

  const toggleCategoria = (id) => {
    const idNormalizado = String(id);
    setCategoriasSeleccionadas((prev) =>
      prev.includes(idNormalizado)
        ? prev.filter((catId) => catId !== idNormalizado)
        : [...prev, idNormalizado]
    );
  };

  return (
    <FormGroup row>
      {listaCategorias.map((categoria) => (
        <FormControlLabel
          key={categoria.id}
          control={(
            <Checkbox
              checked={categoriasSeleccionadas.includes(String(categoria.id))}
              onChange={() => toggleCategoria(categoria.id)}
            />
          )}
          label={categoria.nombre}
        />
      ))}
    </FormGroup>
  );
}

export default MostrarCategorias;

