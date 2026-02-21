import { Navigate, Route, Routes } from "react-router-dom";
import AdminRoute from "./Componentes/AdminRoute";
import AsistenteIAWidget from "./Componentes/AsistenteIAWidget";
import ProtectedRoute from "./Componentes/ProtectedRoute";
import CarritoPage from "./paginas/v2/CarritoPage";
import DetalleJuegoPage from "./paginas/v2/DetalleJuegoPage";
import LoginPage from "./paginas/v2/LoginPage";
import MisJuegosPage from "./paginas/v2/MisJuegosPage";
import NuevoJuegoPage from "./paginas/v2/NuevoJuegoPage";
import ReportesJuegosPage from "./paginas/v2/ReportesJuegosPage";
import RegisterPage from "./paginas/v2/RegisterPage";
import TodosJuegosPage from "./paginas/v2/TodosJuegosPage";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/juegos" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/juegos" element={<TodosJuegosPage />} />
        <Route
          path="/mis-juegos"
          element={(
            <ProtectedRoute>
              <MisJuegosPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/juegos/nuevo"
          element={(
            <ProtectedRoute>
              <NuevoJuegoPage />
            </ProtectedRoute>
          )}
        />
        <Route path="/juegos/:id" element={<DetalleJuegoPage />} />
        <Route
          path="/carrito"
          element={(
            <ProtectedRoute>
              <CarritoPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/reportes"
          element={(
            <AdminRoute>
              <ReportesJuegosPage />
            </AdminRoute>
          )}
        />
        <Route path="*" element={<Navigate to="/juegos" replace />} />
      </Routes>
      <AsistenteIAWidget />
    </>
  );
}

export default App;



