// brain-whatsapp/frontend/src/components/CatalogEditor.jsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

function CatalogEditor({ clientId }) {  // ✅ CHANGEMENT 1
  const [catalog, setCatalog] = useState(null);
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [jsonError, setJsonError] = useState(null);

  useEffect(() => {
    if (clientId) {  // ✅ CHANGEMENT 2
      loadCatalog();
    }
  }, [clientId]);  // ✅ CHANGEMENT 3

  const loadCatalog = async () => {
    try {
      // ✅ CHANGEMENT 4 - Nouvelle route avec clientId
      const response = await fetch(`/api/clients/${clientId}/catalog`);
      const data = await response.json();
      
      if (data.success) {
        setCatalog(data.catalog);
        setJsonText(JSON.stringify(data.catalog, null, 2));
      }
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement catalogue:', error);
      toast.error('Erreur de chargement du catalogue');
      setLoading(false);
    }
  };

  const handleJsonChange = (e) => {
    const value = e.target.value;
    setJsonText(value);
    
    // Valider le JSON
    try {
      JSON.parse(value);
      setJsonError(null);
    } catch (error) {
      setJsonError(error.message);
    }
  };

  const handleSave = async () => {
    try {
      const parsedJson = JSON.parse(jsonText);
      setSaving(true);
      
      // ✅ CHANGEMENT 5 - Route avec clientId + PUT au lieu de POST
      const response = await fetch(`/api/clients/${clientId}/catalog`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(parsedJson)
      });
      
      if (response.ok) {
        setCatalog(parsedJson);
        toast.success('Catalogue sauvegardé avec succès');
      } else {
        toast.error('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      toast.error('JSON invalide: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Réinitialiser aux dernières modifications sauvegardées ?')) {
      setJsonText(JSON.stringify(catalog, null, 2));
      setJsonError(null);
      toast.success('Réinitialisé');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Chargement du catalogue...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Éditeur de Catalogue
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Modifiez le JSON directement
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleReset}
              className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg"
            >
              ↩️ Réinitialiser
            </button>
            <button
              onClick={handleSave}
              disabled={saving || jsonError}
              className={`btn-primary ${(saving || jsonError) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
            </button>
          </div>
        </div>
        
        {jsonError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            <span className="font-medium">Erreur JSON:</span> {jsonError}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <textarea
          value={jsonText}
          onChange={handleJsonChange}
          className={`w-full h-[600px] font-mono text-sm p-4 border rounded-lg ${
            jsonError ? 'border-red-400 bg-red-50' : 'border-gray-300'
          } focus:outline-none focus:ring-2 focus:ring-brain-primary`}
          spellCheck="false"
        />
      </div>
    </div>
  );
}

export default CatalogEditor;