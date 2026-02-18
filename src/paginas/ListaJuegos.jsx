import { useEffect, useState } from 'react';
import MostrarJuegos from '../Componentes/MostrarListaJuegos.jsx';
import MostrarCategorias from '../Componentes/MostrarCategoriasPlataformas.jsx';
import { deleteById, getAll } from '../Componentes/crud.js';
import "../Estilos/App.css"
import FiltroNombre from '../Componentes/FitroNombre.jsx';

function ListaJuegos() {
    const [listaJuegos, setListaJuegos] = useState([]);
  const [listaCategorias, setListaCategorias] = useState([]);
  const [listaPlataformas, setListaPlataformas] = useState([]);

  const [listaCategoriasFiltrada, setListaCategoriasFiltradas] = useState([]);
  const [listaPlataformasFiltradas, setListaPlataformasFiltradas] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  const [listaJuegosFiltrados, setListaJuegosFiltrados] = useState([]);

  // 🔹 Cargar juegos y normalizar IDs
  async function llenarListaJuegos() {
    const datos = await getAll("http://localhost:3000/juegos");

    const juegosNormalizados = datos.map(juego => ({
      ...juego,
      categoria_ids: juego.categoria_ids.map(String),
      plataforma_ids: juego.plataforma_ids.map(String),
    }));

    setListaJuegos(juegosNormalizados);
    setListaJuegosFiltrados(juegosNormalizados); // Mostrar todos al inicio
  }

  async function llenarListaCategorias() {
    const datos = await getAll("http://localhost:3000/categorias");
    setListaCategorias(datos);
    setListaCategoriasFiltradas(datos.map((categoria) => String(categoria.id)));
  }

  async function llenarListaPlataformas() {
    const datos = await getAll("http://localhost:3000/plataformas");
    setListaPlataformas(datos);
    setListaPlataformasFiltradas(datos.map((plataforma) => String(plataforma.id)));
  }

  async function eliminarJuego(idJuego) {
    await deleteById("http://localhost:3000/juegos", idJuego);

    const nuevaLista = listaJuegos.filter((juego) => String(juego.id) !== String(idJuego));
    setListaJuegos(nuevaLista);
  }

  // 🔹 Filtrado AND real (Categoría + Plataforma + Nombre)
  useEffect(() => {
    if (!listaJuegos.length) return; // espera a que se carguen los juegos

    const juegosFiltrados = listaJuegos.filter(juego => {
      const pasaCategoria =
        listaCategoriasFiltrada.length > 0 &&
        listaCategoriasFiltrada.some(id =>
          juego.categoria_ids.includes(id)
        );

      const pasaPlataforma =
        listaPlataformasFiltradas.length > 0 &&
        listaPlataformasFiltradas.some(id =>
          juego.plataforma_ids.includes(id)
        );

      const pasaNombre =
        busqueda === "" ||
        juego.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        juego.Descripcion.toLowerCase().includes(busqueda.toLowerCase());

      return pasaCategoria && pasaPlataforma && pasaNombre;
    });

    setListaJuegosFiltrados(juegosFiltrados);
  }, [listaJuegos, listaCategoriasFiltrada, listaPlataformasFiltradas, busqueda]);

  // 🔹 Carga inicial
  useEffect(() => {
    llenarListaJuegos();
    llenarListaCategorias();
    llenarListaPlataformas();
  }, []);
    return ( 
        <div className="app-container">
      <h1>Categorías</h1>
      <div className="filtros">
        <MostrarCategorias
          listaCategorias={listaCategorias}
          categoriasSeleccionadas={listaCategoriasFiltrada}
          setCategoriasSeleccionadas={setListaCategoriasFiltradas}
        />
      </div>

      <h1>Plataformas</h1>
      <div className="filtros">
        <MostrarCategorias
          listaCategorias={listaPlataformas}
          categoriasSeleccionadas={listaPlataformasFiltradas}
          setCategoriasSeleccionadas={setListaPlataformasFiltradas}
        />
      </div>

      <h1>Lista de juegos</h1>
      <div className="zona-juegos">
        {listaJuegosFiltrados.length === 0 ? (
          <p className="no-resultados">
            No hay juegos que coincidan con los filtros
          </p>
        ) : (
          <MostrarJuegos
            listaJuegos={listaJuegosFiltrados}
            listaPlataformas={listaPlataformas}
            listaCategorias={listaCategorias}
            onEliminarJuego={eliminarJuego}
          />
        )}
      </div>

      <h1>Buscar por nombre o descripción</h1>
      <div>
        <FiltroNombre busqueda={busqueda} setBusqueda={setBusqueda} />
      </div>
    </div>
     );
}

export default ListaJuegos;