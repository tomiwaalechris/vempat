
import { FeedType, Product } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    brand: 'Vital Feed',
    type: FeedType.STARTER,
    particleSize: '2mm',
    proteinPercent: 42,
    weightKg: 15,
    pricePerBag: 18500,
    stock: 50,
    minStockThreshold: 10
  },
  {
    id: '2',
    brand: 'Top Feed',
    type: FeedType.GROWER,
    particleSize: '4mm',
    proteinPercent: 38,
    weightKg: 15,
    pricePerBag: 17200,
    stock: 60,
    minStockThreshold: 15
  },
  {
    id: '3',
    brand: 'Blue Crown',
    type: FeedType.FINISHER,
    particleSize: '6mm',
    proteinPercent: 35,
    weightKg: 15,
    pricePerBag: 16800,
    stock: 8,
    minStockThreshold: 10
  },
  {
    id: '4',
    brand: 'Vempat Gold',
    type: FeedType.NURSERY,
    particleSize: '0.5mm',
    proteinPercent: 45,
    weightKg: 5,
    pricePerBag: 9500,
    stock: 100,
    minStockThreshold: 20
  }
];

export const APP_THEME = {
  primary: 'sky-600',
  secondary: 'blue-900',
  accent: 'cyan-500',
  currency: '₦'
};

// Secret code for registering a Super Admin via hidden registration page.
// Change this to a strong secret in production or load from env.
export const SECRET_SUPERADMIN_CODE = 'let-me-in-super-admin-2025';
