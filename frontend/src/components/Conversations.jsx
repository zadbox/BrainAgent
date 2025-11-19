// brain-whatsapp/frontend/src/components/Conversations.jsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

function Conversations({ clientId }) {
  const [conversations, setConversations] = useState([]);
  const [stats, setStats] = useState({
    totalMessages: 0,
    lastUpdate: null
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (clientId) {
      loadConversations();
      // Auto-refresh every 10 seconds
      const interval = setInterval(loadConversations, 10000);
      return () => clearInterval(interval);
    }
  }, [clientId]);

  const loadConversations = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}/conversations`);
      const data = await response.json();
      
      if (data.success && data.data) {
        const convData = data.data;
        
        let convArray = [];
        if (Array.isArray(convData.conversations)) {
            convArray = convData.conversations;
        } else if (convData.conversations && typeof convData.conversations === 'object') {
            // Support legacy format (object)
            convArray = Object.values(convData.conversations);
        }

        // ✅ TRI INVERSÉ : Plus récentes en premier
        const sortedConversations = convArray.sort((a, b) => {
          const dateA = new Date(a.updated_at || a.created_at);
          const dateB = new Date(b.updated_at || b.created_at);
          return dateB - dateA; // Plus récent en premier
        });
        
        setConversations(sortedConversations);
        
        // Calculer stats
        const totalMessages = sortedConversations.reduce(
          (sum, conv) => sum + (conv.messages?.length || 0), 
          0
        );
        setStats({
          totalMessages,
          lastUpdate: new Date().toISOString()
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement conversations:', error);
      toast.error('Erreur de chargement des conversations');
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
    toast.success('Conversations actualisées');
  };

  const clearConversations = async () => {
    if (!confirm('Êtes-vous sûr de vouloir effacer toutes les conversations ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/clients/${clientId}/conversations`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setConversations([]);
        setStats({ totalMessages: 0, lastUpdate: null });
        toast.success('✅ Conversations effacées avec succès');
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const formatPhone = (phone) => {
    // Retirer @c.us ou @s.whatsapp.net
    return phone.replace(/@.*/, '');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    // Si moins d'une heure
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
    
    // Si aujourd'hui
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    
    // Sinon date complète
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Chargement des conversations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Historique des Conversations
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Total: {stats.totalMessages} messages
              {stats.lastUpdate && ` • Dernière mise à jour: ${formatDate(stats.lastUpdate)}`}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-primary"
            >
              {refreshing ? 'Actualisation...' : '🔄 Actualiser'}
            </button>
            {conversations.length > 0 && (
              <button
                onClick={clearConversations}
                className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg"
              >
                🗑️ Effacer tout
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Liste des conversations */}
      <div className="bg-white rounded-lg shadow">
        {conversations.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p>Aucune conversation pour le moment</p>
            <p className="text-sm mt-2">Les messages apparaîtront ici une fois reçus</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {conversations.map((conv, idx) => (
              <div key={conv.phone || idx} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900">
                      📱 {formatPhone(conv.phone)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDate(conv.updated_at || conv.created_at)}
                  </span>
                </div>
                
                {/* Afficher les derniers messages */}
                <div className="space-y-2">
                  {conv.messages && conv.messages.slice(-2).map((msg, msgIdx) => (
                    <div 
                      key={msgIdx}
                      className={`rounded-lg p-3 ${
                        msg.from === 'customer' ? 'bg-gray-100' : 'bg-brain-primary bg-opacity-10'
                      }`}
                    >
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">
                          {msg.from === 'customer' ? 'Client:' : 'Bot:'}
                        </span>{' '}
                        {msg.text.substring(0, 100)}
                        {msg.text.length > 100 ? '...' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Conversations;