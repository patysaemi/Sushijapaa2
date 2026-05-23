import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UtensilsCrossed } from 'lucide-react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-950 text-gray-100 flex-col gap-4">
        <div className="bg-red-500 p-4 rounded-2xl animate-bounce shadow-2xl shadow-red-500/20">
          <UtensilsCrossed size={48} className="text-white" />
        </div>
        <div className="flex flex-col items-center">
          <h2 className="font-bold text-xl leading-tight tracking-tight text-white">Trailer Sushi</h2>
          <span className="text-xs text-red-500 font-semibold tracking-widest uppercase">Japa</span>
        </div>
        <div className="w-8 h-8 border-4 border-gray-800 border-t-red-500 rounded-full animate-spin mt-4"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
