
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
