import { useState, useEffect } from 'react';
import { Package, User, MapPin, Phone, Calendar, DollarSign, Eye, Trash2 } from 'lucide-react';

export default function Leads({ clientId }) {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (clientId) {
      loadLeads();
      loadStats();
    }
  }, [clientId, filterStatus]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const url = filterStatus === 'all' 
        ? `/api/clients/${clientId}/leads`
        : `/api/clients/${clientId}/leads?status=${filterStatus}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setLeads(data.leads);
      }
    } catch (error) {
      console.error('Erreur chargement leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}/leads/stats`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const updateLeadStatus = async (leadId, newStatus) => {
    try {
      const response = await fetch(`/api/clients/${clientId}/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      if (data.success) {
        loadLeads();
        loadStats();
        if (selectedLead && selectedLead.id === leadId) {
          setSelectedLead(data.lead);
        }
      }
    } catch (error) {
      console.error('Erreur mise à jour lead:', error);
    }
  };

  const deleteLead = async (leadId) => {
    if (!confirm('Voulez-vous vraiment supprimer cette commande ?')) return;

    try {
      const response = await fetch(`/api/clients/${clientId}/leads/${leadId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        loadLeads();
        loadStats();
        setSelectedLead(null);
      }
    } catch (error) {
      console.error('Erreur suppression lead:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      new: 'Nouvelle',
      confirmed: 'Confirmée',
      shipped: 'Expédiée',
      delivered: 'Livrée',
      cancelled: 'Annulée'
    };
    return labels[status] || status;
  };

  if (!clientId) {
    return (
      <div className="p-8 text-center text-gray-500">
        Sélectionnez un client pour voir les commandes
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Liste des commandes */}
      <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
        <div className="p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
          <h2 className="text-xl font-semibold mb-4">Commandes</h2>

          {/* Statistiques */}
          {stats && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
                <div className="text-sm text-blue-600">Total</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-700">{stats.new}</div>
                <div className="text-sm text-green-600">Nouvelles</div>
              </div>
            </div>
          )}

          {/* Filtres */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Toutes les commandes</option>
            <option value="new">Nouvelles</option>
            <option value="confirmed">Confirmées</option>
            <option value="shipped">Expédiées</option>
            <option value="delivered">Livrées</option>
            <option value="cancelled">Annulées</option>
          </select>
        </div>

        {/* Liste */}
        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Chargement...</div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>Aucune commande</p>
            </div>
          ) : (
            leads.map((lead) => (
              <div
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedLead?.id === lead.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-gray-900">{lead.customerName}</div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(lead.status)}`}>
                    {getStatusLabel(lead.status)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-1">
                  {lead.products.length} produit(s)
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-green-600">
                    {lead.totalAmount.toFixed(2)} DH
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(lead.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Détails de la commande */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {selectedLead ? (
          <div className="p-6">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedLead.customerName}
                  </h3>
                  <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(selectedLead.status)}`}>
                    {getStatusLabel(selectedLead.status)}
                  </span>
                </div>
                <button
                  onClick={() => deleteLead(selectedLead.id)}
                  className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Informations client */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-gray-700">
                  <Phone className="w-5 h-5 mr-3 text-gray-400" />
                  <span>{selectedLead.customerPhone}</span>
                </div>
                <div className="flex items-start text-gray-700">
                  <MapPin className="w-5 h-5 mr-3 text-gray-400 mt-0.5" />
                  <span>{selectedLead.customerAddress}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <Calendar className="w-5 h-5 mr-3 text-gray-400" />
                  <span>{new Date(selectedLead.createdAt).toLocaleString('fr-FR')}</span>
                </div>
              </div>

              {/* Changer le statut */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut de la commande
                </label>
                <select
                  value={selectedLead.status}
                  onChange={(e) => updateLeadStatus(selectedLead.id, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="new">Nouvelle</option>
                  <option value="confirmed">Confirmée</option>
                  <option value="shipped">Expédiée</option>
                  <option value="delivered">Livrée</option>
                  <option value="cancelled">Annulée</option>
                </select>
              </div>

              {/* Produits */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Produits commandés
                </h4>
                <div className="space-y-2">
                  {selectedLead.products.map((product, index) => (
                    <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-600">Quantité: {product.quantity}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          {(product.price * product.quantity).toFixed(2)} DH
                        </div>
                        <div className="text-sm text-gray-500">
                          {product.price.toFixed(2)} DH/unité
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-green-600">
                    {selectedLead.totalAmount.toFixed(2)} DH
                  </span>
                </div>
              </div>
            </div>

            {/* Historique de conversation (optionnel) */}
            {selectedLead.conversationHistory && selectedLead.conversationHistory.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Historique de conversation
                </h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedLead.conversationHistory.map((msg, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg ${
                        msg.from === 'customer' ? 'bg-blue-50 text-blue-900' : 'bg-gray-50 text-gray-900'
                      }`}
                    >
                      <div className="text-xs text-gray-500 mb-1">
                        {msg.from === 'customer' ? 'Client' : 'Bot'}
                      </div>
                      <div className="text-sm">{msg.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Eye className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>Sélectionnez une commande pour voir les détails</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

