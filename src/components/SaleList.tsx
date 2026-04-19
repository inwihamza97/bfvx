import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Search, Trash2, Edit, Save, X, FileText, 
  Calendar, CheckSquare, Square, Tag, ShoppingBag,
  ChevronDown, Archive, RotateCcw
} from 'lucide-react';
import { motion } from 'motion/react';
import { Sale, SaleType, Client, Article, SaleItem } from '../types';
import { cn, calculateFromTTC, getNextReference } from '../lib/utils';
import { format } from 'date-fns';
import { generateSalePDF } from '../services/pdfService';

interface SaleListProps {
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  articles: Article[];
  setArticles: React.Dispatch<React.SetStateAction<Article[]>>;
  clients: Client[];
  filterType?: SaleType | 'all';
  showArchived?: boolean;
}

export default function SaleList({ 
  sales, 
  setSales, 
  articles, 
  setArticles, 
  clients, 
  filterType = 'all', 
  showArchived = false 
}: SaleListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // New Sale State
  const [type, setType] = useState<SaleType>('Commande');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedItems, setSelectedItems] = useState<Record<string, SaleItem>>({});
  const [isValidated, setIsValidated] = useState(false);
  const [isSettled, setIsSettled] = useState(false);
  const [globalPrice, setGlobalPrice] = useState<string>('');

  useEffect(() => {
    if (filterType !== 'all' && filterType !== 'Avoir' && !editingId) {
      setType(filterType);
    }
  }, [filterType, editingId]);

  const types: SaleType[] = ['Commande', 'Bon de livraison', 'Facture', 'Avoir'];

  // For sales, we show all articles if at least one client is selected
  // Filtering articles to show only those in stock
  const availableArticles = useMemo(() => {
    if (selectedClientIds.length === 0) return [];
    return articles.filter(a => (a.stock || 0) > 0);
  }, [articles, selectedClientIds]);

  const handleToggleClient = (id: string) => {
    setSelectedClientIds(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const handleToggleArticle = (article: Article) => {
    setSelectedItems(prev => {
      if (prev[article.id]) {
        const next = { ...prev };
        delete next[article.id];
        return next;
      }
      return {
        ...prev,
        [article.id]: {
          articleId: article.id,
          reference: article.reference,
          name: article.name,
          quantity: 1,
          unitPriceHT: 0,
          tvaRate: 0.20,
          priceTTC: 0
        }
      };
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedItems(prev => {
      const next = { ...prev };
      if (checked) {
        availableArticles.forEach(article => {
          if (!next[article.id]) {
            next[article.id] = {
              articleId: article.id,
              reference: article.reference,
              name: article.name,
              quantity: 1,
              unitPriceHT: 0,
              tvaRate: 0.20,
              priceTTC: 0
            };
          }
        });
      } else {
        availableArticles.forEach(article => {
          delete next[article.id];
        });
      }
      return next;
    });
  };

  const updateItem = (articleId: string, ttc: number, qty: number) => {
    const { ht } = calculateFromTTC(ttc);
    setSelectedItems(prev => ({
      ...prev,
      [articleId]: {
        ...prev[articleId],
        quantity: qty,
        unitPriceHT: ht,
        priceTTC: ttc
      }
    }));
  };

  const applyGlobalPrice = () => {
    const price = parseFloat(globalPrice);
    if (isNaN(price)) return;

    setSelectedItems(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        const { ht } = calculateFromTTC(price);
        next[id] = {
          ...next[id],
          unitPriceHT: ht,
          priceTTC: price
        };
      });
      return next;
    });
  };

  const totalTTC = (Object.values(selectedItems) as SaleItem[]).reduce((acc, item) => acc + (item.priceTTC * item.quantity), 0);

  const handleEdit = (sale: Sale) => {
    setType(sale.type);
    setSelectedClientIds(sale.clientIds);
    setDate(sale.date);
    const itemsMap: Record<string, SaleItem> = {};
    sale.items.forEach(item => {
      itemsMap[item.articleId] = item;
    });
    setSelectedItems(itemsMap);
    setIsValidated(sale.isValidated || false);
    setIsSettled(sale.isSettled || false);
    setEditingId(sale.id);
    setIsAdding(true);
  };

  const decreaseStockOnValidation = (items: SaleItem[]) => {
    setArticles(prev => prev.map(article => {
      const item = items.find(i => i.articleId === article.id);
      if (item) {
        return { ...article, stock: (article.stock || 0) - item.quantity };
      }
      return article;
    }));
  };

  const handleSave = () => {
    if (selectedClientIds.length === 0 || Object.keys(selectedItems).length === 0) {
      alert('Veuillez sélectionner au moins un client et un article.');
      return;
    }

    // Check stock availability
    const items = Object.values(selectedItems) as SaleItem[];
    for (const item of items) {
      const article = articles.find(a => a.id === item.articleId);
      if (article && (article.stock || 0) < item.quantity) {
        alert(`Stock insuffisant pour l'article ${article.name}. Stock disponible: ${article.stock || 0}`);
        return;
      }
    }

    let finalType = type;
    let finalValidated = isValidated;
    const existing = sales.find(s => s.id === editingId);

    // Traceability: If validating and triggers a type change
    if (isValidated && (type === 'Commande' || type === 'Bon de livraison')) {
      const transitionTargetType: SaleType = type === 'Commande' ? 'Bon de livraison' : 'Facture';
      
      const currentDocRef = editingId && existing 
        ? existing.customReference 
        : getNextReference(type, sales.map(s => s.customReference));

      const currentDoc: Sale = {
        id: editingId || crypto.randomUUID(),
        customReference: currentDocRef,
        type: type,
        clientIds: selectedClientIds,
        date,
        items: Object.values(selectedItems) as SaleItem[],
        totalTTC,
        isValidated: true,
        isSettled: isSettled,
        isArchived: true, // Auto-archive the "old stage" document so it leaves the active list
        stockUpdated: existing?.stockUpdated || false,
        createdAt: existing?.createdAt || new Date().toISOString()
      };

      // Update Stock if we validated a Bon de livraison or Facture and it hasn't been updated yet
      if ((type === 'Bon de livraison' || type === 'Facture') && !currentDoc.stockUpdated) {
        decreaseStockOnValidation(currentDoc.items);
        currentDoc.stockUpdated = true;
      }

      const nextRef = getNextReference(transitionTargetType, [...sales, currentDoc].map(s => s.customReference));
      const nextDoc: Sale = {
        ...currentDoc,
        id: crypto.randomUUID(),
        customReference: nextRef,
        type: transitionTargetType,
        isValidated: false,
        isSettled: (type === 'Bon de livraison' || type === 'Facture') ? isSettled : false,
        isArchived: false,
        stockUpdated: currentDoc.stockUpdated, // Inherit stock update status
        createdAt: new Date().toISOString()
      };

      if (editingId) {
        setSales(prev => [nextDoc, ...prev.map(s => s.id === editingId ? currentDoc : s)]);
      } else {
        setSales(prev => [nextDoc, currentDoc, ...prev]);
      }
    } else {
      let finalReference = existing?.customReference || '';
      
      if (!editingId || (existing && existing.type !== finalType)) {
        finalReference = getNextReference(finalType, sales.map(s => s.customReference));
      }

      const saleData: Sale = {
        id: editingId || crypto.randomUUID(),
        customReference: finalReference,
        type: finalType,
        clientIds: selectedClientIds,
        date,
        items: Object.values(selectedItems) as SaleItem[],
        totalTTC,
        isValidated: finalValidated,
        isSettled: isSettled,
        isArchived: existing?.isArchived || false,
        stockUpdated: existing?.stockUpdated || false,
        createdAt: existing?.createdAt || new Date().toISOString()
      };

      // Update Stock in Standard Save if just validated and is correct type
      if (finalValidated && !saleData.stockUpdated && (finalType === 'Bon de livraison' || finalType === 'Facture')) {
        decreaseStockOnValidation(saleData.items);
        saleData.stockUpdated = true;
      }

      if (editingId) {
        setSales(sales.map(s => s.id === editingId ? saleData : s));
      } else {
        setSales([saleData, ...sales]);
      }
    }

    setIsAdding(false);
    setEditingId(null);
    setIsValidated(false);
    setIsSettled(false);
    setSelectedClientIds([]);
    setSelectedItems({});
    setDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleArchive = (id: string, archive: boolean = true) => {
    setSales(sales.map(s => s.id === id ? { ...s, isArchived: archive } : s));
  };

  const handleDelete = (id: string) => {
    setSales(sales.filter(s => s.id !== id));
  };

  const handleConvertToAvoir = (id: string) => {
    const sourceDoc = sales.find(s => s.id === id);
    if (!sourceDoc) return;

    const nextRef = getNextReference('Avoir', sales.map(x => x.customReference));
    const avoirDoc: Sale = {
      ...sourceDoc,
      id: crypto.randomUUID(),
      customReference: nextRef,
      type: 'Avoir',
      isValidated: true,
      createdAt: new Date().toISOString()
    };

    setSales(prev => prev.map(s => s.id === id ? { ...s, isArchived: true } : s).concat(avoirDoc));
    setIsAdding(false);
    setEditingId(null);
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setEditingId(null);
    setIsValidated(false);
    setIsSettled(false);
    setSelectedClientIds([]);
    setSelectedItems({});
    setDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const filteredSales = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return sales.filter(s => {
      if (!showArchived && s.isArchived) return false;
      if (filterType !== 'all' && s.type !== filterType) return false;
      if (startDate && s.date < startDate) return false;
      if (endDate && s.date > endDate) return false;

      const formattedDate = format(new Date(s.date), 'dd/MM/yyyy');
      const clientNames = s.clientIds.map(cid => clients.find(cl => cl.id === cid)?.name || '').join(' ').toLowerCase();
      const itemsInfo = s.items.map(item => `${item.reference} ${item.name}`).join(' ').toLowerCase();
      
      return (
        s.type.toLowerCase().includes(term) ||
        s.customReference.toLowerCase().includes(term) ||
        s.date.includes(term) ||
        formattedDate.includes(term) ||
        s.id.toLowerCase().includes(term) ||
        clientNames.includes(term) ||
        itemsInfo.includes(term)
      );
    });
  }, [sales, searchTerm, startDate, endDate, clients, filterType, showArchived]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-1 bg-white border border-brand-border rounded-xl px-2 py-1.5 shadow-sm shrink-0">
            <div className="p-1.5 text-brand-muted">
              <Calendar size={16} />
            </div>
            <div className="flex items-center gap-2 pr-2">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-brand-muted uppercase leading-none px-1">Du</span>
                <input
                  type="date"
                  className="bg-transparent border-none focus:outline-none text-[12px] font-bold text-brand-ink h-5"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="w-px h-6 bg-brand-border mx-1" />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-brand-muted uppercase leading-none px-1">Au</span>
                <input
                  type="date"
                  className="bg-transparent border-none focus:outline-none text-[12px] font-bold text-brand-ink h-5"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }} 
                className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500 transition-colors ml-1"
                title="Réinitialiser les dates"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        {!showArchived && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 font-medium text-sm transition-all shadow-sm"
          >
            <Plus size={18} />
            Nouvelle Vente
          </button>
        )}
      </div>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-brand-surface p-8 rounded-lg border border-brand-border space-y-8 shadow-sm"
        >
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-sm font-bold text-brand-muted uppercase tracking-[0.05em] border-l-4 border-emerald-500 pl-3">
              {editingId ? 'Modifier le Document' : 'Informations de Vente'}
            </h3>
            <button onClick={cancelAdd} className="p-2 hover:bg-slate-100 rounded-full text-brand-muted">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              {/* Type Selection */}
              <div>
                <label className="block text-[12px] font-bold text-brand-muted uppercase tracking-wider mb-2">Type de Document *</label>
                <div className="flex gap-px bg-brand-border border border-brand-border rounded-md overflow-hidden">
                  {types.filter(t => t !== 'Avoir' || editingId).map(t => (
                    <button
                      key={t}
                      onClick={() => !editingId && setType(t)}
                      disabled={!!editingId}
                      className={cn(
                        "flex-1 py-2.5 px-3 text-[13px] font-bold transition-all",
                        type === t 
                        ? (
                          t === 'Commande' ? "bg-sky-600 text-white shadow-inner" :
                          t === 'Bon de livraison' ? "bg-amber-600 text-white shadow-inner" :
                          t === 'Facture' ? "bg-emerald-600 text-white shadow-inner" :
                          t === 'Avoir' ? "bg-rose-600 text-white shadow-inner" :
                          "bg-emerald-600 text-white shadow-inner"
                        )
                        : (
                          t === 'Commande' ? "bg-brand-surface text-brand-muted hover:bg-sky-50 hover:text-sky-600" :
                          t === 'Bon de livraison' ? "bg-brand-surface text-brand-muted hover:bg-amber-50 hover:text-amber-600" :
                          t === 'Facture' ? "bg-brand-surface text-brand-muted hover:bg-emerald-50 hover:text-emerald-600" :
                          t === 'Avoir' ? "bg-brand-surface text-brand-muted hover:bg-rose-50 hover:text-rose-600" :
                          "bg-brand-surface text-brand-muted hover:bg-emerald-50 hover:text-emerald-600"
                        ),
                        editingId && type !== t && "opacity-50 grayscale cursor-not-allowed"
                      )}
                    >
                      {t === 'Bon de livraison' ? 'B.L' : t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-row grid grid-cols-2 gap-4">
                {/* Client Selection */}
                <div className="input-group flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-brand-muted uppercase">Client(s) *</label>
                  <div className="relative">
                    <select
                      className="w-full pl-3 pr-10 py-2.5 bg-brand-surface border border-brand-border rounded-md focus:ring-1 focus:ring-emerald-500 outline-none text-[14px] appearance-none"
                      onChange={(e) => handleToggleClient(e.target.value)}
                      value=""
                    >
                      <option value="">Sélectionner...</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" size={16} />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedClientIds.map(cid => (
                      <span key={cid} className="bg-emerald-50 text-emerald-600 text-[11px] font-bold px-2 py-1 rounded border border-emerald-200 flex items-center gap-1">
                        {clients.find(c => c.id === cid)?.name}
                        <button onClick={() => handleToggleClient(cid)}><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Date Selection */}
                <div className="input-group flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-brand-muted uppercase">Date d'émission *</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2.5 bg-brand-surface border border-brand-border rounded-md focus:ring-1 focus:ring-emerald-500 outline-none text-[14px]"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-6 p-4 bg-brand-bg rounded-md border border-brand-border">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-brand-border text-emerald-600 focus:ring-emerald-500"
                    checked={isValidated}
                    onChange={(e) => setIsValidated(e.target.checked)}
                  />
                  <span className="text-xs font-bold text-brand-muted uppercase group-hover:text-emerald-600 transition-colors">Validé</span>
                </label>

                {(type === 'Bon de livraison' || type === 'Facture') && (
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-brand-border text-emerald-600 focus:ring-emerald-500"
                      checked={isSettled}
                      onChange={(e) => setIsSettled(e.target.checked)}
                    />
                    <span className="text-xs font-bold text-brand-muted uppercase group-hover:text-emerald-600 transition-colors">Payé</span>
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-brand-muted uppercase tracking-[0.05em] border-l-4 border-emerald-500 pl-3">
                Articles
              </h3>
              <div className="bg-brand-header/50 rounded-md border border-brand-border max-h-[200px] overflow-y-auto">
                <table className="w-full text-left text-[13px]">
                  {availableArticles.length > 0 && (
                    <thead className="sticky top-0 bg-brand-header border-b border-brand-border z-10">
                      <tr>
                        <th className="px-3 py-2 w-10">
                          <input 
                            type="checkbox"
                            checked={availableArticles.every(a => !!selectedItems[a.id])}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="w-4 h-4 rounded border-brand-border text-emerald-600 focus:ring-emerald-500"
                          />
                        </th>
                        <th className="px-3 py-2 text-[10px] uppercase font-bold text-brand-muted">
                          Sélectionner tout ({availableArticles.length})
                        </th>
                        <th className="px-3 py-2 text-[10px] uppercase font-bold text-brand-muted text-right">Stock</th>
                      </tr>
                    </thead>
                  )}
                  <tbody className="divide-y divide-brand-border">
                    {availableArticles.map(article => (
                      <tr key={article.id} className="hover:bg-brand-surface">
                        <td className="px-3 py-2 w-10">
                          <input 
                            type="checkbox" 
                            checked={!!selectedItems[article.id]} 
                            onChange={() => handleToggleArticle(article)}
                            className="w-4 h-4 rounded border-brand-border text-emerald-600 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-3 py-2 font-bold text-brand-ink">#{article.reference}</td>
                        <td className="px-3 py-2 text-brand-muted">{article.name}</td>
                        <td className="px-3 py-2 text-right">
                          <span className={cn(
                            "text-[11px] font-bold px-1.5 py-0.5 rounded",
                            article.stock > 100 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                          )}>
                            {article.stock}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {availableArticles.length === 0 && (
                  <div className="text-center py-8 text-brand-muted italic text-[12px]">
                    Sélectionnez un client pour voir les articles disponibles
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Line Items Detail */}
          {Object.keys(selectedItems).length > 0 && (
            <div className="space-y-4 mt-8">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-brand-muted uppercase tracking-[0.05em] border-l-4 border-emerald-500 pl-3">
                  Articles Sélectionnés
                </h3>
                
                <div className="flex items-center gap-2 bg-brand-bg p-2 rounded-md border border-brand-border">
                  <span className="text-[11px] font-bold text-brand-muted uppercase">Prix Fixe (TTC)</span>
                  <input 
                    type="number"
                    placeholder="0.00"
                    className="w-24 px-2 py-1 bg-white border border-brand-border rounded text-[13px] font-bold outline-none focus:ring-1 focus:ring-emerald-500"
                    value={globalPrice}
                    onChange={(e) => setGlobalPrice(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyGlobalPrice();
                      }
                    }}
                  />
                  <button 
                    onClick={applyGlobalPrice}
                    className="px-3 py-1 bg-emerald-600 text-white text-[11px] font-bold rounded hover:bg-emerald-700 transition-colors"
                  >
                    Appliquer à tous
                  </button>
                </div>
              </div>

              <div className="border border-brand-border rounded-md overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse bg-brand-surface">
                  <thead>
                    <tr className="bg-brand-header">
                      <th className="px-4 py-3 text-[11px] font-bold text-brand-muted uppercase tracking-wider">Référence</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-brand-muted uppercase tracking-wider">Désignation</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-brand-muted uppercase tracking-wider text-center">Stock</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-brand-muted uppercase tracking-wider w-24">Qté</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-brand-muted uppercase tracking-wider w-28 text-right">PU (HT)</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-brand-muted uppercase tracking-wider w-20 text-center">TVA</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-brand-muted uppercase tracking-wider w-32 text-right">Total TTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border text-[13px]">
                    {(Object.values(selectedItems) as SaleItem[]).map(item => (
                      <tr key={item.articleId} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-bold text-brand-ink font-mono uppercase tracking-tight">
                          {item.reference}
                        </td>
                        <td className="px-4 py-3 text-brand-muted italic">
                          {item.name}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded border",
                            (articles.find(a => a.id === item.articleId)?.stock || 0) > 100 
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                              : "bg-amber-50 text-amber-600 border-amber-100"
                          )}>
                            {articles.find(a => a.id === item.articleId)?.stock || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="number"
                            min="1"
                            className={cn(
                              "w-16 px-2 py-1 bg-white border rounded text-center font-bold outline-none",
                              (articles.find(a => a.id === item.articleId)?.stock || 0) < item.quantity
                                ? "border-rose-500 text-rose-600 focus:ring-1 focus:ring-rose-500"
                                : "border-brand-border focus:ring-1 focus:ring-emerald-500"
                            )}
                            value={item.quantity}
                            onChange={(e) => updateItem(item.articleId, item.priceTTC, parseInt(e.target.value) || 0)}
                          />
                        </td>
                        <td className="px-4 py-3 text-right text-brand-muted font-mono">
                          {item.unitPriceHT.toFixed(2)} DH
                        </td>
                        <td className="px-4 py-3 text-center text-brand-muted font-bold">20%</td>
                        <td className="px-4 py-3 text-right">
                          <input 
                            type="number"
                            className="w-28 px-2 py-1 border border-emerald-200 rounded text-right font-extrabold text-emerald-600 bg-emerald-50/30 font-mono"
                            value={item.priceTTC}
                            onChange={(e) => updateItem(item.articleId, parseFloat(e.target.value) || 0, item.quantity)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-end gap-12 mt-6 p-4 bg-brand-bg rounded-lg border border-brand-border">
                <div className="flex flex-col items-end">
                  <span className="text-[11px] font-bold text-brand-muted uppercase">Total HT</span>
                  <span className="text-[16px] font-bold text-brand-ink">
                    {(Object.values(selectedItems) as SaleItem[]).reduce((acc, item) => acc + (item.unitPriceHT * item.quantity), 0).toFixed(2)} DH
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[11px] font-bold text-brand-muted uppercase">Total TVA (20%)</span>
                  <span className="text-[16px] font-bold text-brand-ink">
                    {(totalTTC - (Object.values(selectedItems) as SaleItem[]).reduce((acc, item) => acc + (item.unitPriceHT * item.quantity), 0)).toFixed(2)} DH
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[11px] font-bold text-brand-muted uppercase">Total TTC</span>
                  <span className="text-[28px] font-black text-emerald-600 tracking-tighter">
                    {totalTTC.toLocaleString()} DH
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-brand-border">
            {editingId && (type === 'Commande' || type === 'Bon de livraison') && (
              <button 
                onClick={() => handleConvertToAvoir(editingId)}
                className="mr-auto px-6 py-2.5 rounded-lg text-sm font-bold text-brand-ink bg-slate-50 border border-brand-border hover:bg-emerald-600 hover:border-emerald-600 hover:text-white transition-all duration-300 flex items-center gap-2 shadow-sm hover:shadow-emerald-200"
              >
                <RotateCcw size={16} />
                Transférer en Avoir
              </button>
            )}
            <button 
              onClick={cancelAdd}
              className="px-6 py-2.5 rounded-md text-sm font-bold text-brand-muted hover:bg-slate-100 transition-all"
            >
              Annuler
            </button>
            <button 
              onClick={handleSave}
              disabled={
                selectedClientIds.length === 0 || 
                Object.keys(selectedItems).length === 0 || 
                (Object.values(selectedItems) as SaleItem[]).some(item => item.priceTTC <= 0)
              }
              className={cn(
                "px-10 py-2.5 rounded-md text-[15px] font-extrabold transition-all",
                (selectedClientIds.length === 0 || Object.keys(selectedItems).length === 0 || (Object.values(selectedItems) as SaleItem[]).some(item => item.priceTTC <= 0))
                ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                : "bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700"
              )}
            >
              {editingId ? 'Mettre à jour' : 'Enregistrer la Vente'}
            </button>
          </div>
        </motion.div>
      )}

      {/* History List */}
      <div className="bg-brand-surface rounded-lg border border-brand-border overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-brand-header border-b border-brand-border">
              <th className="px-6 py-4 text-[11px] font-bold text-brand-muted uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-[11px] font-bold text-brand-muted uppercase tracking-wider">Référence</th>
              <th className="px-6 py-4 text-[11px] font-bold text-brand-muted uppercase tracking-wider">Document</th>
              <th className="px-6 py-4 text-[11px] font-bold text-brand-muted uppercase tracking-wider">Client(s)</th>
              <th className="px-6 py-4 text-[11px] font-bold text-brand-muted uppercase tracking-wider">Statut</th>
              <th className="px-6 py-4 text-[11px] font-bold text-brand-muted uppercase tracking-wider text-right">Montant TTC</th>
              <th className="px-6 py-4 text-[11px] font-bold text-brand-muted uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border text-[13px]">
            {filteredSales.map((sale) => (
              <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-semibold text-brand-muted">
                  {format(new Date(sale.date), 'dd/MM/yyyy')}
                </td>
                <td className="px-6 py-4 font-mono font-bold text-emerald-600">
                  {sale.customReference}
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm",
                    sale.type === 'Facture' ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                    sale.type === 'Avoir' ? "bg-rose-50 text-rose-600 border-rose-200" :
                    sale.type === 'Commande' ? "bg-sky-50 text-sky-600 border-sky-200" :
                    "bg-amber-50 text-amber-600 border-amber-200"
                  )}>
                    {sale.type === 'Bon de livraison' ? 'B.L' : sale.type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {sale.clientIds.map((cid, idx) => (
                      <span key={cid} className="font-bold text-brand-ink">
                        {clients.find(c => c.id === cid)?.name}{idx < sale.clientIds.length - 1 ? ',' : ''}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    {sale.isValidated && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100/50 uppercase">
                        Validé
                      </span>
                    )}
                    {sale.isSettled && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100/50 uppercase">
                        Payé
                      </span>
                    )}
                    {!sale.isValidated && !sale.isSettled && (
                      <span className="text-[10px] text-brand-muted italic font-medium">En attente</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-mono font-black text-emerald-600">{sale.totalTTC.toLocaleString(undefined, { minimumFractionDigits: 2 })} DH</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1.5">
                    <button 
                      onClick={() => generateSalePDF(sale, clients)}
                      className="p-2 text-sky-600 hover:bg-sky-600 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-md border border-sky-100 bg-white"
                      title="Télécharger PDF"
                    >
                      <FileText size={16} />
                    </button>
                    <button 
                      onClick={() => handleEdit(sale)}
                      disabled={sale.type === 'Avoir' || (sale.type === 'Facture' && sale.isValidated && sale.isSettled)}
                      className={cn(
                        "p-2 rounded-xl transition-all shadow-sm border bg-white",
                        (sale.type === 'Avoir' || (sale.type === 'Facture' && sale.isValidated && sale.isSettled))
                          ? "text-slate-300 border-slate-100 cursor-not-allowed bg-slate-50 shadow-none" 
                          : "text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white hover:shadow-md"
                      )}
                      title={
                        sale.type === 'Avoir' 
                          ? "Document Avoir verrouillé" 
                          : (sale.type === 'Facture' && sale.isValidated && sale.isSettled)
                            ? "Facture payée verrouillée"
                            : "Modifier"
                      }
                    >
                      <Edit size={16} />
                    </button>
                    {!showArchived ? (
                      <button 
                        onClick={() => handleArchive(sale.id, true)} 
                        className="p-2 text-amber-600 hover:bg-amber-600 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-md border border-amber-100 bg-white"
                        title="Archiver"
                      >
                        <Archive size={16} />
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleDelete(sale.id)} 
                        className="p-2 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-md border border-rose-100 bg-white"
                        title="Supprimer définitivement"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredSales.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-brand-muted italic">
                  {searchTerm 
                    ? "Aucun document ne correspond à votre recherche" 
                    : "Aucun document de vente enregistré"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
