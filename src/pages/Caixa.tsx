import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShoppingCart, ArrowLeft, Plus, Minus, Trash2, Printer, CheckCircle2 } from 'lucide-react';

type Categoria = { id: string; nome: string; cor: string; };
type ProdutoEstoque = { 
  produto_id: string; 
  nome: string; 
  preco: number; 
  imagem_url: string; 
  quantidade_atual: number; 
};
type CartItem = ProdutoEstoque & { quantidade_carrinho: number; subtotal: number; };

export default function Caixa() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [clienteNome, setClienteNome] = useState('');
  
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<Categoria | null>(null);
  
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [carrinho, setCarrinho] = useState<CartItem[]>([]);
  const [formaPagamento, setFormaPagamento] = useState('Dinheiro');
  
  const [pedidoFinalizadoId, setPedidoFinalizadoId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    const { data } = await supabase.from('categorias').select('*').eq('ativo', true).order('ordem');
    if (data) setCategorias(data);
  };

  const fetchProdutosDaCategoria = async (categoriaId: string) => {
    setLoading(true);
    // Busca os produtos da categoria que estão no estoque de HOJE
    // Devido à limitação de subqueries no cliente simplificado, faremos em duas etapas
    const { data: produtosDaCategoria } = await supabase
      .from('produtos')
      .select('*')
      .eq('categoria_id', categoriaId)
      .eq('ativo', true)
      .order('nome');

    if (!produtosDaCategoria || produtosDaCategoria.length === 0) {
      setProdutos([]);
      setLoading(false);
      return;
    }

    const produtosIds = produtosDaCategoria.map(p => p.id);
    const hoje = new Date().toISOString().split('T')[0];

    const { data: estoqueHoje } = await supabase
      .from('estoque_dia')
      .select('produto_id, quantidade_atual')
      .eq('data', hoje)
      .in('produto_id', produtosIds);

    // Mesclar os dados
    const produtosComEstoque: ProdutoEstoque[] = produtosDaCategoria.map(p => {
      const est = estoqueHoje?.find(e => e.produto_id === p.id);
      return {
        produto_id: p.id,
        nome: p.nome,
        preco: p.preco,
        imagem_url: p.imagem_url,
        quantidade_atual: est ? est.quantidade_atual : 0
      };
    });

    setProdutos(produtosComEstoque);
    setLoading(false);
  };

  const handleStartPedido = (e: React.FormEvent) => {
    e.preventDefault();
    if (clienteNome.trim()) {
      setStep(2);
    }
  };

  const selectCategoria = (cat: Categoria) => {
    setCategoriaSelecionada(cat);
    setStep(3);
    fetchProdutosDaCategoria(cat.id);
  };

  const adicionarAoCarrinho = (produto: ProdutoEstoque) => {
    setCarrinho(prev => {
      const existente = prev.find(i => i.produto_id === produto.produto_id);
      if (existente) {
        if (existente.quantidade_carrinho >= produto.quantidade_atual) {
          alert('Estoque insuficiente!');
          return prev;
        }
        return prev.map(i => 
          i.produto_id === produto.produto_id 
            ? { ...i, quantidade_carrinho: i.quantidade_carrinho + 1, subtotal: (i.quantidade_carrinho + 1) * i.preco }
            : i
        );
      }
      if (produto.quantidade_atual <= 0) {
        alert('Produto sem estoque!');
        return prev;
      }
      return [...prev, { ...produto, quantidade_carrinho: 1, subtotal: produto.preco }];
    });
  };

  const removerDoCarrinho = (produtoId: string) => {
    setCarrinho(prev => prev.filter(i => i.produto_id !== produtoId));
  };

  const atualizarQuantidade = (produtoId: string, delta: number) => {
    setCarrinho(prev => prev.map(i => {
      if (i.produto_id === produtoId) {
        const novaQtd = i.quantidade_carrinho + delta;
        if (novaQtd > i.quantidade_atual) {
          alert('Estoque insuficiente!');
          return i;
        }
        if (novaQtd <= 0) return i; // não remove aqui, usar removerDoCarrinho
        return { ...i, quantidade_carrinho: novaQtd, subtotal: novaQtd * i.preco };
      }
      return i;
    }));
  };

  const totalCarrinho = carrinho.reduce((acc, item) => acc + item.subtotal, 0);

  const finalizarPedido = async () => {
    if (carrinho.length === 0) return;

    try {
      // Inserir pedido
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .insert({
          cliente_nome: clienteNome,
          total: totalCarrinho,
          status: 'finalizado',
          forma_pagamento: formaPagamento,
        })
        .select()
        .single();

      if (pedidoError) throw pedidoError;

      // Inserir itens
      const itensToInsert = carrinho.map(item => ({
        pedido_id: pedido.id,
        produto_id: item.produto_id,
        produto_nome: item.nome,
        quantidade: item.quantidade_carrinho,
        preco_unitario: item.preco,
        subtotal: item.subtotal
      }));

      const { error: itensError } = await supabase.from('pedido_itens').insert(itensToInsert);
      
      if (itensError) throw itensError;

      setPedidoFinalizadoId(pedido.id);
      
    } catch (error) {
      console.error("Erro ao finalizar:", error);
      alert('Erro ao finalizar pedido.');
    }
  };

  const imprimirComanda = () => {
    // Nova janela para impressão térmica (80mm)
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;

    const dataHora = new Date().toLocaleString('pt-BR');
    
    let html = `
      <html>
      <head>
        <title>Comanda - Trailer Sushi Japa</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; width: 300px; margin: 0; padding: 10px; font-size: 14px; }
          .center { text-align: center; }
          .line { border-bottom: 1px dashed #000; margin: 10px 0; }
          .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .total { font-weight: bold; font-size: 16px; text-align: right; margin-top: 10px; }
        </style>
      </head>
      <body>
        <h2 class="center" style="margin-bottom: 5px;">TRAILER SUSHI JAPA</h2>
        <div class="center">Data: ${dataHora}</div>
        <div class="line"></div>
        <div><strong>Cliente:</strong> ${clienteNome}</div>
        <div class="line"></div>
    `;

    carrinho.forEach(item => {
      html += `
        <div class="item">
          <span>${item.quantidade_carrinho}x ${item.nome}</span>
          <span>R$ ${item.subtotal.toFixed(2)}</span>
        </div>
      `;
    });

    html += `
        <div class="line"></div>
        <div class="total">TOTAL: R$ ${totalCarrinho.toFixed(2)}</div>
        <div class="line"></div>
        <div class="center" style="margin-top: 20px;">Obrigado pela preferência!</div>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const novoPedido = () => {
    setClienteNome('');
    setCarrinho([]);
    setStep(1);
    setPedidoFinalizadoId(null);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-6 -mx-4 -mt-4">
      {/* Lado Esquerdo - Fluxo */}
      <div className="flex-1 bg-gray-900 rounded-2xl p-6 border border-gray-800 flex flex-col">
        
        {step === 1 && (
          <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-6">
              <ShoppingCart size={32} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-100 mb-8">Novo Pedido</h2>
            <form onSubmit={handleStartPedido} className="w-full space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Nome do Cliente</label>
                <input 
                  type="text" 
                  required
                  autoFocus
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-4 text-xl text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Ex: João Silva"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-4 text-xl font-bold transition-colors"
              >
                Continuar
              </button>
            </form>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-100">Escolha uma Categoria</h2>
              <button 
                onClick={() => setStep(1)}
                className="flex items-center gap-2 text-gray-400 hover:text-white bg-gray-800 px-4 py-2 rounded-lg"
              >
                <ArrowLeft size={20} /> Voltar
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 auto-rows-fr">
              {categorias.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => selectCategoria(cat)}
                  style={{ borderLeftColor: cat.cor, borderLeftWidth: '4px' }}
                  className="bg-gray-800 hover:bg-gray-700 text-left p-6 rounded-xl flex flex-col justify-center min-h-[120px] transition-all transform hover:scale-[1.02]"
                >
                  <span className="text-xl font-bold text-gray-100">{cat.nome}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setStep(2)}
                  className="text-gray-400 hover:text-white bg-gray-800 p-2 rounded-lg"
                >
                  <ArrowLeft size={20} />
                </button>
                <h2 className="text-2xl font-bold text-gray-100">{categoriaSelecionada?.nome}</h2>
              </div>
            </div>
            
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">Carregando produtos...</div>
            ) : produtos.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">Nenhum produto cadastrado nesta categoria.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pr-2 pb-4">
                {produtos.map(prod => (
                  <button
                    key={prod.produto_id}
                    onClick={() => adicionarAoCarrinho(prod)}
                    disabled={prod.quantidade_atual <= 0}
                    className={`text-left p-4 rounded-xl flex flex-col transition-all border ${
                      prod.quantidade_atual > 0 
                        ? 'bg-gray-800 border-gray-700 hover:border-red-500 hover:bg-gray-750 transform hover:-translate-y-1' 
                        : 'bg-gray-900 border-red-900/30 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="h-32 w-full bg-gray-950 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                      {prod.imagem_url ? (
                        <img src={prod.imagem_url} alt={prod.nome} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingCart size={32} className="text-gray-800" />
                      )}
                    </div>
                    <h3 className="font-bold text-gray-100 line-clamp-2 min-h-[48px]">{prod.nome}</h3>
                    <div className="flex items-center justify-between mt-auto pt-2">
                      <span className="text-red-400 font-bold">R$ {prod.preco.toFixed(2)}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${prod.quantidade_atual > 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                        {prod.quantidade_atual} disp.
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Lado Direito - Carrinho / Comanda */}
      <div className="w-96 bg-gray-900 rounded-2xl border border-gray-800 flex flex-col overflow-hidden">
        <div className="p-4 bg-gray-950 border-b border-gray-800">
          <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
            <ShoppingCart size={20} className="text-red-500" /> 
            Comanda Atual
          </h3>
          {clienteNome && (
            <p className="text-sm text-gray-400 mt-1">Cliente: <span className="text-white font-medium">{clienteNome}</span></p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {pedidoFinalizadoId ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4 text-center">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center">
                <CheckCircle2 size={40} className="text-green-500" />
              </div>
              <p>Comanda enviada e fechada.</p>
            </div>
          ) : carrinho.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm text-center">
              Adicione produtos para começar
            </div>
          ) : (
            carrinho.map(item => (
              <div key={item.produto_id} className="bg-gray-800 p-3 rounded-lg flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-sm text-gray-100">{item.nome}</span>
                  <button onClick={() => removerDoCarrinho(item.produto_id)} className="text-red-500 hover:bg-red-500/10 p-1 rounded">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3 bg-gray-950 rounded-lg p-1">
                    <button 
                      onClick={() => atualizarQuantidade(item.produto_id, -1)}
                      className="p-1 hover:bg-gray-800 rounded text-gray-400"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-medium text-sm w-4 text-center">{item.quantidade_carrinho}</span>
                    <button 
                      onClick={() => atualizarQuantidade(item.produto_id, 1)}
                      className="p-1 hover:bg-gray-800 rounded text-gray-400"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="font-bold text-red-400">R$ {item.subtotal.toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-800 bg-gray-950">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-400 font-medium">Subtotal</span>
            <span className="text-2xl font-bold text-gray-100">R$ {totalCarrinho.toFixed(2)}</span>
          </div>

          {!pedidoFinalizadoId ? (
            <div className="space-y-3">
              <select 
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-gray-100 focus:outline-none focus:border-red-500"
              >
                <option value="Dinheiro">Dinheiro</option>
                <option value="Pix">Pix</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
              </select>

              <button 
                onClick={finalizarPedido}
                disabled={carrinho.length === 0}
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors ${
                  carrinho.length > 0 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 size={24} />
                Finalizar Pedido
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-green-900/30 border border-green-500/30 text-green-400 p-3 rounded-lg text-center font-bold text-sm">
                Pedido Finalizado com Sucesso!
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={imprimirComanda}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Printer size={20} /> Imprimir
                </button>
                <button 
                  onClick={novoPedido}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus size={20} /> Novo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
