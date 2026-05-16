import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, X, Check, Search, Upload } from 'lucide-react';
import type { Produto, Categoria } from '../types/database';

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [imagemUrl, setImagemUrl] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [uploadingImg, setUploadingImg] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Buscar categorias
    const { data: cats } = await supabase.from('categorias').select('*').order('nome');
    if (cats) setCategorias(cats);
    
    // Buscar produtos
    const { data: prods } = await supabase.from('produtos').select('*').order('nome');
    if (prods) setProdutos(prods);
    
    setLoading(false);
  };

  const openModal = (produto?: Produto) => {
    if (produto) {
      setEditingId(produto.id);
      setNome(produto.nome);
      setDescricao(produto.descricao || '');
      setPreco(produto.preco.toString());
      setImagemUrl(produto.imagem_url || '');
      setCategoriaId(produto.categoria_id || '');
      setAtivo(produto.ativo);
    } else {
      setEditingId(null);
      setNome('');
      setDescricao('');
      setPreco('');
      setImagemUrl('');
      setCategoriaId(categorias.length > 0 ? categorias[0].id : '');
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
      descricao,
      preco: parseFloat(preco.replace(',', '.')),
      imagem_url: imagemUrl,
      categoria_id: categoriaId,
      ativo
    };

    if (editingId) {
      const { error } = await supabase.from('produtos').update(payload).eq('id', editingId);
      if (error) alert('Erro ao atualizar: ' + error.message);
    } else {
      const { error } = await supabase.from('produtos').insert(payload);
      if (error) alert('Erro ao criar: ' + error.message);
    }

    closeModal();
    fetchData();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImg(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          setImagemUrl(canvas.toDataURL('image/webp', 0.8));
          setUploadingImg(false);
        };
      };
    } catch (error) {
      alert('Erro ao processar imagem');
      setUploadingImg(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      const { error } = await supabase.from('produtos').delete().eq('id', id);
      if (error) alert('Erro ao excluir: ' + error.message);
      else fetchData();
    }
  };

  const getCategoriaNome = (id: string) => {
    return categorias.find(c => c.id === id)?.nome || 'Sem categoria';
  };

  const produtosFiltrados = produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Produtos</h1>
          <p className="text-gray-400">Gerencie o cardápio do seu trailer</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
        >
          <Plus size={20} /> Novo Produto
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar produto por nome..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-gray-100 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-950 border-b border-gray-800">
                <th className="p-4 text-gray-400 font-medium">Produto</th>
                <th className="p-4 text-gray-400 font-medium">Categoria</th>
                <th className="p-4 text-gray-400 font-medium">Preço</th>
                <th className="p-4 text-gray-400 font-medium">Status</th>
                <th className="p-4 text-gray-400 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-4 text-center text-gray-500">Carregando...</td></tr>
              ) : produtosFiltrados.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-gray-500">Nenhum produto encontrado.</td></tr>
              ) : (
                produtosFiltrados.map((produto) => (
                  <tr key={produto.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="p-4 flex items-center gap-3">
                      {produto.imagem_url ? (
                        <img src={produto.imagem_url} alt={produto.nome} className="w-10 h-10 rounded-md object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-gray-800 flex items-center justify-center text-xs text-gray-500">Sem Img</div>
                      )}
                      <div>
                        <p className="font-bold text-gray-100">{produto.nome}</p>
                        <p className="text-xs text-gray-500 line-clamp-1 max-w-xs">{produto.descricao}</p>
                      </div>
                    </td>
                    <td className="p-4 text-gray-300">{getCategoriaNome(produto.categoria_id)}</td>
                    <td className="p-4 font-bold text-red-400">R$ {produto.preco.toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${produto.ativo ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                        {produto.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => openModal(produto)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg mr-2 transition-colors">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(produto.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
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
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-100">{editingId ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white p-2">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nome do Produto</label>
                <input required type="text" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-gray-100" />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Categoria</label>
                <select required value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-gray-100">
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Preço (R$)</label>
                  <input required type="number" step="0.01" min="0" value={preco} onChange={(e) => setPreco(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-gray-100" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Status</label>
                  <div className="flex items-center h-[50px] gap-2">
                    <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="w-5 h-5 accent-red-500" />
                    <span className="text-gray-300">{ativo ? 'Ativo' : 'Inativo'}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Imagem do Produto</label>
                <div className="flex gap-3 items-center">
                  {imagemUrl ? (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-700">
                      <img src={imagemUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => setImagemUrl('')}
                        className="absolute top-0 right-0 bg-red-600 p-1 text-white opacity-80 hover:opacity-100"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-800 flex items-center justify-center border border-gray-700">
                      <Upload size={20} className="text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input 
                      type="file" 
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      className="hidden" 
                    />
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImg}
                      className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-3 text-gray-300 font-medium transition-colors"
                    >
                      {uploadingImg ? 'Processando...' : 'Escolher Imagem do PC'}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Descrição</label>
                <textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-gray-100" />
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
