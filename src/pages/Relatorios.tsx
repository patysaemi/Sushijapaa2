import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { startOfDay, endOfDay, format } from 'date-fns';
import { Calendar, DollarSign, ShoppingBag, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Pedido, PedidoItem } from '../types/database';

export default function Relatorios() {
  const hoje = new Date().toISOString().split('T')[0];
  const [dataInicio, setDataInicio] = useState(hoje);
  const [dataFim, setDataFim] = useState(hoje);
  
  const [loading, setLoading] = useState(false);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [itens, setItens] = useState<PedidoItem[]>([]);
  
  const [enviandoN8n, setEnviandoN8n] = useState(false);
  const [n8nStatus, setN8nStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetchRelatorio();
  }, [dataInicio, dataFim]);

  const fetchRelatorio = async () => {
    if (!dataInicio || !dataFim) return;
    
    setLoading(true);
    
    // Configura horas para pegar o dia todo
    const start = startOfDay(new Date(dataInicio + 'T00:00:00')).toISOString();
    const end = endOfDay(new Date(dataFim + 'T00:00:00')).toISOString();

    const { data: pedidosData } = await supabase
      .from('pedidos')
      .select('*')
      .gte('data', start)
      .lte('data', end)
      .neq('status', 'cancelado');

    if (pedidosData) {
      setPedidos(pedidosData);
      
      const pedidoIds = pedidosData.map(p => p.id);
      
      if (pedidoIds.length > 0) {
        const { data: itensData } = await supabase
          .from('pedido_itens')
          .select('*')
          .in('pedido_id', pedidoIds);
          
        if (itensData) setItens(itensData);
      } else {
        setItens([]);
      }
    }
    
    setLoading(false);
  };

  // Cálculos
  const faturamentoTotal = pedidos.reduce((acc, p) => acc + p.total, 0);
  const ticketMedio = pedidos.length > 0 ? faturamentoTotal / pedidos.length : 0;
  
  const pagamentos = pedidos.reduce((acc, p) => {
    const forma = p.forma_pagamento || 'Outro';
    acc[forma] = (acc[forma] || 0) + p.total;
    return acc;
  }, {} as Record<string, number>);

  const produtosVendidos = itens.reduce((acc, item) => {
    const nome = item.produto_nome;
    if (!acc[nome]) acc[nome] = { qtd: 0, receita: 0 };
    acc[nome].qtd += item.quantidade;
    acc[nome].receita += item.subtotal;
    return acc;
  }, {} as Record<string, { qtd: number, receita: number }>);

  const topProdutos = Object.entries(produtosVendidos)
    .sort((a, b) => b[1].qtd - a[1].qtd)
    .slice(0, 10);

  const enviarParaN8n = async () => {
    const webhookUrl = localStorage.getItem('n8n_webhook_url');
    if (!webhookUrl) {
      alert('URL do Webhook do n8n não configurada. Por favor, vá em Configurações e defina a URL.');
      return;
    }

    setEnviandoN8n(true);
    setN8nStatus('idle');

    // Montar o payload JSON
    const payload = {
      periodo: {
        inicio: format(new Date(dataInicio + 'T00:00:00'), 'dd/MM/yyyy'),
        fim: format(new Date(dataFim + 'T00:00:00'), 'dd/MM/yyyy')
      },
      resumo: {
        faturamento_total: faturamentoTotal,
        quantidade_pedidos: pedidos.length,
        ticket_medio: ticketMedio
      },
      formas_pagamento: pagamentos,
      top_produtos: topProdutos.map(([nome, dados]) => ({
        nome,
        quantidade: dados.qtd,
        receita: dados.receita
      }))
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setN8nStatus('success');
      } else {
        setN8nStatus('error');
      }
    } catch (error) {
      console.error(error);
      setN8nStatus('error');
    } finally {
      setEnviandoN8n(false);
      setTimeout(() => setN8nStatus('idle'), 5000);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Relatórios Financeiros</h1>
          <p className="text-gray-400">Analise os resultados do seu trailer</p>
        </div>
        
        <div className="flex items-end gap-4 bg-gray-900 p-4 rounded-xl border border-gray-800">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Data Inicial</label>
            <input 
              type="date" 
              value={dataInicio} 
              onChange={(e) => setDataInicio(e.target.value)}
              className="bg-gray-950 border border-gray-800 rounded-lg p-2 text-gray-100 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Data Final</label>
            <input 
              type="date" 
              value={dataFim} 
              onChange={(e) => setDataFim(e.target.value)}
              className="bg-gray-950 border border-gray-800 rounded-lg p-2 text-gray-100 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <button 
          onClick={enviarParaN8n}
          disabled={enviandoN8n || loading}
          className="bg-[#00c996] hover:bg-[#00a87d] text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50"
        >
          <Send size={20} />
          {enviandoN8n ? 'Enviando...' : 'Enviar para WhatsApp (n8n)'}
        </button>
        
        {n8nStatus === 'success' && (
          <div className="flex items-center gap-2 text-green-400 bg-green-500/10 px-4 py-3 rounded-xl">
            <CheckCircle2 size={20} /> Relatório enviado com sucesso!
          </div>
        )}
        {n8nStatus === 'error' && (
          <div className="flex items-center gap-2 text-red-400 bg-red-500/10 px-4 py-3 rounded-xl">
            <AlertCircle size={20} /> Erro ao enviar para o webhook. Verifique a URL.
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center p-10 text-gray-500">Carregando relatório...</div>
      ) : (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-500/20 p-3 rounded-xl">
                  <DollarSign className="text-green-500" size={24} />
                </div>
                <h3 className="text-gray-400 font-medium">Faturamento Total</h3>
              </div>
              <p className="text-3xl font-bold text-gray-100">R$ {faturamentoTotal.toFixed(2)}</p>
            </div>

            <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-500/20 p-3 rounded-xl">
                  <ShoppingBag className="text-blue-500" size={24} />
                </div>
                <h3 className="text-gray-400 font-medium">Total de Pedidos</h3>
              </div>
              <p className="text-3xl font-bold text-gray-100">{pedidos.length}</p>
            </div>

            <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-500/20 p-3 rounded-xl">
                  <Calendar className="text-purple-500" size={24} />
                </div>
                <h3 className="text-gray-400 font-medium">Ticket Médio</h3>
              </div>
              <p className="text-3xl font-bold text-gray-100">R$ {ticketMedio.toFixed(2)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formas de Pagamento */}
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
              <h3 className="text-xl font-bold text-white mb-6">Receita por Pagamento</h3>
              <div className="space-y-4">
                {Object.keys(pagamentos).length === 0 ? (
                  <p className="text-gray-500 text-sm">Nenhum dado no período.</p>
                ) : (
                  Object.entries(pagamentos).map(([forma, valor]) => (
                    <div key={forma} className="flex justify-between items-center p-3 bg-gray-950 rounded-lg">
                      <span className="font-medium text-gray-300">{forma}</span>
                      <span className="font-bold text-green-400">R$ {valor.toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Produtos */}
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
              <h3 className="text-xl font-bold text-white mb-6">Top 10 Produtos Mais Vendidos</h3>
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {topProdutos.length === 0 ? (
                  <p className="text-gray-500 text-sm">Nenhum dado no período.</p>
                ) : (
                  topProdutos.map(([nome, dados], index) => (
                    <div key={nome} className="flex items-center gap-4 p-3 bg-gray-950 rounded-lg">
                      <div className="w-8 h-8 flex items-center justify-center bg-gray-800 rounded-full font-bold text-gray-400 text-sm">
                        {index + 1}º
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-200">{nome}</p>
                        <p className="text-xs text-gray-500">{dados.qtd} unidades vendidas</p>
                      </div>
                      <span className="font-bold text-green-400">R$ {dados.receita.toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
