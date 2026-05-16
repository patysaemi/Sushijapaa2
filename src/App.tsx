import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Caixa from './pages/Caixa';
import Produtos from './pages/Produtos';
import Estoque from './pages/Estoque';
import Pedidos from './pages/Pedidos';
import Categorias from './pages/Categorias';
import Relatorios from './pages/Relatorios';
import Configuracoes from './pages/Configuracoes';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="caixa" element={<Caixa />} />
          <Route path="produtos" element={<Produtos />} />
          <Route path="estoque" element={<Estoque />} />
          <Route path="pedidos" element={<Pedidos />} />
          <Route path="categorias" element={<Categorias />} />
          <Route path="relatorios" element={<Relatorios />} />
          <Route path="configuracoes" element={<Configuracoes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
