import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface FacturaRequest {
  id?: string;
  restaurant_id: string;
  order_id: string;
  cliente_rfc: string;
  cliente_nombre: string;
  cliente_regimen: string;
  cliente_uso_cfdi: string;
  cliente_correo: string;
  constancia_url?: string;
  monto_total: number;
  estado?: 'pendiente' | 'facturada' | 'rechazada';
  created_at?: string;
}

export function useFacturas() {
  const [isLoading, setIsLoading] = useState(false);

  const requestInvoice = async (facturaData: FacturaRequest) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('facturas')
        .insert([{
          restaurant_id: facturaData.restaurant_id,
          order_id: facturaData.order_id,
          cliente_rfc: facturaData.cliente_rfc,
          cliente_nombre: facturaData.cliente_nombre,
          cliente_regimen: facturaData.cliente_regimen,
          cliente_uso_cfdi: facturaData.cliente_uso_cfdi,
          cliente_correo: facturaData.cliente_correo,
          constancia_url: facturaData.constancia_url,
          monto_total: facturaData.monto_total,
          estado: 'pendiente'
        }])
        .select()
        .single();
        
      if (error) {
        if (error.code === '23505') {
            throw new Error("Ya existe una solicitud de factura para este pedido.");
        }
        throw error;
      }
      return data;
    } catch (error: any) {
      console.error('Error requesting invoice:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getFacturasByRestaurant = async (restaurantId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('facturas')
        .select(`
            *,
            ordenes!inner (
                id,
                mesa_nombre,
                items,
                total
            )
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const updateFacturaStatus = async (id: string, status: 'facturada' | 'rechazada' | 'pendiente') => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('facturas')
        .update({ estado: status })
        .eq('id', id)
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating invoice status:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    requestInvoice,
    getFacturasByRestaurant,
    updateFacturaStatus
  };
}
