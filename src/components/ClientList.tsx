import React, { useState, useMemo } from 'react';
import { Plus, Search, Trash2, Edit, Save, X, Image as ImageIcon, Camera } from 'lucide-react';
import { Client } from '../types';
import { cn } from '../lib/utils';

interface ClientListProps {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
}

export default function ClientList({ clients, setClients }: ClientListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<{ id: string, name: string, logo: string } | null>(null);

  const startEditing = (client: Client) => {
    setEditingData({ id: client.id, name: client.name, logo: client.logo || '' });
    setEditingId(client.id);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingData(null);
  };
  const [newClient, setNewClient] = useState({ name: '', logo: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const handleAdd = () => {
    if (!newClient.name.trim()) return;
    const client: Client = {
      id: crypto.randomUUID(),
      name: newClient.name,
      logo: newClient.logo
    };
    setClients([...clients, client]);
    setNewClient({ name: '', logo: '' });
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    setClients(clients.filter(c => c.id !== id));
  };

  const handleUpdate = () => {
    if (!editingData) return;
    setClients(clients.map(c => c.id === editingData.id ? { ...c, name: editingData.name, logo: editingData.logo } : c));
    cancelEditing();
  };

  const filteredClients = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return clients.filter(c => 
      c.name.toLowerCase().includes(term) ||
      c.id.toLowerCase().includes(term)
    );
  }, [clients, searchTerm]);

  return (
    <div className="space-y-6 bg-brand-surface p-8 rounded-lg border border-brand-border shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-bold text-brand-muted uppercase tracking-[0.05em] border-l-4 border-emerald-500 pl-3">
          Annuaire Clients
        </h3>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-full pl-9 pr-4 py-2 bg-brand-bg border border-brand-border rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-[13px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-md hover:bg-emerald-700 transition-colors shadow-sm font-bold text-[13px]"
          >
            <Plus size={16} />
            Nouveau Client
          </button>
        </div>
      </div>

      <div className="border border-brand-border rounded-md overflow-hidden">
        <table className="w-full text-left border-collapse bg-brand-surface">
          <thead>
            <tr className="bg-brand-header border-b border-brand-border">
              <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-brand-muted w-24 text-center">Logo</th>
              <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-brand-muted">Nom Client</th>
              <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-brand-muted text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border text-[14px]">
            {isAdding && (
              <tr className="bg-emerald-50/30">
                <td className="px-6 py-4 flex justify-center">
                  <div className="w-10 h-10 rounded bg-white flex items-center justify-center border border-brand-border overflow-hidden">
                    {newClient.logo ? (
                      <img src={newClient.logo} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera size={16} className="text-brand-muted" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Nom du client *"
                      className="px-3 py-1.5 border border-brand-border rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 text-[13px]"
                      value={newClient.name}
                      onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="URL du Logo (Optionnel)"
                      className="px-3 py-1.5 border border-brand-border rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 text-[11px] text-brand-muted"
                      value={newClient.logo}
                      onChange={(e) => setNewClient({ ...newClient, logo: e.target.value })}
                    />
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={handleAdd} className="p-1.5 bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200">
                      <Save size={18} />
                    </button>
                    <button onClick={() => setIsAdding(false)} className="p-1.5 bg-rose-100 text-rose-600 rounded hover:bg-rose-200">
                      <X size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {filteredClients.map((client) => (
              <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-3 flex justify-center">
                  <div className="w-10 h-10 rounded bg-white border border-brand-border flex items-center justify-center overflow-hidden">
                    {client.logo ? (
                      <img src={client.logo} alt={client.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={18} className="text-brand-border" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-3">
                  {editingId === client.id && editingData ? (
                    <div className="flex gap-2 w-full">
                      <input
                        autoFocus
                        className="px-3 py-1 border border-emerald-500 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-[14px] flex-1 font-bold"
                        value={editingData.name}
                        onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                      />
                      <input
                        className="px-3 py-1 border border-brand-border rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-[11px] w-32"
                        placeholder="Logo URL"
                        value={editingData.logo}
                        onChange={(e) => setEditingData({ ...editingData, logo: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                      />
                    </div>
                  ) : (
                    <span className="font-bold text-brand-ink">{client.name}</span>
                  )}
                </td>
                <td className="px-6 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {editingId === client.id ? (
                      <>
                        <button onClick={handleUpdate} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded">
                          <Save size={16} />
                        </button>
                        <button onClick={cancelEditing} className="p-1.5 text-brand-muted hover:bg-slate-100 rounded">
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => startEditing(client)}
                          className="p-1.5 text-brand-muted hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(client.id)}
                          className="p-1.5 text-brand-muted hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredClients.length === 0 && !isAdding && (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-brand-muted italic text-[13px]">
                  Aucun client enregistré dans l'annuaire
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
