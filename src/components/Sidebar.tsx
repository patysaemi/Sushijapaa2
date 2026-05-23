import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  PackageSearch, 
  ListOrdered, 
  PieChart, 
  Settings, 
  UtensilsCrossed,
  LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    if (window.confirm('Deseja realmente sair do sistema?')) {
      await logout();
      navigate('/login');
    }
  };

  const menuItems = [
    { path: '/caixa', label: 'Pedidos', icon: <ShoppingCart size={20} /> },
    { path: '/pedidos', label: 'Lista de Pedidos', icon: <ListOrdered size={20} /> },
    { path: '/relatorios', label: 'Relatórios', icon: <PieChart size={20} /> },
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/estoque', label: 'Estoque do Dia', icon: <PackageSearch size={20} /> },
    { path: '/configuracoes', label: 'Configurações', icon: <Settings size={20} /> },
  ];

  const handleNavigate = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    if (location.pathname === path) return;

    const event = new CustomEvent('navigation-attempt', { 
      detail: { path }, 
      cancelable: true 
    });
    const allowNav = window.dispatchEvent(event);
    
    if (allowNav) {
      navigate(path);
    }
  };

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 h-screen flex flex-col">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-red-500 p-2 rounded-lg">
          <UtensilsCrossed size={24} className="text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight tracking-tight text-white">Trailer Sushi</h1>
          <span className="text-xs text-red-500 font-semibold tracking-widest">JAPA</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <a
              href={item.path}
              key={item.path}
              onClick={(e) => handleNavigate(e, item.path)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                isActive 
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </a>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-gray-800 flex flex-col gap-2">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer text-gray-400 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20 font-medium text-sm w-full"
        >
          <LogOut size={16} />
          <span>Sair</span>
        </button>
        <p className="text-[10px] text-gray-600 text-center mt-1">v1.0.0 - Caixa</p>
      </div>
    </aside>
  );
}
