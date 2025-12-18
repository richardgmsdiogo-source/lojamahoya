export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  description: string;
  scentNotes: string;
  price: number;
  sizes: ProductSize[];
  scentFamily: ScentFamily;
  image: string;
  howToUse?: string;
  ritualSuggestion?: string;
}

export interface ProductSize {
  id: string;
  label: string;
  price: number;
}

export type ProductCategory = 
  | 'home-spray' 
  | 'agua-lencois' 
  | 'velas' 
  | 'sabonetes' 
  | 'kits' 
  | 'outros';

export type ScentFamily = 
  | 'citrico' 
  | 'floral' 
  | 'amadeirado' 
  | 'doce' 
  | 'herbal';

export interface CartItem {
  product: Product;
  selectedSize: ProductSize;
  quantity: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  preferences?: string;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  notes?: string;
  createdAt: Date;
  status: 'pending' | 'sent' | 'completed';
}
