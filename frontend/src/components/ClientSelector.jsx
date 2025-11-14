import React, { useState, useEffect } from 'react';

function ClientSelector({ selectedClient, onClientChange }) {
  const [clients, setClients] = useState([]);

  useEffect(() => {
    fetch('/api/clients')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setClients(data.clients || []);
          if (!selectedClient && data.clients.length > 0) {
            onClientChange(data.clients[0].id);
          }
        }
      });
  }, []);

  return (
    <select 
      value={selectedClient} 
      onChange={(e) => onClientChange(e.target.value)}
      className="px-3 py-2 border rounded"
    >
      {clients.map(c => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
}

export default ClientSelector;