
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle,
  PlusCircle,
  MinusCircle,
  MessageSquare,
  Search,
  Menu,
  X,
  ChevronRight,
  Fish,
  Save,
  Trash2,
  RefreshCcw,
  CreditCard,
  Minus,
  Plus,
  CheckCircle2,
  User,
  ShieldCheck,
  LogOut,
  Lock,
  ArrowRight,
  Printer,
  Info,
  Loader2,
  FileText,
  BarChart3
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged, 
  signOut, 
  updateProfile 
} from "firebase/auth";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  setDoc,
  getDocs,
  writeBatch
  , getDoc
} from "firebase/firestore";

import { auth, db } from './firebase';
import { createProduct as repoCreateProduct, updateProduct as repoUpdateProduct, deleteProduct as repoDeleteProduct, createReceipt as repoCreateReceipt } from './src/services/repository';
import { Product, Sale, FeedType, CartItem, UserRole, StockMovement } from './types';
import { APP_THEME, SECRET_SUPERADMIN_CODE } from './constants';
import { getGeminiAdvisor } from './geminiService';

const CURRENCY = APP_THEME.currency;

// --- Sub-components (extracted) ---
import Toast from './components/Toast';
import ReceiptModal from './components/ReceiptModal';
import StatCard from './components/StatCard';
import ViewWrapper from './components/ViewWrapper';
import LoginView from './components/LoginView';
import RegistrationView from './components/RegistrationView';
import SignUpView from './components/SignUpView';
import SidebarItem from './components/SidebarItem';
import StockMovementHistory from './components/StockMovementHistory';
import SupplierManagement from './components/SupplierManagement';
import PurchaseOrderManagement from './components/PurchaseOrderManagement';
import ReportsDashboard from './components/ReportsDashboard';

// --- Login/Registration/Signup components are now extracted into `components/` ---

// --- Main App ---

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [userMeta, setUserMeta] = useState<{ name: string, role: UserRole, email?: string } | null>(null);
  const [usersList, setUsersList] = useState<Array<{ uid: string, name: string, role: UserRole }>>([]);
  const [manageUsersOpen, setManageUsersOpen] = useState(false);
  const [initialDataLoading, setInitialDataLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [toasts, setToasts] = useState<{id: number, message: string, type: 'success' | 'error' | 'info'}[]>([]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'sales' | 'advisor' | 'pos' | 'stock-history' | 'suppliers' | 'purchase-orders' | 'reports'>('pos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string>("");
  const [aiQuery, setAiQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [queuedCount, setQueuedCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);
  
  // New state for inventory management features
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  
  // POS & Receipt States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [recentSale, setRecentSale] = useState<any | null>(null);

  // Modal states
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    brand: '',
    type: FeedType.GROWER,
    particleSize: '4mm',
    proteinPercent: 38,
    weightKg: 15,
    pricePerBag: 15000,
    stock: 0,
    minStockThreshold: 10
  });

  // Role helper
  const roleInfo = useMemo(() => {
    if (userMeta) return { name: userMeta.name, role: userMeta.role };
    if (!user?.displayName) return { name: '', role: UserRole.SALES };
    const [name, role] = user.displayName.split('|');
    return { name, role: role as UserRole };
  }, [user, userMeta]);

  const isSuperAdmin = roleInfo.role === UserRole.SUPER_ADMIN;
  const isAdmin = isSuperAdmin || roleInfo.role === UserRole.ADMIN;

  // 1. Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, (currUser) => {
      setUser(currUser);
      if (!currUser) setInitialDataLoading(false);
    });
  }, []);

  // 2. Data Listeners (Firestore)
  useEffect(() => {
    if (!user) return;

    const qProducts = query(collection(db, "products"), orderBy("brand", "asc"));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      setProducts(prods);
      setInitialDataLoading(false);
    });

    const qSales = query(collection(db, "sales"), orderBy("date", "desc"), limit(100));
    const unsubSales = onSnapshot(qSales, (snapshot) => {
      const s = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Sale[];
      setSales(s);
    });

    const qMovements = query(collection(db, "stockMovements"), orderBy("timestamp", "desc"));
    const unsubMovements = onSnapshot(qMovements, (snapshot) => {
      const m = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as StockMovement[];
      setStockMovements(m);
    });

    const qSuppliers = query(collection(db, "suppliers"), orderBy("name", "asc"));
    const unsubSuppliers = onSnapshot(qSuppliers, (snapshot) => {
      const s = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSuppliers(s);
    });

    const qPOs = query(collection(db, "purchaseOrders"), orderBy("orderDate", "desc"));
    const unsubPOs = onSnapshot(qPOs, (snapshot) => {
      const p = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPurchaseOrders(p);
    });

    return () => {
      unsubProducts();
      unsubSales();
      unsubMovements();
      unsubSuppliers();
      unsubPOs();
    };
  }, [user]);

  // Load user metadata from Firestore (users/<uid>) if present — allows Console-based admin assignment
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const loadMeta = async () => {
      try {
        // Load the current user's doc if it exists
        const uDoc = await getDoc(doc(db, 'users', user.uid));
        if (cancelled) return;
        if (uDoc.exists()) {
          const d: any = uDoc.data();
          setUserMeta({ name: d.name || '', role: d.role || UserRole.SALES });
          // cache for offline use
          try { (await import('./src/auth/offline')).cacheUserProfile({ uid: user.uid, email: user.email }, { name: d.name || '', role: d.role || UserRole.SALES }); } catch (e) {}
        } else {
          // create a default user doc for newcomers (Sales role by default)
          const display = user.displayName || (userMeta ? `${userMeta.name}|${userMeta.role}` : '');
          const [namePart, rolePart] = display.split('|');
          const name = namePart || `User-${user.uid.substring(0,6)}`;
          const role = (rolePart as UserRole) || UserRole.SALES;
          await setDoc(doc(db, 'users', user.uid), { name, role, createdAt: new Date().toISOString() });
          setUserMeta({ name, role });
          try { (await import('./src/auth/offline')).cacheUserProfile({ uid: user.uid, email: user.email }, { name, role }); } catch (e) {}
        }
      } catch (err) {
        console.warn('failed to load user metadata', err);
      }
    };
    loadMeta();
    return () => { cancelled = true; };
  }, [user]);

  const seedInitialData = async () => {
    // Function removed - admins now manually add products
  };

  // User management helpers (super admin)
  const openManageUsers = async () => {
    setManageUsersOpen(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list = snap.docs.map(d => ({ uid: d.id, ...(d.data() as any) }));
      setUsersList(list as any);
    } catch (err) {
      console.error('failed to load users list', err);
      showToast('Failed to load users', 'error');
    }
  };

  const setUserRole = async (uid: string, role: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role });
      setUsersList(prev => prev.map(u => u.uid === uid ? { ...u, role } : u));
      showToast('User role updated', 'success');
    } catch (err) {
      console.error('failed to update role', err);
      showToast('Failed to update role', 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const stats = useMemo(() => {
    const totalRevenue = sales.reduce((acc, sale) => acc + sale.totalPrice, 0);
    const lowStockItems = products.filter(p => p.stock <= p.minStockThreshold).length;
    const inventoryValue = products.reduce((acc, p) => acc + (p.stock * p.pricePerBag), 0);
    return { totalRevenue, lowStockItems, inventoryValue, totalSales: sales.length };
  }, [products, sales]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.brand.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.particleSize.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  // --- Actions ---

  const handleLogout = async () => {
    await signOut(auth);
    showToast("Logged out successfully", "info");
  };

  // Monitor online/offline and queue stats + auto-sync
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      console.log('App is online - attempting sync');
    };
    const onOffline = () => {
      setIsOnline(false);
      console.log('App is offline');
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    let mounted = true;
    const poll = async () => {
      try {
        const info = await (await import('./src/services/repository')).getQueueInfo();
        if (!mounted) return;
        setQueuedCount(info.pending || 0);
        setFailedCount(info.failed || 0);

        // Auto-sync when online and there are pending items
        if (isOnline && info.pending > 0) {
          setSyncing(true);
          try {
            const { remoteHandler } = await import('./src/sync/remote');
            const { syncNow } = await import('./src/services/repository');
            console.log(`Syncing ${info.pending} pending items...`);
            await syncNow(remoteHandler);
            console.log('Sync completed, re-polling queue...');
            // Re-poll immediately after sync to update queue count
            const updatedInfo = await (await import('./src/services/repository')).getQueueInfo();
            if (mounted) {
              setQueuedCount(updatedInfo.pending || 0);
              setFailedCount(updatedInfo.failed || 0);
            }
          } catch (err) {
            console.error('auto-sync failed', err);
          } finally {
            setSyncing(false);
          }
        }
      } catch (e) {
        console.error('polling failed', e);
      }
    };

    poll();
    const iv = setInterval(poll, 5000);
    return () => { mounted = false; clearInterval(iv); window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, [isOnline]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          showToast("Out of stock!", "error");
          return prev;
        }
        return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, {
        productId: product.id,
        brand: product.brand,
        type: product.type,
        particleSize: product.particleSize,
        weight: product.weightKg,
        price: product.pricePerBag,
        quantity: 1
      }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const product = products.find(p => p.id === productId);
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        if (product && newQty > product.stock) {
          showToast("Stock limit reached", "error");
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const handlePOSCheckout = async () => {
    if (cart.length === 0) return;
    
    try {
      const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

      // Persist sales and stock updates locally and enqueue for remote sync
      for (const item of cart) {
        const saleId = (crypto as any)?.randomUUID ? (crypto as any).randomUUID() : `sale-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
        const sale: Sale = {
          id: saleId,
          productId: item.productId,
          productName: `${item.brand} ${item.particleSize} ${item.type} (${item.weight}kg)`,
          quantity: item.quantity,
          totalPrice: item.price * item.quantity,
          customerName: customerName,
          date: new Date().toISOString()
        };
        await repoCreateReceipt(sale);

        // update local product stock and enqueue update
        const currentProd = products.find(p => p.id === item.productId);
        if (currentProd) {
          const updated = { ...currentProd, stock: Math.max(0, currentProd.stock - item.quantity) };
          await repoUpdateProduct(updated);
        }
      }

      setRecentSale({ items: [...cart], total, customerName });
      setCart([]);
      setCustomerName("Walk-in Customer");
      showToast("Sale recorded locally and queued for sync", "success");
    } catch (err) {
      console.error('POS checkout failed', err);
      showToast("Sale failed to record locally.", "error");
    }
  };

  const handleUpdateStock = async (productId: string, amount: number) => {
    if (!isAdmin) return;
    try {
      const prod = products.find(p => p.id === productId);
      if (prod) {
        const updated = { ...prod, stock: Math.max(0, prod.stock + amount) };
        await repoUpdateProduct(updated);
        showToast("Stock updated locally and queued", "success");
      }
    } catch (err) {
      showToast("Update failed.", "error");
    }
  };

  const handleCreateProduct = async () => {
    if (!isAdmin) return;
    if (!newProduct.brand || !newProduct.weightKg) {
      showToast("Missing required fields", "error");
      return;
    };
    try {
      const prodData = {
        brand: newProduct.brand || 'Unnamed',
        type: newProduct.type as FeedType,
        particleSize: newProduct.particleSize || '0mm',
        proteinPercent: newProduct.proteinPercent || 0,
        weightKg: newProduct.weightKg || 0,
        pricePerBag: newProduct.pricePerBag || 0,
        stock: newProduct.stock || 0,
        minStockThreshold: newProduct.minStockThreshold || 10
      };
      const id = (crypto as any)?.randomUUID ? (crypto as any).randomUUID() : `prod-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      const product: Product = { id, ...(prodData as Product) } as Product;
      await repoCreateProduct(product);
      setIsAddProductOpen(false);
      setNewProduct({ brand: '', type: FeedType.GROWER, particleSize: '4mm', proteinPercent: 38, weightKg: 15, pricePerBag: 15000, stock: 0, minStockThreshold: 10 });
      showToast("Product saved locally and queued for sync", "success");
    } catch (err) {
      showToast("Failed to save product.", "error");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!isAdmin) return;
    if (!confirm("Are you sure? This is permanent in the cloud.")) return;
    try {
      // Optimistic delete: remove from UI immediately
      setProducts(prev => prev.filter(p => p.id !== productId));
      await repoDeleteProduct(productId);
      showToast("Product deleted and syncing to cloud", "success");
    } catch (err) {
      // If deletion fails, refresh to show the product again
      showToast("Delete failed", "error");
    }
  };

  const askAdvisor = async () => {
    if (!isAdmin) return;
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    const response = await getGeminiAdvisor(products, sales, aiQuery);
    setAiResponse(response);
    setAiLoading(false);
  };

  // Hidden registration page: visit `#/register` to create a Super Admin with the secret code
  if (window.location.hash === '#/register') {
    return <RegistrationView onRegister={(name, email) => setUserMeta({ name, role: UserRole.SUPER_ADMIN, email })} />;
  }

  if (!user) {
    return <LoginView onLogin={(role: any, name: string, offlineUser?: any) => {
      setUserMeta({ role, name });
      if (offlineUser) {
        // set a synthetic user object so app proceeds in offline mode
        setUser(offlineUser);
      }
    }} />;
  }

  if (initialDataLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 text-sky-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Connecting to Vempat Cloud...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sync / Network status indicator */}
      <div className="fixed top-4 right-4 z-60 flex items-center gap-3">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${isOnline ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'} border ${isOnline ? 'border-emerald-100' : 'border-rose-100'}`}>
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-600' : 'bg-rose-600'}`}></div>
          <div>{isOnline ? 'Online' : 'Offline'}</div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-slate-50 border border-slate-100">
          <div className="text-slate-500">Queue</div>
          <div className="bg-slate-900 text-white px-2 py-0.5 rounded-full text-xs">{queuedCount}</div>
          {syncing && <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />}
        </div>
      </div>
      {recentSale && <ReceiptModal sale={recentSale} onClose={() => setRecentSale(null)} />}
      <div className="z-[300]">
        {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />)}
      </div>

      {manageUsersOpen && (
        <div className="fixed inset-0 bg-slate-900/70 z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b">
              <h3 className="font-bold">Manage Users</h3>
              <button onClick={() => setManageUsersOpen(false)} className="p-2"><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
              {usersList.length === 0 ? <p className="text-sm text-slate-500">No users found.</p> : usersList.map(u => (
                <div key={u.uid} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                  <div>
                    <div className="font-bold text-sm">{u.name}</div>
                    <div className="text-[11px] text-slate-400 uppercase">{u.role}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.role !== UserRole.ADMIN && u.role !== UserRole.SUPER_ADMIN && (
                      <button onClick={() => setUserRole(u.uid, UserRole.ADMIN)} className="px-3 py-1 bg-emerald-600 text-white rounded-md text-xs">Promote</button>
                    )}
                    {u.role === UserRole.ADMIN && (
                      <button onClick={() => setUserRole(u.uid, UserRole.SALES)} className="px-3 py-1 bg-amber-500 text-white rounded-md text-xs">Demote</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isAddProductOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-sky-900 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold">New Inventory Entry</h3>
              <button onClick={() => setIsAddProductOpen(false)} className="hover:rotate-90 transition-transform"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Brand Name</label>
                  <input type="text" className="w-full px-4 py-3 bg-slate-50 border rounded-2xl" placeholder="e.g. Vital" value={newProduct.brand} onChange={e => setNewProduct({...newProduct, brand: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Size (mm)</label>
                  <input type="text" className="w-full px-4 py-3 bg-slate-50 border rounded-2xl" placeholder="4mm" value={newProduct.particleSize} onChange={e => setNewProduct({...newProduct, particleSize: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Stage</label>
                  <select className="w-full px-4 py-3 bg-slate-50 border rounded-2xl" value={newProduct.type} onChange={e => setNewProduct({...newProduct, type: e.target.value as FeedType})}>
                    {Object.values(FeedType).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Price (₦)</label>
                  <input type="number" className="w-full px-4 py-3 bg-slate-50 border rounded-2xl" value={newProduct.pricePerBag} onChange={e => setNewProduct({...newProduct, pricePerBag: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Starting Stock</label>
                  <input type="number" className="w-full px-4 py-3 bg-slate-50 border rounded-2xl" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})} />
                </div>
              </div>
              <button onClick={handleCreateProduct} className="w-full py-4 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-2xl transition-all shadow-xl shadow-sky-600/20 mt-4 active:scale-95">Save Product</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-100 transition-transform lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-sky-600/30">
                <Fish className="w-6 h-6" />
              </div>
              <span className="text-xl font-bold text-slate-800 tracking-tight uppercase tracking-widest">VEMPAT</span>
            </div>
            <button className="lg:hidden" onClick={() => setIsSidebarOpen(false)}><X className="w-6 h-6 text-slate-400" /></button>
          </div>

          <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
            {isAdmin && <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => {setActiveTab('dashboard'); setIsSidebarOpen(false);}} />}
            <SidebarItem icon={CreditCard} label="Sales (POS)" active={activeTab === 'pos'} onClick={() => {setActiveTab('pos'); setIsSidebarOpen(false);}} />
            <SidebarItem icon={Package} label="Inventory" active={activeTab === 'inventory'} onClick={() => {setActiveTab('inventory'); setIsSidebarOpen(false);}} />
            {isAdmin && (
              <>
                <SidebarItem icon={ShoppingCart} label="History" active={activeTab === 'sales'} onClick={() => {setActiveTab('sales'); setIsSidebarOpen(false);}} />
                <SidebarItem icon={TrendingUp} label="Stock Movements" active={activeTab === 'stock-history'} onClick={() => {setActiveTab('stock-history'); setIsSidebarOpen(false);}} />
                <SidebarItem icon={Package} label="Suppliers" active={activeTab === 'suppliers'} onClick={() => {setActiveTab('suppliers'); setIsSidebarOpen(false);}} />
                <SidebarItem icon={FileText} label="Purchase Orders" active={activeTab === 'purchase-orders'} onClick={() => {setActiveTab('purchase-orders'); setIsSidebarOpen(false);}} />
                <SidebarItem icon={BarChart3} label="Reports" active={activeTab === 'reports'} onClick={() => {setActiveTab('reports'); setIsSidebarOpen(false);}} />
                <SidebarItem icon={MessageSquare} label="AI Advisor" active={activeTab === 'advisor'} onClick={() => {setActiveTab('advisor'); setIsSidebarOpen(false);}} />
              </>
            )}
          </nav>

          <div className="p-4 mt-auto space-y-3">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm shrink-0 ${isAdmin ? 'bg-indigo-500' : 'bg-sky-500'}`}>
                  {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{roleInfo.name || 'User'}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{roleInfo.role}</p>
                </div>
              </div>
              {isSuperAdmin && (
                <button
                  onClick={openManageUsers}
                  className="w-full py-2.5 bg-white text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-50 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  Manage Users
                </button>
              )}

              <button 
                onClick={handleLogout}
                className="w-full py-2.5 bg-white text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl border border-red-50 hover:bg-red-50 transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-3 h-3" /> Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 lg:px-10 shrink-0">
          <button className="lg:hidden p-2 text-slate-600 hover:bg-slate-50 rounded-lg" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1 flex items-center max-w-xl mx-auto px-4 min-w-0">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Real-time search across inventory..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-sky-500/20 transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 bg-slate-50 h-full relative">
          {activeTab === 'dashboard' && isAdmin && (
            <ViewWrapper title="Business Dashboard">
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8">
                <StatCard title="Revenue" value={`${CURRENCY}${stats.totalRevenue.toLocaleString()}`} icon={TrendingUp} color="bg-emerald-500" />
                <StatCard title="Inv. Value" value={`${CURRENCY}${stats.inventoryValue.toLocaleString()}`} icon={Package} color="bg-sky-500" />
                <StatCard title="Sold" value={sales.reduce((a, b) => a + b.quantity, 0)} icon={ShoppingCart} color="bg-blue-500" />
                <StatCard title="Low Stock" value={stats.lowStockItems} icon={AlertTriangle} color={stats.lowStockItems > 0 ? "bg-amber-500" : "bg-slate-300"} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="text-base md:text-lg font-semibold mb-6 text-slate-800">Available Stock</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={products.map(p => ({ name: `${p.brand.split(' ')[0]} ${p.particleSize}`, stock: p.stock }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} interval={0} angle={-15} textAnchor="end" />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                        <Bar dataKey="stock" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="text-base md:text-lg font-semibold mb-6 text-slate-800">Sales Distribution</h3>
                  <div className="h-64 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={Object.entries(products.reduce((acc: any, p) => {
                            const sold = sales.filter(s => s.productId === p.id).reduce((a, b) => a + b.quantity, 0);
                            if (sold > 0) acc[`${p.brand} ${p.particleSize}`] = sold;
                            return acc;
                          }, {})).map(([name, value]) => ({ name, value: value as number }))} 
                          innerRadius={60} 
                          outerRadius={80} 
                          paddingAngle={5} 
                          dataKey="value"
                        >
                          {['#0ea5e9', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444'].map((color, index) => <Cell key={`cell-${index}`} fill={color} />)}
                        </Pie>
                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </ViewWrapper>
          )}

          {activeTab === 'pos' && (
            <ViewWrapper title="Quick Sale (POS)">
              <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6 h-full pb-24 lg:pb-0">
                {/* Floating cart indicator (desktop) - prominent, minimal */}
                {cart.length > 0 && (
                  <div className="hidden lg:flex items-center gap-3 absolute top-4 right-6 z-40">
                    <div className="bg-white/90 backdrop-blur-sm border border-slate-100 rounded-full p-3 shadow-2xl flex items-center gap-3">
                      <ShoppingCart className="w-5 h-5 text-sky-600" />
                      <div className="flex flex-col leading-tight">
                        <span className="text-xs text-slate-500">Cart</span>
                        <span className="text-sm font-black text-slate-900">{cart.length} items</span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="lg:col-span-2 flex flex-col gap-4 overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                    {filteredProducts.map(p => (
                      <button
                        key={p.id}
                        onClick={() => addToCart(p)}
                        disabled={p.stock <= 0}
                        className={`p-4 bg-white border rounded-2xl text-left transition-all group relative flex flex-col h-auto min-h-[140px] md:min-h-[160px] ${p.stock <= 0 ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:border-sky-400 hover:shadow-lg active:scale-95'}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[9px] font-bold uppercase text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">{p.type}</span>
                          <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{p.particleSize}</span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-base md:text-lg group-hover:text-sky-600 transition-colors truncate w-full">{p.brand}</h4>
                        <p className="text-[10px] md:text-xs text-slate-400 font-medium mb-1">{p.weightKg}kg Bag • {p.proteinPercent}% Prot.</p>
                        <p className="text-sky-600 font-bold text-lg md:text-xl mt-auto">{CURRENCY}{p.pricePerBag.toLocaleString()}</p>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
                          <span className={`text-[10px] font-bold ${p.stock <= p.minStockThreshold ? 'text-red-500' : 'text-slate-400'}`}>
                            {p.stock} BAGS
                          </span>
                          <PlusCircle className="w-5 h-5 text-sky-500" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={cart.length === 0 ? 'hidden lg:col-span-1' : 'lg:col-span-1'}>
                  <div className="fixed bottom-4 left-4 right-4 lg:static lg:right-auto lg:left-auto lg:bottom-auto lg:max-w-[360px] z-50">
                    <div className="bg-white/95 backdrop-blur-sm border border-slate-100 rounded-3xl p-5 md:p-6 flex flex-col shadow-2xl h-full max-h-[85vh] lg:max-h-[calc(100vh-12rem)] ring-1 ring-sky-50">
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                      <h3 className="font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-9 h-9 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center shadow-sm">
                          <ShoppingCart className="w-5 h-5" />
                        </div>
                        <div className="leading-tight">
                          <div className="text-sm font-black">Cart</div>
                          <div className="text-[11px] text-slate-500">{cart.length} items</div>
                        </div>
                      </h3>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setCart([]); showToast('Cart cleared', 'info'); }} className="text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase">Clear</button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0 mb-6 space-y-3 pr-1">
                      {cart.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                          <ShoppingCart className="w-10 h-10 mx-auto opacity-10 mb-2" />
                          <p className="text-sm">Empty cart</p>
                        </div>
                      ) : cart.map(item => (
                        <div key={item.productId} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex justify-between items-start">
                            <div className="min-w-0 pr-2">
                              <h5 className="font-bold text-slate-800 text-xs truncate">{item.brand} ({item.particleSize})</h5>
                              <p className="text-[10px] text-slate-500 truncate">{item.type} • {item.weight}kg</p>
                            </div>
                            <span className="font-bold text-slate-700 text-xs shrink-0">{CURRENCY}{(item.price * item.quantity).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-2 bg-white rounded-lg border px-1.5 py-0.5">
                              <button onClick={() => updateCartQty(item.productId, -1)} className="p-1 hover:text-red-500"><Minus className="w-3 h-3" /></button>
                              <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                              <button onClick={() => updateCartQty(item.productId, 1)} className="p-1 hover:text-emerald-500"><Plus className="w-3 h-3" /></button>
                            </div>
                            <button onClick={() => updateCartQty(item.productId, -item.quantity)} className="text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase">Remove</button>
                          </div>
                        </div>
                      ))}
                    </div>

                      <div className="pt-4 border-t border-slate-100 space-y-4">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-slate-500 font-medium text-sm">Total</span>
                          <span className="text-2xl md:text-3xl font-extrabold text-slate-900">{CURRENCY}{cart.reduce((a, b) => a + (b.price * b.quantity), 0).toLocaleString()}</span>
                        </div>
                        <button 
                          onClick={handlePOSCheckout}
                          disabled={cart.length === 0}
                          className={`w-full py-3 md:py-4 rounded-2xl font-extrabold flex items-center justify-center gap-2 transition-all ${cart.length > 0 ? 'bg-cyan-500 text-white hover:bg-cyan-600 active:scale-95 shadow-xl shadow-cyan-500/20' : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'}`}
                        >
                          <CreditCard className="w-5 h-5" /> Complete Sale
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ViewWrapper>
          )}

          {activeTab === 'inventory' && (
            <ViewWrapper 
              title="Stock Inventory" 
              actions={isAdmin && (
                <button 
                  onClick={() => setIsAddProductOpen(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-colors shadow-lg shadow-sky-600/20 w-full md:w-auto"
                >
                  <PlusCircle className="w-4 h-4" /> New Feed
                </button>
              )}
            >
              <div className="md:hidden space-y-3 pb-24">
                {filteredProducts.map(p => (
                  <div key={p.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800 text-base">{p.brand}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold uppercase text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">{p.particleSize}</span>
                          <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{p.type}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-sky-600">{CURRENCY}{p.pricePerBag.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{p.weightKg}kg • {p.proteinPercent}% P</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-black ${p.stock <= p.minStockThreshold ? 'text-red-500' : 'text-slate-800'}`}>
                          {p.stock} BAGS
                        </span>
                        {p.stock <= p.minStockThreshold && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleUpdateStock(p.id, -10)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg" title="Remove 10 bags"><MinusCircle className="w-5 h-5" /></button>
                          <button onClick={() => handleUpdateStock(p.id, 10)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Add 10 bags"><PlusCircle className="w-5 h-5" /></button>
                          <button 
                            onClick={() => handleDeleteProduct(p.id)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product Brand</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Size (mm)</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Stock</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Price (Bag)</th>
                        {isAdmin && <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-800">{p.brand}</div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold">{p.weightKg}kg • {p.proteinPercent}% Protein</div>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-600">{p.particleSize}</td>
                          <td className="px-6 py-4"><span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 uppercase tracking-wider">{p.type}</span></td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className={`font-black ${p.stock <= p.minStockThreshold ? 'text-red-500' : 'text-slate-800'}`}>{p.stock}</span>
                              {p.stock <= p.minStockThreshold && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-600">{CURRENCY}{p.pricePerBag.toLocaleString()}</td>
                          {isAdmin && (
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleUpdateStock(p.id, -10)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg" title="Remove 10 bags"><MinusCircle className="w-5 h-5" /></button>
                                <button onClick={() => handleUpdateStock(p.id, 10)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Add 10 bags"><PlusCircle className="w-5 h-5" /></button>
                                <button onClick={() => handleDeleteProduct(p.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Delete Product"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </ViewWrapper>
          )}

          {activeTab === 'sales' && isAdmin && (
            <ViewWrapper title="Sales History">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Qty</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-slate-600">{sale.date}</td>
                          <td className="px-6 py-4 font-semibold text-slate-800">{sale.customerName}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{sale.productName}</td>
                          <td className="px-6 py-4 text-center font-bold text-slate-700">{sale.quantity}</td>
                          <td className="px-6 py-4 text-right font-bold text-sky-600">{CURRENCY}{sale.totalPrice.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </ViewWrapper>
          )}

          {activeTab === 'advisor' && isAdmin && (
            <ViewWrapper title="Vempat Business Advisor">
              <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-12">
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Strategic Consultant</h3>
                      <p className="text-sm text-slate-500">Real-time data analysis via Gemini AI.</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <textarea
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-sky-500/20 outline-none transition-all min-h-[100px] text-slate-700"
                      placeholder="Ask about inventory gaps or popular brands..."
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                    />
                    <button
                      onClick={askAdvisor}
                      disabled={aiLoading || !aiQuery.trim()}
                      className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${aiLoading || !aiQuery.trim() ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'}`}
                    >
                      {aiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />}
                      {aiLoading ? 'Analyzing Cloud Data...' : 'Get Advice'}
                    </button>
                  </div>
                </div>

                {aiResponse && (
                  <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-top-4">
                    <div className="text-slate-700 whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                      {aiResponse}
                    </div>
                  </div>
                )}
              </div>
            </ViewWrapper>
          )}

          {activeTab === 'stock-history' && isAdmin && (
            <ViewWrapper title="Stock Movement History">
              <StockMovementHistory products={products} />
            </ViewWrapper>
          )}

          {activeTab === 'suppliers' && isAdmin && (
            <ViewWrapper title="Supplier Management">
              <SupplierManagement products={products} />
            </ViewWrapper>
          )}

          {activeTab === 'purchase-orders' && isAdmin && (
            <ViewWrapper title="Purchase Orders">
              <PurchaseOrderManagement products={products} suppliers={suppliers} />
            </ViewWrapper>
          )}

          {activeTab === 'reports' && isAdmin && (
            <ViewWrapper title="Reports & Analytics">
              <ReportsDashboard sales={sales} products={products} stockMovements={stockMovements} />
            </ViewWrapper>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
