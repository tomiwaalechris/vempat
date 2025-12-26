import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, FileText, CheckCircle2, XCircle, Clock, Package } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { PurchaseOrder, POStatus } from '../types';

const PurchaseOrderManagement = ({ products, suppliers }: { products: any[]; suppliers: any[] }) => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [formData, setFormData] = useState({
    poNumber: '',
    supplierId: '',
    status: POStatus.DRAFT,
    expectedDeliveryDate: '',
    notes: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'purchaseOrders'), orderBy('orderDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PurchaseOrder[];
      setOrders(data);
    });
    return () => unsubscribe();
  }, []);

  const generatePONumber = () => {
    return `PO-${Date.now().toString().slice(-8)}`;
  };

  const calculateTotal = () => {
    let total = 0;
    orderItems.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        const supplier = suppliers.find(s => formData.supplierId && s.id === formData.supplierId);
        const price = supplier?.pricePerBag || product.pricePerBag;
        total += price * item.quantity;
      }
    });
    return total;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.poNumber || !formData.supplierId || orderItems.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    const supplier = suppliers.find(s => s.id === formData.supplierId);
    if (!supplier) return;

    const products_data = orderItems.map(item => {
      const product = products.find(p => p.id === item.productId);
      const price = supplier.pricePerBag || product.pricePerBag;
      return {
        productId: item.productId,
        productName: product.brand,
        quantity: item.quantity,
        pricePerBag: price
      };
    });

    try {
      const poData = {
        poNumber: formData.poNumber,
        supplierId: formData.supplierId,
        supplierName: supplier.name,
        products: products_data,
        totalAmount: calculateTotal(),
        status: formData.status,
        orderDate: editingId ? orders.find(o => o.id === editingId)?.orderDate : new Date().toISOString(),
        expectedDeliveryDate: formData.expectedDeliveryDate,
        notes: formData.notes,
        createdBy: 'Current User'
      };

      if (editingId) {
        await updateDoc(doc(db, 'purchaseOrders', editingId), poData);
      } else {
        await addDoc(collection(db, 'purchaseOrders'), poData);
      }

      resetForm();
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Failed to save purchase order', err);
    }
  };

  const handleEdit = (order: PurchaseOrder) => {
    setFormData({
      poNumber: order.poNumber,
      supplierId: order.supplierId,
      status: order.status,
      expectedDeliveryDate: order.expectedDeliveryDate,
      notes: order.notes || ''
    });
    setOrderItems(
      order.products.map(p => ({
        productId: p.productId,
        quantity: p.quantity
      }))
    );
    setEditingId(order.id);
    setIsAddModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this purchase order?')) return;
    try {
      await deleteDoc(doc(db, 'purchaseOrders', id));
    } catch (err) {
      console.error('Failed to delete purchase order', err);
    }
  };

  const handleStatusChange = async (id: string, newStatus: POStatus) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === POStatus.DELIVERED) {
        updateData.actualDeliveryDate = new Date().toISOString();
      }
      await updateDoc(doc(db, 'purchaseOrders', id), updateData);
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const resetForm = () => {
    setFormData({
      poNumber: generatePONumber(),
      supplierId: '',
      status: POStatus.DRAFT,
      expectedDeliveryDate: '',
      notes: ''
    });
    setOrderItems([]);
    setEditingId(null);
  };

  const getStatusColor = (status: POStatus) => {
    switch (status) {
      case POStatus.DRAFT:
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case POStatus.SUBMITTED:
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case POStatus.CONFIRMED:
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case POStatus.DELIVERED:
        return 'bg-green-100 text-green-700 border-green-300';
      case POStatus.CANCELLED:
        return 'bg-red-100 text-red-700 border-red-300';
    }
  };

  const getStatusIcon = (status: POStatus) => {
    switch (status) {
      case POStatus.DRAFT:
        return <FileText className="w-4 h-4" />;
      case POStatus.SUBMITTED:
        return <Clock className="w-4 h-4" />;
      case POStatus.CONFIRMED:
        return <CheckCircle2 className="w-4 h-4" />;
      case POStatus.DELIVERED:
        return <Package className="w-4 h-4" />;
      case POStatus.CANCELLED:
        return <XCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Purchase Orders</h2>
        <button
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition"
        >
          <Plus className="w-4 h-4" />
          New Purchase Order
        </button>
      </div>

      <div className="grid gap-4">
        {orders.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p>No purchase orders created yet</p>
          </div>
        ) : (
          orders.map(order => (
            <div
              key={order.id}
              className="border border-slate-200 rounded-lg p-6 hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-slate-900">{order.poNumber}</h3>
                    <button
                      onClick={() => handleStatusChange(
                        order.id,
                        order.status === POStatus.DRAFT
                          ? POStatus.SUBMITTED
                          : order.status === POStatus.SUBMITTED
                          ? POStatus.CONFIRMED
                          : order.status === POStatus.CONFIRMED
                          ? POStatus.DELIVERED
                          : order.status
                      )}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-medium transition ${getStatusColor(order.status)}`}
                    >
                      {getStatusIcon(order.status)}
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{order.supplierName}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(order)}
                    className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(order.id)}
                    className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600">Items</p>
                    <p className="font-bold text-slate-900">{order.products.length}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Order Date</p>
                    <p className="font-bold text-slate-900">{new Date(order.orderDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Expected Delivery</p>
                    <p className="font-bold text-slate-900">{new Date(order.expectedDeliveryDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Total</p>
                    <p className="font-bold text-sky-600">₦{order.totalAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">ITEMS</p>
                <div className="space-y-2">
                  {order.products.map((product, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded">
                      <div>
                        <p className="font-medium text-slate-900">{product.productName}</p>
                        <p className="text-slate-600">{product.quantity} bags × ₦{product.pricePerBag.toLocaleString()}</p>
                      </div>
                      <p className="font-bold text-slate-900">₦{(product.quantity * product.pricePerBag).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {order.notes && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 mb-2">NOTES</p>
                  <p className="text-sm text-slate-600">{order.notes}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">
                {editingId ? 'Edit Purchase Order' : 'Create Purchase Order'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    PO Number
                  </label>
                  <input
                    type="text"
                    value={formData.poNumber}
                    disabled={!!editingId}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Supplier *
                  </label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as POStatus })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                  >
                    <option value={POStatus.DRAFT}>Draft</option>
                    <option value={POStatus.SUBMITTED}>Submitted</option>
                    <option value={POStatus.CONFIRMED}>Confirmed</option>
                    <option value={POStatus.DELIVERED}>Delivered</option>
                    <option value={POStatus.CANCELLED}>Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={formData.expectedDeliveryDate}
                    onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-slate-700">
                    Order Items *
                  </label>
                  <button
                    type="button"
                    onClick={() => setOrderItems([...orderItems, { productId: '', quantity: 1 }])}
                    className="text-xs px-2 py-1 bg-sky-100 text-sky-700 rounded hover:bg-sky-200"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {orderItems.map((item, idx) => (
                    <div key={idx} className="flex gap-3 items-end">
                      <select
                        value={item.productId}
                        onChange={(e) => {
                          const newItems = [...orderItems];
                          newItems[idx].productId = e.target.value;
                          setOrderItems(newItems);
                        }}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none text-sm"
                      >
                        <option value="">Select product</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.brand} - {p.type}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...orderItems];
                          newItems[idx].quantity = parseInt(e.target.value) || 0;
                          setOrderItems(newItems);
                        }}
                        className="w-20 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none text-sm"
                        placeholder="Qty"
                      />
                      <button
                        type="button"
                        onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                  placeholder="Special instructions, delivery notes, etc."
                  rows={3}
                />
              </div>

              {orderItems.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-700">Estimated Total:</span>
                    <span className="text-lg font-bold text-sky-600">₦{calculateTotal().toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition font-medium flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingId ? 'Update' : 'Create'} Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderManagement;
