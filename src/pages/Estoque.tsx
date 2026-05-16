import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Save, Search, AlertCircle, AlertTriangle } from 'lucide-react';
import type { Produto, Categoria } from '../types/database';

export default function Estoque() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [estoque, setEstoque] = useState<{ [produto_id: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');

  // Unsaved changes tracking
  const [isDirty, setIsDirty] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [pendingNavPath, setPendingNavPath] = useState<string | null>(null);
  const navigate = useNavigate();

  const hoje = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleNavAttempt = (e: Event) => {
      if (isDirty) {
        e.preventDefault();
        const customEvent = e as CustomEvent<{path: string}>;
        setPendingNavPath(customEvent.detail.path);
        setShowSaveModal(true);
      }
    };
    
    window.addEventListener('navigation-attempt', handleNavAttempt);
    return () => window.removeEventListener('navigation-attempt', handleNavAttempt);
  }, [isDirty]);

  const fetchData = async () => {
    setLoading(true);
    
    // Buscar categorias
    const { data: cats } = await supabase.from('categorias').select('*').order('nome');
    if (cats) setCategorias(cats);
    
    // Buscar produtos ativos
    const { data: prods } = await supabase.from('produtos').select('*').eq('ativo', true).order('nome');
    if (prods) setProdutos(prods);
    
    // Buscar estoque de hoje
    const { data: estHoje } = await supabase.from('estoque_dia').select('*').eq('data', hoje);
    
    const estoqueMap: { [key: string]: number } = {};
    if (estHoje) {
      estHoje.forEach(item => {
        estoqueMap[item.produto_id] = item.quantidade_atual;
      });
    }
    
    // Se um produto não tem estoque hoje, inicia com 0
    if (prods) {
      prods.forEach(p => {
        if (estoqueMap[p.id] === undefined) {
          estoqueMap[p.id] = 0;
        }
      });
    }

    setEstoque(estoqueMap);
    setLoading(false);
  };

  const handleEstoqueChange = (produtoId: string, valor: string) => {
    const num = parseInt(valor);
    setEstoque(prev => ({
      ...prev,
      [produtoId]: isNaN(num) || num < 0 ? 0 : num
    }));
    setIsDirty(true);
  };

  const salvarEstoque = async (navigateAfterSave?: string) => {
    setSalvando(true);
    
    try {
      const payload = Object.entries(estoque).map(([produto_id, quantidade]) => ({
        produto_id,
        data: hoje,
        quantidade_inicial: quantidade, 
        quantidade_atual: quantidade
      }));

      const { error } = await supabase.from('estoque_dia').upsert(payload, { onConflict: 'produto_id, data' });
      
      if (error) throw error;
      
      setIsDirty(false);
      alert('Estoque atualizado com sucesso!');
      
      if (navigateAfterSave) {
        navigate(navigateAfterSave);
      }
    } catch (error: any) {
      alert('Erro ao salvar estoque: ' + error.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleForceLeave = () => {
    setIsDirty(false);
    if (pendingNavPath) {
      navigate(pendingNavPath);
    }
  };

  const getCategoriaNome = (id: string) => {
    return categorias.find(c => c.id === id)?.nome || 'Sem categoria';
  };

  const produtosFiltrados = produtos.filter(p => {
    const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase());
    const matchCat = categoriaFiltro ? p.categoria_id === categoriaFiltro : true;
    return matchBusca && matchCat;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Estoque do Dia</h1>
          <p className="text-gray-400">Abasteça os itens disponíveis para venda hoje ({new Date().toLocaleDateString('pt-BR')})</p>
        </div>
        <button 
          onClick={salvarEstoque}
          disabled={salvando}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-green-600/20"
        >
          <Save size={20} /> {salvando ? 'Salvando...' : 'Salvar Estoque'}
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar produto..." 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-10 pr-4 py-3 text-gray-100 focus:outline-none focus:border-red-500"
          />
        </div>
        <select 
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          className="bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:border-red-500 w-64"
        >
          <option value="">Todas as Categorias</option>
          {categorias.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.nome}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-12">Carregando estoque...</div>
      ) : produtosFiltrados.length === 0 ? (
        <div className="text-center text-gray-500 py-12">Nenhum produto encontrado.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {produtosFiltrados.map((produto) => {
            const qtd = estoque[produto.id] || 0;
            return (
              <div key={produto.id} className={`bg-gray-900 border rounded-xl p-4 flex items-center gap-4 transition-colors ${qtd <= 5 ? 'border-red-900/50' : 'border-gray-800'}`}>
                {produto.imagem_url ? (
                  <img src={produto.imagem_url} alt={produto.nome} className="w-16 h-16 rounded-lg object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-800 flex items-center justify-center text-xs text-gray-500">Sem Img</div>
                )}
                
                <div className="flex-1">
                  <div className="text-xs text-red-400 font-bold mb-1">{getCategoriaNome(produto.categoria_id)}</div>
                  <h3 className="font-bold text-gray-100 line-clamp-1">{produto.nome}</h3>
                  {qtd <= 5 && (
                    <div className="text-xs text-red-500 flex items-center gap-1 mt-1">
                      <AlertCircle size={12} /> {qtd === 0 ? 'Sem estoque' : 'Estoque baixo'}
                    </div>
                  )}
                </div>
                
                <div className="w-24">
                  <input 
                    type="number"
                    min="0"
                    value={qtd === 0 ? '' : qtd}
                    onChange={(e) => handleEstoqueChange(produto.id, e.target.value)}
                    placeholder="0"
                    className="w-full bg-gray-950 border border-gray-700 focus:border-red-500 rounded-lg p-3 text-center text-xl font-bold text-white outline-none"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Salvar Alterações */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border-2 border-red-500 rounded-3xl w-full max-w-lg p-8 shadow-2xl shadow-red-500/20 text-center transform scale-100 transition-all">
            <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={48} className="text-red-500" />
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-4">Atenção!</h2>
            <p className="text-xl text-gray-300 mb-8">
              Você alterou o estoque do dia mas <strong className="text-white">ainda não salvou</strong>.<br/>
              Deseja salvar antes de sair?
            </p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  setShowSaveModal(false);
                  salvarEstoque(pendingNavPath || undefined);
                }}
                disabled={salvando}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xl py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/30"
              >
                <Save size={24} /> {salvando ? 'Salvando...' : 'Salvar e Sair'}
              </button>
              
              <button 
                onClick={handleForceLeave}
                className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-lg py-4 rounded-xl transition-all"
              >
                Sair sem salvar
              </button>
              
              <button 
                onClick={() => setShowSaveModal(false)}
                className="mt-2 text-gray-500 hover:text-white underline text-sm"
              >
                Cancelar e continuar na página
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
