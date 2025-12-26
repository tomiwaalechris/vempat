
export enum FeedType {
  STARTER = 'Starter',
  GROWER = 'Grower',
  FINISHER = 'Finisher',
  NURSERY = 'Nursery'
}

export enum UserRole {
  SUPER_ADMIN = 'SuperAdmin',
  ADMIN = 'Admin',
  SALES = 'Sales'
}

export interface Product {
  id: string;
  brand: string;
  type: FeedType;
  particleSize: string; // e.g., "2mm", "4mm", "Powder"
  proteinPercent: number;
  weightKg: number;
  pricePerBag: number;
  stock: number;
  minStockThreshold: number;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  customerName: string;
  date: string;
}

export interface CartItem {
  productId: string;
  brand: string;
  type: string;
  particleSize: string;
  weight: number;
  price: number;
  quantity: number;
}

export interface BusinessStats {
  totalRevenue: number;
  totalSales: number;
  lowStockItems: number;
  totalInventoryValue: number;
}

export enum StockMovementType {
  IN = 'in',
  OUT = 'out',
  ADJUSTMENT = 'adjustment'
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  quantity: number;
  timestamp: string;
  notes?: string;
  recordedBy: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  products: string[]; // Product IDs they supply
  pricePerBag: number;
  paymentTerms: string;
  createdAt: string;
  lastOrderDate?: string;
}

export enum POStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  CONFIRMED = 'confirmed',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  products: Array<{
    productId: string;
    productName: string;
    quantity: number;
    pricePerBag: number;
  }>;
  totalAmount: number;
  status: POStatus;
  orderDate: string;
  expectedDeliveryDate: string;
  actualDeliveryDate?: string;
  notes?: string;
  createdBy: string;
}

export interface Report {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  generatedAt: string;
  startDate: string;
  endDate: string;
  totalSales: number;
  totalRevenue: number;
  totalStockIn: number;
  totalStockOut: number;
  lowStockProducts: Product[];
  topProducts: Array<{ productId: string; productName: string; quantity: number }>;
}
