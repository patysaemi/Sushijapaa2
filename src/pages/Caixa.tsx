import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShoppingCart, ArrowLeft, Plus, Minus, Trash2, Printer, Search } from 'lucide-react';

type Categoria = { id: string; nome: string; cor: string; };
type ProdutoEstoque = { 
  produto_id: string; 
  nome: string; 
  preco: number; 
  imagem_url: string; 
  quantidade_atual: number; 
};
type CartItem = ProdutoEstoque & { quantidade_carrinho: number; subtotal: number; };

type ProdutoComCategoria = ProdutoEstoque & {
  categoria_nome: string;
  categoria_cor: string;
  categoria_id: string;
};

export default function Caixa() {
  const [step, setStep] = useState<1 | 2>(1);
  const [clienteNome, setClienteNome] = useState('');
  
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<Categoria | null>(null);
  
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [carrinho, setCarrinho] = useState<CartItem[]>([]);
  const [formaPagamento, setFormaPagamento] = useState('Dinheiro');
  
  const [todosProdutos, setTodosProdutos] = useState<ProdutoComCategoria[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    fetchCategorias();
    fetchTodosProdutos();
  }, []);

  const fetchCategorias = async () => {
    const { data } = await supabase.from('categorias').select('*').eq('ativo', true).order('ordem');
    if (data) setCategorias(data);
  };

  const fetchTodosProdutos = async () => {
    try {
      const { data: todosProds } = await supabase
        .from('produtos')
        .select('id, nome, preco, imagem_url, categoria_id')
        .eq('ativo', true);

      if (!todosProds || todosProds.length === 0) return;

      const { data: cats } = await supabase
        .from('categorias')
        .select('id, nome, cor');

      const hoje = new Date().toISOString().split('T')[0];
      const { data: estoqueHoje } = await supabase
        .from('estoque_dia')
        .select('produto_id, quantidade_atual')
        .eq('data', hoje);

      const produtosCompletos: ProdutoComCategoria[] = todosProds.map(p => {
        const est = estoqueHoje?.find(e => e.produto_id === p.id);
        const cat = cats?.find(c => c.id === p.categoria_id);
        return {
          produto_id: p.id,
          nome: p.nome,
          preco: p.preco,
          imagem_url: p.imagem_url,
          quantidade_atual: est ? est.quantidade_atual : 0,
          categoria_id: p.categoria_id,
          categoria_nome: cat ? cat.nome : 'Sem Categoria',
          categoria_cor: cat ? cat.cor : '#9CA3AF'
        };
      });

      setTodosProdutos(produtosCompletos);
    } catch (err) {
      console.error('Erro ao buscar todos os produtos:', err);
    }
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



  const selectCategoria = (cat: Categoria) => {
    setCategoriaSelecionada(cat);
    setStep(2);
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

  const finalizarEImprimir = async () => {
    if (carrinho.length === 0 || !clienteNome.trim()) return;

    try {
      // 1. Inserir pedido no banco de dados
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

      // 2. Inserir itens do pedido
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

      // 3. Chamar a impressão da comanda imediatamente
      imprimirComanda();

      // 4. Limpar o pedido atual e preparar para o próximo cliente
      setClienteNome('');
      setCarrinho([]);
      setStep(1);
      fetchTodosProdutos(); // Atualiza estoque

    } catch (error) {
      console.error("Erro ao finalizar pedido:", error);
      alert('Erro ao finalizar e imprimir o pedido.');
    }
  };

  const cancelarPedido = () => {
    if (carrinho.length === 0 && !clienteNome.trim()) return;
    if (window.confirm("Deseja realmente cancelar e limpar este pedido atual?")) {
      setClienteNome('');
      setCarrinho([]);
      setStep(1);
    }
  };

  const imprimirComanda = () => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;

    const dataHora = new Date().toLocaleString('pt-BR');
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comanda - ${clienteNome}</title>
        <style>
          @page { 
            size: 80mm auto; 
            margin: 0; 
          }
          html, body {
            margin: 0;
            padding: 0;
            background-color: #fff;
          }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            width: 72mm; 
            margin: 0 auto; 
            padding: 10px 5px; 
            font-size: 16px; 
            color: #000;
            line-height: 1.3;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .text-uppercase { text-transform: uppercase; }
          .header-title {
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 2px;
            letter-spacing: 0.5px;
          }
          .header-subtitle {
            font-size: 14px;
            margin-bottom: 4px;
            letter-spacing: 0.5px;
          }
          .header-date {
            font-size: 14px;
            margin-bottom: 8px;
          }
          .client-box {
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            padding: 6px 0;
            margin: 8px 0;
            text-align: center;
          }
          .client-title {
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 2px;
            letter-spacing: 1px;
          }
          .client-name {
            font-size: 28px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
          }
          .items-table th {
            font-weight: bold;
            font-size: 14px;
            padding: 4px 0;
            text-align: center;
          }
          .items-table th.col-qtd {
            width: 15%;
          }
          .items-table th.col-item {
            width: 60%;
          }
          .items-table th.col-valor {
            width: 25%;
          }
          .items-table td {
            padding: 6px 0;
            vertical-align: middle;
            font-size: 16px;
          }
          .items-table td.col-qtd {
            text-align: center;
            font-weight: bold;
            font-size: 20px;
          }
          .items-table td.col-item {
            text-align: center;
            text-transform: uppercase;
            word-break: break-word;
            font-weight: bold;
            font-size: 20px;
          }
          .items-table td.col-valor {
            text-align: center;
            font-size: 15px;
            white-space: nowrap;
          }
          .total-box {
            border-top: 3px solid #000;
            border-bottom: 3px solid #000;
            padding: 8px 0;
            margin: 8px 0 15px 0;
            text-align: center;
            font-size: 22px;
            font-weight: bold;
          }
          .footer {
            font-size: 13px;
            margin-top: 15px;
            line-height: 1.4;
          }
          .footer-thanks {
            font-weight: bold;
            margin-bottom: 2px;
          }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="header-title">TRAILER SUSHI JAPA</div>
          <div class="header-subtitle">COMPROVANTE DE PEDIDO</div>
          <div class="header-date">${dataHora}</div>
        </div>

        <div class="client-box">
          <div class="client-title">CLIENTE</div>
          <div class="client-name">${clienteNome}</div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th class="col-qtd">QTD</th>
              <th class="col-item">ITEM</th>
              <th class="col-valor">VALOR</th>
            </tr>
          </thead>
          <tbody>
    `;

    carrinho.forEach(item => {
      html += `
            <tr>
              <td class="col-qtd">${item.quantidade_carrinho}</td>
              <td class="col-item">${item.nome}</td>
              <td class="col-valor">R$ ${item.subtotal.toFixed(2)}</td>
            </tr>
      `;
    });

    html += `
          </tbody>
        </table>

        <div class="total-box">
          TOTAL: R$ ${totalCarrinho.toFixed(2)}
        </div>

        <div class="center footer">
          <div class="footer-thanks">*** OBRIGADO PELA PREFERÊNCIA ***</div>
          <div class="bold">VOLTE SEMPRE!</div>
        </div>

        <script>
          window.onload = function() { 
            window.print(); 
            setTimeout(function() {
              window.close();
            }, 500);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };


  const produtosFiltrados = searchQuery.trim() === '' 
    ? [] 
    : todosProdutos.filter(prod => 
        prod.nome.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const handleSelectProduct = (prod: ProdutoComCategoria) => {
    adicionarAoCarrinho(prod);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-6 -mx-4 -mt-4">
      {/* Lado Esquerdo - Fluxo */}
      <div className="flex-1 bg-gray-900 rounded-2xl p-6 border border-gray-800 flex flex-col">
        


        {step === 1 && (
          <div className="flex flex-col h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative">
              <h2 className="text-2xl font-bold text-gray-100">Escolha uma Categoria</h2>
              
              <div className="relative w-full sm:w-80">
                <div className="relative z-50">
                  <input
                    type="text"
                    placeholder="Pesquisar produto..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsSearchOpen(true);
                    }}
                    onFocus={() => setIsSearchOpen(true)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-12 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setIsSearchOpen(false);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 text-xs bg-gray-700 hover:bg-gray-600 rounded px-1.5 py-0.5 cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {isSearchOpen && searchQuery.trim() !== '' && (
                  <>
                    <div 
                      className="fixed inset-0 z-40 cursor-default" 
                      onClick={() => setIsSearchOpen(false)}
                    />
                    <div className="absolute left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto divide-y divide-gray-750">
                      {produtosFiltrados.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          Nenhum produto encontrado
                        </div>
                      ) : (
                        produtosFiltrados.map(prod => (
                          <button
                            key={prod.produto_id}
                            onClick={() => handleSelectProduct(prod)}
                            className="w-full text-left p-3 hover:bg-gray-750 flex items-center gap-3 transition-colors first:rounded-t-xl last:rounded-b-xl cursor-pointer"
                          >
                            <div className="w-10 h-10 bg-gray-950 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-700">
                              {prod.imagem_url ? (
                                <img src={prod.imagem_url} alt={prod.nome} className="w-full h-full object-cover" />
                              ) : (
                                <ShoppingCart size={18} className="text-gray-600" />
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="font-bold text-sm text-gray-100 truncate block pr-2">{prod.nome}</span>
                                <span 
                                  style={{ backgroundColor: prod.categoria_cor + '15', color: prod.categoria_cor, borderColor: prod.categoria_cor + '30' }}
                                  className="text-[9px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap"
                                >
                                  {prod.categoria_nome}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-red-400 font-bold">R$ {prod.preco.toFixed(2)}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                  prod.quantidade_atual > 0 
                                    ? 'bg-green-900/20 text-green-400 border border-green-500/20' 
                                    : 'bg-red-900/20 text-red-400 border border-red-500/20'
                                }`}>
                                  {prod.quantidade_atual > 0 ? `${prod.quantidade_atual} disp.` : 'Sem estoque'}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 auto-rows-fr">
              {categorias.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => selectCategoria(cat)}
                  style={{ borderLeftColor: cat.cor, borderLeftWidth: '4px' }}
                  className="bg-gray-800 hover:bg-gray-700 text-left p-6 rounded-xl flex flex-col justify-center min-h-[120px] transition-all transform hover:scale-[1.02] cursor-pointer"
                >
                  <span className="text-xl font-bold text-gray-100">{cat.nome}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setStep(1)}
                  className="text-gray-400 hover:text-white bg-gray-800 p-2 rounded-lg cursor-pointer"
                >
                  <ArrowLeft size={20} />
                </button>
                <h2 className="text-2xl font-bold text-gray-100">{categoriaSelecionada?.nome}</h2>
              </div>

              <div className="relative w-full sm:w-80">
                <div className="relative z-50">
                  <input
                    type="text"
                    placeholder="Pesquisar produto..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsSearchOpen(true);
                    }}
                    onFocus={() => setIsSearchOpen(true)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-12 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setIsSearchOpen(false);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 text-xs bg-gray-700 hover:bg-gray-600 rounded px-1.5 py-0.5 cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {isSearchOpen && searchQuery.trim() !== '' && (
                  <>
                    <div 
                      className="fixed inset-0 z-40 cursor-default" 
                      onClick={() => setIsSearchOpen(false)}
                    />
                    <div className="absolute left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto divide-y divide-gray-750">
                      {produtosFiltrados.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          Nenhum produto encontrado
                        </div>
                      ) : (
                        produtosFiltrados.map(prod => (
                          <button
                            key={prod.produto_id}
                            onClick={() => handleSelectProduct(prod)}
                            className="w-full text-left p-3 hover:bg-gray-750 flex items-center gap-3 transition-colors first:rounded-t-xl last:rounded-b-xl cursor-pointer"
                          >
                            <div className="w-10 h-10 bg-gray-950 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-700">
                              {prod.imagem_url ? (
                                <img src={prod.imagem_url} alt={prod.nome} className="w-full h-full object-cover" />
                              ) : (
                                <ShoppingCart size={18} className="text-gray-600" />
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="font-bold text-sm text-gray-100 truncate block pr-2">{prod.nome}</span>
                                <span 
                                  style={{ backgroundColor: prod.categoria_cor + '15', color: prod.categoria_cor, borderColor: prod.categoria_cor + '30' }}
                                  className="text-[9px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap"
                                >
                                  {prod.categoria_nome}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-red-400 font-bold">R$ {prod.preco.toFixed(2)}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                  prod.quantidade_atual > 0 
                                    ? 'bg-green-900/20 text-green-400 border border-green-500/20' 
                                    : 'bg-red-900/20 text-red-400 border border-red-500/20'
                                }`}>
                                  {prod.quantidade_atual > 0 ? `${prod.quantidade_atual} disp.` : 'Sem estoque'}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
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
        <div className="p-4 bg-gray-950 border-b border-gray-800 flex flex-col gap-3">
          <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
            <ShoppingCart size={20} className="text-red-500" /> 
            Comanda Atual
          </h3>
          <div>
            <input 
              type="text" 
              placeholder="Nome do Cliente (Obrigatório)" 
              value={clienteNome}
              onChange={(e) => setClienteNome(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {carrinho.length === 0 ? (
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

          <div className="space-y-3">
            <select 
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-gray-100 focus:outline-none focus:border-red-500 cursor-pointer"
            >
              <option value="Dinheiro">Dinheiro</option>
              <option value="Pix">Pix</option>
              <option value="Cartão de Crédito">Cartão de Crédito</option>
              <option value="Cartão de Débito">Cartão de Débito</option>
            </select>

            <div className="flex gap-3">
              <button 
                onClick={cancelarPedido}
                disabled={carrinho.length === 0 && !clienteNome.trim()}
                className="flex-1 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors border border-gray-750 bg-gray-800 hover:bg-gray-750 text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={finalizarEImprimir}
                disabled={carrinho.length === 0 || !clienteNome.trim()}
                className={`flex-[2] py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors ${
                  carrinho.length > 0 && clienteNome.trim()
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20 cursor-pointer' 
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Printer size={22} />
                Imprimir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
