import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-950 text-gray-100 flex-col gap-4">
        <div className="w-24 h-24 mb-2 animate-bounce">
          <img src="/logo.png" alt="Sushi Japa Logo" className="w-full h-full object-contain rounded-2xl shadow-2xl shadow-red-500/10" />
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
