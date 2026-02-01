import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi } from '@/lib/api';

interface User {
  id: string;
  email: string;
  company: string; // Company ID
  role: 'owner' | 'admin' | 'user' | 'viewer';
  userType: number;
  isActive: boolean;
  profile: {
    name: string;
    company: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone: string;
    mobile: string;
    web: string;
    vatId: string;
    taxCode: string;
  };
  bankDetails: {
    bank: string;
    iban: string;
    bic: string;
  };
  settings: {
    language: string;
    allClients: boolean;
  };
}

interface Company {
  id: string;
  name: string;
  slug: string;
  logo: string;
  email?: string;
  phone?: string;
  address?: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  taxInfo?: {
    gstin: string;
    pan: string;
  };
  bankDetails?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    ifsc: string;
  };
  settings: {
    currencySymbol: string;
    currencyCode: string;
    dateFormat: string;
    invoiceFooter: string;
  };
  branding: {
    primaryColor: string;
    accentColor: string;
  };
  subscription?: {
    plan: string;
    status: string;
  };
}

interface AuthState {
  user: User | null;
  company: Company | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  setToken: (token: string | null) => void;
  setCompany: (company: Company | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      company: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authApi.login(email, password);
          
          if (data.success) {
            set({
              user: data.user,
              company: data.company,
              token: data.token,
              isAuthenticated: true,
              isLoading: false,
            });
            
            return true;
          } else {
            set({ error: data.message, isLoading: false });
            return false;
          }
        } catch (error: any) {
          const message = error.response?.data?.message || 'Login failed';
          set({ error: message, isLoading: false });
          return false;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          // Continue with logout even if API call fails
        }
        
        set({
          user: null,
          company: null,
          token: null,
          isAuthenticated: false,
        });
      },

      fetchUser: async () => {
        const { token, isLoading } = get();
        
        // Prevent duplicate fetches and fetching without token
        if (!token || isLoading) return;
        
        set({ isLoading: true });
        try {
          const { data } = await authApi.getMe();
          if (data.success) {
            set({ 
              user: data.data, 
              company: data.data.company,
              isAuthenticated: true, 
              isLoading: false 
            });
          } else {
            // API returned success: false
            set({ isLoading: false });
          }
        } catch (error: any) {
          // Only clear auth on actual auth errors, not network errors
          if (error?.response?.status === 401) {
            set({ user: null, company: null, isAuthenticated: false, token: null, isLoading: false });
          } else {
            // Network error or other - keep auth state, just stop loading
            set({ isLoading: false });
          }
        }
      },

      updateUser: async (userData) => {
        try {
          const { data } = await authApi.updateMe(userData);
          if (data.success) {
            set({ user: data.data });
          }
        } catch (error: any) {
          throw new Error(error.response?.data?.message || 'Update failed');
        }
      },

      setToken: (token) => {
        set({ token, isAuthenticated: !!token });
      },

      setCompany: (company) => {
        set({ company });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        company: state.company,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
