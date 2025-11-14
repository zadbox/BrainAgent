// brain-whatsapp/frontend/src/components/QRSection.jsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

function QRSection() {
  const [qrCode, setQrCode] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkQR();
    const interval = setInterval(checkQR, 3000);
    return () => clearInterval(interval);
  }, []);

  const checkQR = async () => {
    try {
      const response = await fetch('/api/qr');
      const data = await response.json();
      
      console.log('QR Response:', { 
      hasQR: !!data.qr, 
      qrLength: data.qr ? data.qr.length : 0, 
      ready: data.ready 
      });
      
      if (data.ready) {
        setConnected(true);
        setQrCode(null);
      } else if (data.qr) {
        setQrCode(data.qr);
        setConnected(false);
      }
      setLoading(false);
    } catch (error) {
      console.error('Erreur QR:', error);
      setLoading(false);
    }
  };

  const generateQRImage = (text) => {
    if (!text) return null;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Configuration WhatsApp
        </h2>
        
        {connected ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-green-600 mb-2">
              WhatsApp Connecté
            </h3>
            <p className="text-gray-600">
              Le bot est actif et prêt à répondre aux messages
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">
                📱 Instructions de connexion:
              </h3>
              <ol className="list-decimal ml-6 space-y-2 text-sm text-blue-700">
                <li>Ouvrez WhatsApp sur votre téléphone</li>
                <li>Allez dans Paramètres → Appareils connectés</li>
                <li>Cliquez sur Connecter un appareil</li>
                <li>Scannez le QR code ci-dessous</li>
              </ol>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-gray-500">Chargement du QR Code...</div>
              </div>
            ) : qrCode ? (
              <div className="text-center">
                <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
                  <img 
                    src={generateQRImage(qrCode)} 
                    alt="QR Code WhatsApp"
                    className="w-64 h-64"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  Le QR code se renouvelle automatiquement
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  En attente du serveur backend...
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="font-medium text-yellow-900 mb-2">
          ⚠️ Informations importantes:
        </h3>
        <ul className="list-disc ml-6 space-y-1 text-sm text-yellow-700">
          <li>Utilisez un numéro WhatsApp dédié pour le bot</li>
          <li>Limitez à 100 messages/jour pour éviter les restrictions</li>
          <li>La session reste active même après déconnexion du téléphone</li>
        </ul>
      </div>
    </div>
  );
}

export default QRSection;