// frontend/src/components/HandoverConfig.jsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

function HandoverConfig() {
  const [delay, setDelay] = useState(30);
  const [originalDelay, setOriginalDelay] = useState(30);
  const [pending, setPending] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
    loadPending();
    
    // Refresh pending messages every 5 seconds
    const interval = setInterval(loadPending, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/handover/config');
      const data = await response.json();
      setDelay(data.delayMinutes);
      setOriginalDelay(data.delayMinutes);
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement config:', error);
      toast.error('Erreur de chargement');
      setLoading(false);
    }
  };

  const loadPending = async () => {
    try {
      const response = await fetch('/api/handover/pending');
      const data = await response.json();
      setPending(data.pending);
    } catch (error) {
      console.error('Erreur chargement pending:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      const response = await fetch('/api/handover/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delayMinutes: delay })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setOriginalDelay(delay);
        toast.success(`✅ Délai mis à jour : ${delay} minutes`);
      } else {
        toast.error(data.error || 'Erreur de sauvegarde');
      }
    } catch (error) {
      toast.error('Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDelay(originalDelay);
    toast.success('Réinitialisé');
  };

  const formatPhone = (phone) => {
    return phone.replace(/@.*/, '');
  };

  const hasChanges = delay !== originalDelay;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuration du délai */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          ⏱️ Configuration Human Handover
        </h2>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-900 mb-2">📋 Comment ça marche ?</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Chaque message client démarre un timer indépendant</li>
            <li>• Si un humain répond via WhatsApp Web → timer annulé</li>
            <li>• Si personne ne répond → bot prend le relais automatiquement</li>
          </ul>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Délai avant intervention du bot
          </label>
          
          <div className="flex items-center space-x-4 mb-3">
            <span className="text-3xl font-bold text-indigo-600">
              {delay}
            </span>
            <span className="text-lg text-gray-600">
              minute{delay > 1 ? 's' : ''}
            </span>
          </div>
          
          <input
            type="range"
            min="1"
            max="120"
            value={delay}
            onChange={(e) => setDelay(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>1 min</span>
            <span>30 min</span>
            <span>60 min</span>
            <span>120 min</span>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`btn-primary ${(!hasChanges || saving) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
          </button>
          
          {hasChanges && (
            <button
              onClick={handleReset}
              className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg"
            >
              ↩️ Annuler
            </button>
          )}
        </div>
      </div>

      {/* Messages en attente */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            📋 Messages en attente
          </h3>
          <span className="bg-orange-100 text-orange-800 text-sm font-medium px-3 py-1 rounded-full">
            {pending.length} message{pending.length > 1 ? 's' : ''}
          </span>
        </div>
        
        {pending.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>✅ Aucun message en attente</p>
            <p className="text-sm mt-2">Tous les clients ont été pris en charge</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((msg, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      📱 {formatPhone(msg.from)}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {msg.text}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <span className="inline-block bg-orange-100 text-orange-800 text-sm font-medium px-3 py-1 rounded">
                      ⏱️ {msg.remainingMinutes}:{msg.remainingSeconds.toString().padStart(2, '0')}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      restant
                    </p>
                  </div>
                </div>
                
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-500 transition-all duration-1000"
                    style={{ 
                      width: `${(msg.remainingMs / (delay * 60000)) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Délai actuel</p>
          <p className="text-2xl font-bold text-indigo-600">{originalDelay} min</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">En attente</p>
          <p className="text-2xl font-bold text-orange-600">{pending.length}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Mode</p>
          <p className="text-2xl font-bold text-green-600">✓ Actif</p>
        </div>
      </div>
    </div>
  );
}

export default HandoverConfig;