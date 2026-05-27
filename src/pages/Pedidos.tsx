import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, Printer, XCircle, Trash2, X } from 'lucide-react';
import type { Pedido, PedidoItem } from '../types/database';

export default function Pedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);
  const [itensPedido, setItensPedido] = useState<PedidoItem[]>([]);
  const [loadingItens, setLoadingItens] = useState(false);

  const hoje = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchPedidos();
  }, []);

  const fetchPedidos = async () => {
    setLoading(true);
    // Buscar apenas os pedidos de hoje por padrão
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .gte('data', `${hoje}T00:00:00`)
      .lte('data', `${hoje}T23:59:59`)
      .order('data', { ascending: false });
      
    if (data) setPedidos(data);
    setLoading(false);
  };

  const visualizarPedido = async (pedido: Pedido) => {
    setPedidoSelecionado(pedido);
    setIsModalOpen(true);
    setLoadingItens(true);
    
    const { data } = await supabase
      .from('pedido_itens')
      .select('*')
      .eq('pedido_id', pedido.id);
      
    if (data) setItensPedido(data);
    setLoadingItens(false);
  };

  const cancelarPedido = async (id: string) => {
    if (confirm('Deseja realmente CANCELAR este pedido? Os itens retornarão ao estoque.')) {
      const { error } = await supabase
        .from('pedidos')
        .update({ status: 'cancelado' })
        .eq('id', id);
        
      if (error) alert('Erro ao cancelar: ' + error.message);
      else {
        fetchPedidos();
        if (pedidoSelecionado?.id === id) setIsModalOpen(false);
      }
    }
  };

  const excluirPedido = async (id: string) => {
    if (confirm('Atenção: A EXCLUSÃO apagará o pedido definitivamente e os itens já foram devolvidos ao estoque se foi cancelado. Continuar?')) {
      const { error } = await supabase
        .from('pedidos')
        .delete()
        .eq('id', id);
        
      if (error) alert('Erro ao excluir: ' + error.message);
      else {
        fetchPedidos();
        if (pedidoSelecionado?.id === id) setIsModalOpen(false);
      }
    }
  };

  const reimprimirPedido = async (pedido: Pedido) => {
    const { data: itens } = await supabase
      .from('pedido_itens')
      .select('*')
      .eq('pedido_id', pedido.id);
      
    if (!itens) return;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;

    const dataHora = format(new Date(pedido.data), 'dd/MM/yyyy HH:mm');
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comanda - ${pedido.cliente_nome}</title>
        <style>
          @page { margin: 0; }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            width: 80mm; 
            max-width: 300px; 
            margin: 0 auto; 
            padding: 15px 10px; 
            font-size: 12px; 
            color: #000;
            line-height: 1.3;
            text-align: center;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-bottom: 2px dashed #000; margin: 8px 0; }
          .item-centered { 
            text-align: center; 
            font-size: 24px; 
            font-weight: bold; 
            text-transform: uppercase;
            margin-bottom: 10px;
          }
          .item-price-centered { 
            font-size: 20px; 
            font-weight: bold; 
            margin-top: 3px;
          }
          .total { font-weight: bold; font-size: 26px; text-align: center; margin: 12px 0; }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 14px; margin-bottom: 3px;">TRAILER SUSHI JAPA</div>
        <div class="center" style="font-size: 10px; margin-bottom: 3px;">*** REIMPRESSÃO ***</div>
        <div class="line"></div>
        <div class="center bold" style="text-transform: uppercase; font-size: 15px; margin-bottom: 3px;">CLIENTE: ${pedido.cliente_nome}</div>
        <div class="center" style="font-size: 11px;">DATA: ${dataHora}</div>
        <div class="line"></div>
    `;

    itens.forEach(item => {
      html += `
        <div class="item-centered">
          ${item.quantidade}x ${item.produto_nome.toUpperCase()}
          <div class="item-price-centered">R$ ${item.subtotal.toFixed(2)}</div>
        </div>
      `;
    });

    html += `
        <div class="line"></div>
        <div class="total">TOTAL: R$ ${pedido.total.toFixed(2)}</div>
        <div class="line"></div>
        <div class="center bold" style="margin-top: 12px; font-size: 11px;">OBRIGADO PELA PREFERÊNCIA!</div>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Pedidos do Dia</h1>
          <p className="text-gray-400">Acompanhamento e gerenciamento de vendas</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-950 border-b border-gray-800">
                <th className="p-4 text-gray-400 font-medium">Data / Hora</th>
                <th className="p-4 text-gray-400 font-medium">Cliente</th>
                <th className="p-4 text-gray-400 font-medium">Forma Pagto</th>
                <th className="p-4 text-gray-400 font-medium">Total</th>
                <th className="p-4 text-gray-400 font-medium">Status</th>
                <th className="p-4 text-gray-400 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-4 text-center text-gray-500">Carregando...</td></tr>
              ) : pedidos.length === 0 ? (
                <tr><td colSpan={6} className="p-4 text-center text-gray-500">Nenhum pedido hoje.</td></tr>
              ) : (
                pedidos.map((pedido) => (
                  <tr key={pedido.id} className={`border-b border-gray-800 hover:bg-gray-800/50 ${pedido.status === 'cancelado' ? 'opacity-50' : ''}`}>
                    <td className="p-4 text-gray-300">{format(new Date(pedido.data), 'HH:mm', { locale: ptBR })}</td>
                    <td className="p-4 font-bold text-gray-100">{pedido.cliente_nome}</td>
                    <td className="p-4 text-gray-300">{pedido.forma_pagamento || '-'}</td>
                    <td className="p-4 font-bold text-green-400">R$ {pedido.total.toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        pedido.status === 'finalizado' ? 'bg-green-900/30 text-green-400' : 
                        pedido.status === 'cancelado' ? 'bg-red-900/30 text-red-400' : 
                        'bg-yellow-900/30 text-yellow-400'
                      }`}>
                        {pedido.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => visualizarPedido(pedido)} title="Visualizar" className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors">
                        <Eye size={18} />
                      </button>
                      {pedido.status === 'finalizado' && (
                        <button onClick={() => reimprimirPedido(pedido)} title="Reimprimir" className="p-2 text-gray-400 hover:bg-gray-400/10 rounded-lg transition-colors">
                          <Printer size={18} />
                        </button>
                      )}
                      {pedido.status !== 'cancelado' && (
                        <button onClick={() => cancelarPedido(pedido.id)} title="Cancelar" className="p-2 text-orange-400 hover:bg-orange-400/10 rounded-lg transition-colors">
                          <XCircle size={18} />
                        </button>
                      )}
                      <button onClick={() => excluirPedido(pedido.id)} title="Excluir" className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
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

      {/* Modal Visualização */}
      {isModalOpen && pedidoSelecionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-100">Detalhes do Pedido</h2>
                <p className="text-gray-400">{format(new Date(pedidoSelecionado.data), "dd/MM/yyyy 'às' HH:mm")}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white p-2">
                <X size={24} />
              </button>
            </div>
            
            <div className="bg-gray-950 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-400 mb-1">Cliente</p>
              <p className="text-lg font-bold text-white mb-3">{pedidoSelecionado.cliente_nome}</p>
              
              <p className="text-sm text-gray-400 mb-1">Status e Pagamento</p>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  pedidoSelecionado.status === 'finalizado' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                }`}>
                  {pedidoSelecionado.status.toUpperCase()}
                </span>
                <span className="text-gray-300 text-sm border border-gray-700 px-2 py-1 rounded-md">
                  {pedidoSelecionado.forma_pagamento}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mb-4 border border-gray-800 rounded-xl">
              <table className="w-full text-left">
                <thead className="bg-gray-950">
                  <tr>
                    <th className="p-3 text-gray-400 font-medium text-sm rounded-tl-xl">Item</th>
                    <th className="p-3 text-gray-400 font-medium text-sm text-center">Qtd</th>
                    <th className="p-3 text-gray-400 font-medium text-sm text-right rounded-tr-xl">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingItens ? (
                    <tr><td colSpan={3} className="p-4 text-center text-gray-500">Carregando itens...</td></tr>
                  ) : itensPedido.length === 0 ? (
                    <tr><td colSpan={3} className="p-4 text-center text-gray-500">Nenhum item.</td></tr>
                  ) : (
                    itensPedido.map(item => (
                      <tr key={item.id} className="border-t border-gray-800">
                        <td className="p-3 text-gray-300 font-medium">{item.produto_nome}</td>
                        <td className="p-3 text-gray-400 text-center">{item.quantidade}x</td>
                        <td className="p-3 text-gray-300 text-right">R$ {item.subtotal.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-gray-950 p-4 rounded-xl flex justify-between items-center mb-6 border border-gray-800">
              <span className="text-gray-400 font-medium">Total do Pedido</span>
              <span className="text-2xl font-bold text-green-400">R$ {pedidoSelecionado.total.toFixed(2)}</span>
            </div>

            <div className="flex justify-end gap-3">
              {pedidoSelecionado.status === 'finalizado' && (
                <button 
                  onClick={() => reimprimirPedido(pedidoSelecionado)}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2"
                >
                  <Printer size={20} /> Reimprimir
                </button>
              )}
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg text-gray-300 bg-gray-800 hover:bg-gray-700">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
