import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { 
  TrendingUp, 
  ShoppingBag, 
  Banknote, 
  Calendar as CalendarIcon 
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export default function Dashboard() {
  const [data, setData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalPedidos: 0,
    faturamento: 0,
    ticketMedio: 0,
  });
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    fetchDashboardData(selectedDate);
  }, [selectedDate]);

  const fetchDashboardData = async (date: Date) => {
    try {
      const start = startOfDay(date).toISOString();
      const end = endOfDay(date).toISOString();

      // Fetch today's orders
      const { data: pedidos, error: pedidosError } = await supabase
        .from('pedidos')
        .select('*')
        .gte('data', start)
        .lte('data', end)
        .eq('status', 'finalizado');

      if (pedidosError) throw pedidosError;

      const totalPedidos = pedidos?.length || 0;
      const faturamento = pedidos?.reduce((acc, curr) => acc + Number(curr.total), 0) || 0;
      const ticketMedio = totalPedidos > 0 ? faturamento / totalPedidos : 0;

      setMetrics({
        totalPedidos,
        faturamento,
        ticketMedio
      });

      // Fetch last 7 days for chart
      const chartData = [];
      for (let i = 6; i >= 0; i--) {
        const targetDate = subDays(new Date(), i);
        const dayStart = startOfDay(targetDate).toISOString();
        const dayEnd = endOfDay(targetDate).toISOString();
        
        const { data: dayOrders } = await supabase
          .from('pedidos')
          .select('total')
          .gte('data', dayStart)
          .lte('data', dayEnd)
          .eq('status', 'finalizado');
          
        const dayTotal = dayOrders?.reduce((acc, curr) => acc + Number(curr.total), 0) || 0;
        
        chartData.push({
          name: format(targetDate, 'dd/MM'),
          total: dayTotal
        });
      }
      
      setData(chartData);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Dashboard</h1>
          <p className="text-gray-400">Resumo financeiro e de vendas</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 p-2 rounded-lg">
          <CalendarIcon size={20} className="text-red-500" />
          <input 
            type="date" 
            className="bg-transparent border-none text-sm text-gray-100 focus:outline-none"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => {
              if (e.target.value) {
                const [year, month, day] = e.target.value.split('-').map(Number);
                setSelectedDate(new Date(year, month - 1, day));
              }
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShoppingBag size={64} className="text-red-500" />
          </div>
          <div className="relative z-10">
            <p className="text-gray-400 text-sm font-medium mb-1">Total de Pedidos</p>
            <h3 className="text-4xl font-bold text-gray-100">{metrics.totalPedidos}</h3>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Banknote size={64} className="text-red-500" />
          </div>
          <div className="relative z-10">
            <p className="text-gray-400 text-sm font-medium mb-1">Faturamento (Dia)</p>
            <h3 className="text-4xl font-bold text-green-500">{formatCurrency(metrics.faturamento)}</h3>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={64} className="text-red-500" />
          </div>
          <div className="relative z-10">
            <p className="text-gray-400 text-sm font-medium mb-1">Ticket Médio</p>
            <h3 className="text-4xl font-bold text-blue-400">{formatCurrency(metrics.ticketMedio)}</h3>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
        <h3 className="text-lg font-bold mb-6 text-gray-100">Faturamento dos últimos 7 dias</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="name" stroke="#9ca3af" axisLine={false} tickLine={false} />
              <YAxis stroke="#9ca3af" axisLine={false} tickLine={false} tickFormatter={(value) => `R$ ${value}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px' }}
                itemStyle={{ color: '#f3f4f6' }}
                formatter={(value: any) => [formatCurrency(Number(value)), 'Faturamento']}
              />
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="#ef4444" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorTotal)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
