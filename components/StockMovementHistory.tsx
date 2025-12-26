import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Zap, Trash2, Plus, Filter, X } from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { StockMovement, StockMovementType } from '../types';

const StockMovementHistory = ({ products }: { products: any[] }) => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<StockMovementType | 'all'>('all');
  const [newMovement, setNewMovement] = useState({
    productId: '',
    type: StockMovementType.IN,
    quantity: 0,
    notes: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'stockMovements'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as StockMovement[];
      setMovements(data);
    });
    return () => unsubscribe();
  }, []);

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMovement.productId || newMovement.quantity <= 0) {
      alert('Please fill in all fields correctly');
      return;
    }

    const product = products.find(p => p.id === newMovement.productId);
    if (!product) return;

    try {
      await addDoc(collection(db, 'stockMovements'), {
        productId: newMovement.productId,
        productName: product.brand,
        type: newMovement.type,
        quantity: newMovement.quantity,
        timestamp: new Date().toISOString(),
        notes: newMovement.notes,
        recordedBy: 'Current User'
      });

      setNewMovement({
        productId: '',
        type: StockMovementType.IN,
        quantity: 0,
        notes: ''
      });
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Failed to add stock movement', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this stock movement?')) return;
    try {
      await deleteDoc(doc(db, 'stockMovements', id));
    } catch (err) {
      console.error('Failed to delete stock movement', err);
    }
  };

  const filteredMovements = filterType === 'all' 
    ? movements 
    : movements.filter(m => m.type === filterType);

  const getMovementIcon = (type: StockMovementType) => {
    switch (type) {
      case StockMovementType.IN:
        return <ArrowUp className="w-4 h-4 text-green-600" />;
      case StockMovementType.OUT:
        return <ArrowDown className="w-4 h-4 text-red-600" />;
      case StockMovementType.ADJUSTMENT:
        return <Zap className="w-4 h-4 text-amber-600" />;
    }
  };

  const getMovementColor = (type: StockMovementType) => {
    switch (type) {
      case StockMovementType.IN:
        return 'bg-green-50 border-green-200';
      case StockMovementType.OUT:
        return 'bg-red-50 border-red-200';
      case StockMovementType.ADJUSTMENT:
        return 'bg-amber-50 border-amber-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Stock Movement History</h2>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition"
        >
          <Plus className="w-4 h-4" />
          Log Movement
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-2 rounded-lg transition ${
            filterType === 'all'
              ? 'bg-sky-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilterType(StockMovementType.IN)}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
            filterType === StockMovementType.IN
              ? 'bg-green-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <ArrowUp className="w-4 h-4" />
          Stock In
        </button>
        <button
          onClick={() => setFilterType(StockMovementType.OUT)}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
            filterType === StockMovementType.OUT
              ? 'bg-red-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <ArrowDown className="w-4 h-4" />
          Stock Out
        </button>
        <button
          onClick={() => setFilterType(StockMovementType.ADJUSTMENT)}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
            filterType === StockMovementType.ADJUSTMENT
              ? 'bg-amber-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          Adjustment
        </button>
      </div>

      <div className="grid gap-4">
        {filteredMovements.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p>No stock movements recorded yet</p>
          </div>
        ) : (
          filteredMovements.map(movement => (
            <div
              key={movement.id}
              className={`border rounded-lg p-4 flex items-center justify-between ${getMovementColor(movement.type)}`}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="p-2 bg-white rounded-lg border">
                  {getMovementIcon(movement.type)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{movement.productName}</h3>
                  <p className="text-sm text-slate-600">
                    {movement.quantity} units • {new Date(movement.timestamp).toLocaleString()}
                  </p>
                  {movement.notes && (
                    <p className="text-sm text-slate-500 mt-1">{movement.notes}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(movement.id)}
                className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">Log Stock Movement</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMovement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Product
                </label>
                <select
                  value={newMovement.productId}
                  onChange={(e) => setNewMovement({ ...newMovement, productId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                >
                  <option value="">Select product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.brand} - {p.type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Movement Type
                </label>
                <select
                  value={newMovement.type}
                  onChange={(e) => setNewMovement({ ...newMovement, type: e.target.value as StockMovementType })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                >
                  <option value={StockMovementType.IN}>Stock In (Received)</option>
                  <option value={StockMovementType.OUT}>Stock Out (Used/Sold)</option>
                  <option value={StockMovementType.ADJUSTMENT}>Adjustment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  value={newMovement.quantity}
                  onChange={(e) => setNewMovement({ ...newMovement, quantity: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={newMovement.notes}
                  onChange={(e) => setNewMovement({ ...newMovement, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                  placeholder="e.g., Received from supplier XYZ"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition font-medium"
                >
                  Log Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockMovementHistory;
