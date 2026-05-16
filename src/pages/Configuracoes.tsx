import { useState, useEffect } from 'react';
import { Save, Webhook } from 'lucide-react';

export default function Configuracoes() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    const savedUrl = localStorage.getItem('n8n_webhook_url');
    if (savedUrl) setWebhookUrl(savedUrl);
  }, []);

  const handleSave = () => {
    setSalvando(true);
    localStorage.setItem('n8n_webhook_url', webhookUrl.trim());
    
    setTimeout(() => {
      setSalvando(false);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 3000);
    }, 500);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-100">Configurações</h1>
        <p className="text-gray-400">Ajustes e integrações do sistema</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-500/10 p-3 rounded-xl">
            <Webhook className="text-blue-500" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Integração n8n (WhatsApp)</h2>
            <p className="text-sm text-gray-400">Configure a URL do webhook para envio de relatórios automatizados.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">URL do Webhook</label>
            <input 
              type="url" 
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://seu-n8n.com/webhook/..."
              className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-gray-100 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              disabled={salvando}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Save size={20} />
              {salvando ? 'Salvando...' : salvo ? 'Salvo!' : 'Salvar Configuração'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
