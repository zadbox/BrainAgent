// brain-whatsapp/frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import Conversations from './components/Conversations';
import CatalogEditor from './components/CatalogEditor';
import QRSection from './components/QRSection';
import ClientSelector from './components/ClientSelector';

function App() {
  const [activeTab, setActiveTab] = useState('conversations');
  const [selectedClient, setSelectedClient] = useState('lattafa');

  const [status, setStatus] = useState({
    whatsapp: 'disconnected',
    server: 'checking...'
  });

  // Vérifier le status du serveur
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      setStatus({
        whatsapp: data.whatsapp,
        server: 'running'
      });
    } catch (error) {
      setStatus(prev => ({ ...prev, server: 'offline' }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-brain-primary">
                Brain WhatsApp Admin
              </h1>
            </div>
            
            {/* Status indicators + Client Selector */}
            <div className="flex items-center space-x-6">
              {/* ✅ AJOUT - Client Selector */}
              <ClientSelector 
                selectedClient={selectedClient}
                onClientChange={setSelectedClient}
              />
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-2">Serveur:</span>
                  <span className={`inline-flex h-2 w-2 rounded-full ${
                    status.server === 'running' ? 'bg-green-400' : 'bg-red-400'
                  }`}></span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-2">WhatsApp:</span>
                  <span className={`inline-flex h-2 w-2 rounded-full ${
                    status.whatsapp === 'connected' ? 'bg-green-400' : 'bg-yellow-400'
                  }`}></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('conversations')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'conversations'
                  ? 'border-brain-primary text-brain-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              💬 Conversations
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'catalog'
                  ? 'border-brain-primary text-brain-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📦 Catalogue
            </button>
            <button
              onClick={() => setActiveTab('qr')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'qr'
                  ? 'border-brain-primary text-brain-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📱 QR Code
            </button>
          </nav>
        </div>
      </div>

      {/* Content - ✅ CHANGEMENT - Passer clientId */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'conversations' && <Conversations clientId={selectedClient} />}
        {activeTab === 'catalog' && <CatalogEditor clientId={selectedClient} />}
        {activeTab === 'qr' && <QRSection />}
      </main>
    </div>
  );
}

export default App;