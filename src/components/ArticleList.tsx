import React, { useState, useMemo } from 'react';
import { Plus, Search, Trash2, Edit, Save, X, Package } from 'lucide-react';
import { Article, Supplier } from '../types';
import { cn } from '../lib/utils';

interface ArticleListProps {
  articles: Article[];
  suppliers: Supplier[];
  setArticles: React.Dispatch<React.SetStateAction<Article[]>>;
  supplierId?: string; // Optional filter for supplier page
  mode?: 'articles' | 'stock';
  onBack?: () => void;
}

export default function ArticleList({ articles, suppliers, setArticles, supplierId, mode = 'articles', onBack }: ArticleListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<{ id: string, reference: string, name: string, supplierId: string, stock: number } | null>(null);

  const startEditing = (article: Article) => {
    setEditingData({ 
      id: article.id, 
      reference: article.reference, 
      name: article.name, 
      supplierId: article.supplierId,
      stock: article.stock || 0
    });
    setEditingId(article.id);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingData(null);
  };
  const [newArticle, setNewArticle] = useState({ reference: '', name: '', supplierId: supplierId || '', stock: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  const handleAdd = () => {
    if (!newArticle.reference.trim() || !newArticle.name.trim() || !newArticle.supplierId) {
      alert('Tous les champs marqués d\'une étoile sont obligatoires');
      return;
    }
    const article: Article = {
      id: crypto.randomUUID(),
      reference: newArticle.reference,
      name: newArticle.name,
      supplierId: newArticle.supplierId,
      stock: newArticle.stock
    };
    setArticles([...articles, article]);
    setNewArticle({ reference: '', name: '', supplierId: supplierId || '', stock: 0 });
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    setArticles(articles.filter(a => a.id !== id));
  };

  const handleUpdate = () => {
    if (!editingData) return;
    setArticles(articles.map(a => a.id === editingData.id ? { 
      ...a, 
      reference: editingData.reference, 
      name: editingData.name, 
      supplierId: editingData.supplierId,
      stock: editingData.stock
    } : a));
    cancelEditing();
  };

  const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || 'Inconnu';

  const filteredArticles = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return articles.filter(a => {
      // Apply supplier filter if provided
      if (supplierId && a.supplierId !== supplierId) return false;

      const supplierName = getSupplierName(a.supplierId).toLowerCase();
      return (
        a.name.toLowerCase().includes(term) || 
        a.reference.toLowerCase().includes(term) ||
        supplierName.includes(term)
      );
    });
  }, [articles, searchTerm, suppliers, supplierId]);

  const currentSupplier = useMemo(() => 
    suppliers.find(s => s.id === supplierId)
  , [suppliers, supplierId]);

  return (
    <div className="space-y-6 bg-brand-surface p-8 rounded-lg border border-brand-border shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-4">
          {supplierId && onBack && (
            <button 
              onClick={onBack} 
              className="p-2 hover:bg-slate-100 rounded-full text-brand-muted"
              title="Retour aux fournisseurs"
            >
              <X size={20} />
            </button>
          )}
          <h3 className="text-sm font-bold text-brand-muted uppercase tracking-[0.05em] border-l-4 border-brand-accent pl-3">
            {mode === 'stock' ? 'Stock & Inventaire' : (supplierId ? `Articles : ${currentSupplier?.name}` : 'Catalogue Articles')}
          </h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
            <input
              type="text"
              placeholder="Référence ou Nom..."
              className="w-full pl-9 pr-4 py-2 bg-brand-bg border border-brand-border rounded-md focus:outline-none focus:ring-1 focus:ring-brand-accent transition-all text-[13px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-brand-accent text-white px-5 py-2 rounded-md hover:bg-blue-700 transition-colors shadow-sm font-bold text-[13px]"
          >
            <Plus size={16} />
            Nouvel Article
          </button>
        </div>
      </div>

      <div className="border border-brand-border rounded-md overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse bg-brand-surface">
          <thead>
            <tr className="bg-brand-header border-b border-brand-border">
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-brand-muted">Référence</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-brand-muted">Désignation</th>
              {mode === 'stock' && <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-brand-muted">État Stock</th>}
              {!supplierId && <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-brand-muted">Fournisseur</th>}
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-brand-muted text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border text-[13px]">
            {isAdding && (
              <tr className="bg-brand-accent-light/30">
                <td className="px-6 py-4">
                  <input
                    placeholder="Ref*"
                    className="w-full px-3 py-1.5 border border-brand-border rounded-md focus:outline-none focus:ring-1 focus:ring-brand-accent text-xs font-bold"
                    value={newArticle.reference}
                    onChange={(e) => setNewArticle({ ...newArticle, reference: e.target.value })}
                  />
                </td>
                <td className="px-6 py-4">
                  <input
                    placeholder="Désignation*"
                    className="w-full px-3 py-1.5 border border-brand-border rounded-md focus:outline-none focus:ring-1 focus:ring-brand-accent text-xs"
                    value={newArticle.name}
                    onChange={(e) => setNewArticle({ ...newArticle, name: e.target.value })}
                  />
                </td>
                <td className="px-6 py-4">
                  <select
                    className="w-full px-3 py-1.5 border border-brand-border rounded-md focus:outline-none focus:ring-1 focus:ring-brand-accent text-xs bg-white"
                    value={newArticle.supplierId}
                    onChange={(e) => setNewArticle({ ...newArticle, supplierId: e.target.value })}
                  >
                    <option value="">Choisir Fournisseur*</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={handleAdd} className="p-1.5 bg-emerald-100 text-emerald-600 rounded">
                      <Save size={18} />
                    </button>
                    <button onClick={() => setIsAdding(false)} className="p-1.5 bg-rose-100 text-rose-600 rounded">
                      <X size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {filteredArticles.map((article) => (
              <tr key={article.id} className="hover:bg-slate-50 transition-colors">
                {editingId === article.id && editingData ? (
                  <>
                    <td className="px-6 py-4">
                      <input
                        className="w-full px-2 py-1 border border-brand-accent rounded font-mono text-xs"
                        value={editingData.reference}
                        onChange={(e) => setEditingData({...editingData, reference: e.target.value})}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        className="w-full px-2 py-1 border border-brand-accent rounded text-xs"
                        value={editingData.name}
                        onChange={(e) => setEditingData({...editingData, name: e.target.value})}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <select
                        className="w-full px-2 py-1 border border-brand-accent rounded text-xs bg-white"
                        value={editingData.supplierId}
                        onChange={(e) => setEditingData({...editingData, supplierId: e.target.value})}
                      >
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={handleUpdate} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded">
                          <Save size={16} />
                        </button>
                        <button onClick={cancelEditing} className="p-1.5 text-brand-muted hover:bg-slate-100 rounded">
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4 font-mono text-[13px] text-brand-accent font-black uppercase tracking-tight italic">
                      {article.reference}
                    </td>
                    <td className="px-6 py-4 font-bold text-brand-ink">{article.name}</td>
                    {mode === 'stock' && (
                      <td className="px-6 py-4">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-1 rounded font-bold text-[11px]",
                          (article.stock || 0) === 0 
                            ? "bg-rose-50 text-rose-600 border border-rose-100" 
                            : (article.stock || 0) <= 100 
                              ? "bg-amber-50 text-amber-600 border border-amber-100" 
                              : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        )}>
                          <Package size={12} />
                          {article.stock || 0} en stock
                        </div>
                      </td>
                    )}
                    {!supplierId && (
                      <td className="px-6 py-4">
                        <span className="bg-brand-accent-light text-brand-accent px-2 py-0.5 rounded text-[10px] font-black uppercase border border-brand-accent/10 shadow-sm">
                          {getSupplierName(article.supplierId)}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => startEditing(article)}
                          className="p-1.5 text-brand-muted hover:text-brand-accent hover:bg-brand-accent-light rounded transition-all"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(article.id)}
                          className="p-1.5 text-brand-muted hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {filteredArticles.length === 0 && !isAdding && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-brand-muted italic text-[13px]">
                  Aucun article trouvé dans l'inventaire
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
