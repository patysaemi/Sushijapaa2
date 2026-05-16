import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import type { Categoria } from '../types/database';

export default function Categorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('#ef4444');
  const [ordem, setOrdem] = useState('0');
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from('categorias').select('*').order('ordem');
    if (data) setCategorias(data);
    setLoading(false);
  };

  const openModal = (cat?: Categoria) => {
    if (cat) {
      setEditingId(cat.id);
      setNome(cat.nome);
      setCor(cat.cor || '#ef4444');
      setOrdem(cat.ordem.toString());
      setAtivo(cat.ativo);
    } else {
      setEditingId(null);
      setNome('');
      setCor('#ef4444');
      setOrdem('0');
      setAtivo(true);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      nome,
      cor,
      ordem: parseInt(ordem),
      ativo
    };

    if (editingId) {
      const { error } = await supabase.from('categorias').update(payload).eq('id', editingId);
      if (error) alert('Erro ao atualizar: ' + error.message);
    } else {
      const { error } = await supabase.from('categorias').insert(payload);
      if (error) alert('Erro ao criar: ' + error.message);
    }

    closeModal();
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza? Isso pode afetar produtos desta categoria.')) {
      const { error } = await supabase.from('categorias').delete().eq('id', id);
      if (error) alert('Erro ao excluir: ' + error.message);
      else fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Categorias</h1>
          <p className="text-gray-400">Organize os produtos no sistema</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
        >
          <Plus size={20} /> Nova Categoria
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-950 border-b border-gray-800">
                <th className="p-4 text-gray-400 font-medium w-16">Ordem</th>
                <th className="p-4 text-gray-400 font-medium">Cor</th>
                <th className="p-4 text-gray-400 font-medium">Nome</th>
                <th className="p-4 text-gray-400 font-medium">Status</th>
                <th className="p-4 text-gray-400 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-4 text-center text-gray-500">Carregando...</td></tr>
              ) : categorias.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-gray-500">Nenhuma categoria encontrada.</td></tr>
              ) : (
                categorias.map((cat) => (
                  <tr key={cat.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="p-4 text-gray-300 text-center">{cat.ordem}</td>
                    <td className="p-4">
                      <div className="w-8 h-8 rounded-full border border-gray-700" style={{ backgroundColor: cat.cor }}></div>
                    </td>
                    <td className="p-4 font-bold text-gray-100">{cat.nome}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${cat.ativo ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                        {cat.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => openModal(cat)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg mr-2 transition-colors">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(cat.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-100">{editingId ? 'Editar Categoria' : 'Nova Categoria'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white p-2">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nome da Categoria</label>
                <input required type="text" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-gray-100" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Ordem (Exibição)</label>
                  <input required type="number" min="0" value={ordem} onChange={(e) => setOrdem(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-gray-100" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Cor</label>
                  <input required type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-lg h-[50px] p-1 cursor-pointer" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Status</label>
                <div className="flex items-center h-[50px] gap-2">
                  <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="w-5 h-5 accent-red-500" />
                  <span className="text-gray-300">{ativo ? 'Ativo' : 'Inativo'}</span>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-2">
                  <Check size={20} /> Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
