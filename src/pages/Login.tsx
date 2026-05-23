import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UtensilsCrossed, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If user is already logged in, redirect them to the home page
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) {
        // Tradução amigável de erros comuns do Supabase
        if (error.message === 'Invalid login credentials') {
          setErrorMsg('E-mail ou senha incorretos.');
        } else if (error.message === 'Email not confirmed') {
          setErrorMsg('Por favor, confirme seu e-mail antes de fazer o login.');
        } else {
          setErrorMsg(error.message);
        }
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      console.error('Erro de autenticação:', err);
      setErrorMsg('Ocorreu um erro ao processar seu login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-950 text-gray-100 relative overflow-hidden">
      {/* Detalhes de luz de fundo premium */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-600/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gray-800/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo e Título */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-red-500 p-4 rounded-2xl shadow-xl shadow-red-500/20 mb-4 transition-transform hover:scale-[1.05] duration-300">
            <UtensilsCrossed size={40} className="text-white" />
          </div>
          <h1 className="font-bold text-3xl leading-tight tracking-tight text-white">Trailer Sushi</h1>
          <span className="text-sm text-red-500 font-bold tracking-widest uppercase mt-1">Painel Administrativo</span>
        </div>

        {/* Card de Login Glassmorphic */}
        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-gray-200 mb-6 text-center">Acesse sua conta</h2>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center gap-3 mb-6 animate-pulse text-sm">
              <AlertCircle size={20} className="flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* E-mail Input */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer" htmlFor="email-input">
                E-mail
              </label>
              <div className="relative">
                <input
                  id="email-input"
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-11 pr-4 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all disabled:opacity-50"
                  required
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
              </div>
            </div>

            {/* Senha Input */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer" htmlFor="password-input">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-11 pr-12 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all disabled:opacity-50"
                  required
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Botão de Entrar */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Entrando...</span>
                </>
              ) : (
                <span>Entrar no Sistema</span>
              )}
            </button>
          </form>
        </div>

        {/* Rodapé da tela */}
        <p className="text-center text-xs text-gray-600 mt-8">
          Trailer Sushi v1.0.0 - Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
