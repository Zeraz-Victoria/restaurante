"use client";

import { useState, useEffect } from "react";
import {
  Search,
  ShoppingCart,
  Bell,
  ChevronRight,
  Plus,
  Minus,
  Flame,
  Utensils,
  ReceiptText,
  HelpCircle,
  CheckCircle2,
  Clock,
  Star,
  Banknote,
  CreditCard,
  Building2,
  ShoppingBag,
  X
} from "lucide-react";
import Image from "next/image";
import { useOrders } from "@/hooks/useOrders";
import { useProducts, Product } from "@/hooks/useProducts";
import { useTables } from "@/hooks/useTables";
import { useNotifications, NotificationType } from "@/hooks/useNotifications";
import { useReviews } from "@/hooks/useReviews";
import { useFacturas } from "@/hooks/useFacturas";

// --- Obsolete Mock Data Removed ---

type CartItem = {
  id: string; // unique ID for the cart instance
  productId: string;
  product: Product;
  quantity: number;
  selectedOptions: Record<string, string>;
  selectedExtras: string[];
  note: string;
};

// --- Main Application ---
export default function ClientMobileApp() {
  const { products, categorias, loading: productsLoading } = useProducts();
  const { tables, updateTableStatus } = useTables();
  const activeTables = tables.filter((t: any) => t.estado !== 'libre');
  const [activeTab, setActiveTab] = useState('menu'); // menu, cart, tracking
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("virtual_populares");

  // Detailed Product Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [tempOptions, setTempOptions] = useState<Record<string, string>>({});
  const [tempExtras, setTempExtras] = useState<string[]>([]);
  const [tempQuantity, setTempQuantity] = useState(1);
  const [tempNote, setTempNote] = useState("");

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [hasPreviousOrder, setHasPreviousOrder] = useState(false);

  // Supabase Hooks
  const { insertOrder } = useOrders();
  const { sendNotification } = useNotifications();
  const { addReview } = useReviews();
  const { requestInvoice } = useFacturas();

  // Invoice Modal State
  const [isFacturaOpen, setIsFacturaOpen] = useState(false);
  const [facturaData, setFacturaData] = useState({
    rfc: '',
    nombre: '',
    regimen: '',
    uso_cfdi: '',
    correo: ''
  });
  const [isFacturando, setIsFacturando] = useState(false);

  // Realtime order tracking for Client — listens for status changes from Kitchen
  useEffect(() => {
    const { supabase } = require('@/lib/supabase/client');
    const channel = supabase
      .channel('client-order-tracking')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ordenes' }, (payload: any) => {
        const updated = payload.new;
        setActiveOrders(prev => prev.map(o =>
          o.id === updated.id ? { ...o, status: updated.estado } : o
        ));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Review System State
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewScore, setReviewScore] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [showHelpInput, setShowHelpInput] = useState(false);
  const [helpText, setHelpText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Order Tracking State
  type OrderProgress = { id: string, name: string, status: 'pendiente' | 'cocinando' | 'listo' | 'entregado', total: number, restaurant_id?: string };
  const [activeOrders, setActiveOrders] = useState<OrderProgress[]>([]);

  // Table Session State
  const [tableId, setTableId] = useState<string>("unknown");
  const [mesaNum, setMesaNum] = useState<string>("?");

  // Order Logistics State
  const [orderType, setOrderType] = useState<'local' | 'llevar'>('local');
  const [pickupTime, setPickupTime] = useState<string>('En 15 minutos');

  const currentTable = tables.find((t: any) => t.id === tableId);

  // Review Trigger Detection
  useEffect(() => {
    // If the table was freed and we actually ate here, prompt review
    if (currentTable?.estado === 'libre' && hasPreviousOrder) {
      setIsReviewOpen(true);
    }
  }, [currentTable?.estado, hasPreviousOrder]);



  // Handle URL Params for QR Scanning
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tId = params.get('table');
      const mNum = params.get('mesaNum');

      if (tId && mNum) {
        setTableId(tId);
        setMesaNum(mNum);
        localStorage.setItem('resto_session_table', tId);
        localStorage.setItem('resto_session_mesa_num', mNum);

        // Clean the URL so refreshing doesn't re-trigger initial state logic
        window.history.replaceState({}, document.title, window.location.pathname);

        // Update table status to indicate they are looking at the menu
        updateTableStatus(tId, 'mirando_menu').catch(console.error);
      } else {
        const savedTId = localStorage.getItem('resto_session_table');
        const savedMNum = localStorage.getItem('resto_session_mesa_num');
        if (savedTId) setTableId(savedTId);
        if (savedMNum) setMesaNum(savedMNum);
      }
    }
  }, []);

  // LocalStorage Persistence
  useEffect(() => {
    const savedCart = localStorage.getItem("resto_cart");
    const savedOrders = localStorage.getItem("resto_active_orders");
    const savedPrevious = localStorage.getItem("resto_has_previous_order");

    if (savedCart) setCart(JSON.parse(savedCart));
    if (savedPrevious === "true") setHasPreviousOrder(true);
    if (savedOrders) {
      try {
        const parsed = JSON.parse(savedOrders);
        // Filter out completed/delivered orders on reload to keep it clean
        setActiveOrders(parsed.filter((o: OrderProgress) => o.status !== 'entregado'));
      } catch (e) {
        setActiveOrders([]);
      }
    }

    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (hasHydrated) {
      localStorage.setItem("resto_cart", JSON.stringify(cart));
      localStorage.setItem("resto_active_orders", JSON.stringify(activeOrders));
      localStorage.setItem("resto_has_previous_order", String(hasPreviousOrder));
    }
  }, [cart, activeOrders, hasHydrated, hasPreviousOrder]);

  // Set initial active category once categories are loaded
  // No longer needed because we default to 'virtual_populares', but we keep empty array dep.
  useEffect(() => {
  }, []);

  // Helpers
  const cartTotal = cart.reduce((total, item) => {
    let base = item.product.discount_price ? item.product.discount_price : item.product.price;

    // Override base price if a size was selected
    if (item.selectedOptions._size && item.product.sizes) {
      const sizeObj = item.product.sizes.find(s => s.name === item.selectedOptions._size);
      if (sizeObj) base = sizeObj.price;
    }

    item.selectedExtras.forEach((extName: string) => {
      const extPrice = item.product.extras?.find((e: any) => e.name === extName)?.price || 0;
      base += extPrice;
    });
    return total + (base * item.quantity);
  }, 0);

  const cartCount = cart.reduce((acc, current) => acc + current.quantity, 0);

  // Actions
  const openProductModal = (product: Product) => {
    setSelectedProduct(product);
    setTempOptions({});
    setTempExtras([]);
    setTempQuantity(1);
    setTempNote("");

    // Auto-select first choice for mandatory options
    if (product.options) {
      const initialOpts: Record<string, string> = {};
      product.options.forEach((opt: any) => {
        if (opt.choices.length > 0) initialOpts[opt.name] = opt.choices[0];
      });
      setTempOptions(initialOpts);
    }

    // Auto-select first size if available, or just set it based on the first item
    if (product.sizes && product.sizes.length > 0) {
      setTempOptions(prev => ({ ...prev, _size: product.sizes![0].name }));
    } else {
      // If no sizes, we don't need a _size option
      setTempOptions(prev => {
        const next = { ...prev };
        delete next._size;
        return next;
      });
    }

    // Auto-add "Momento de Entrega" for Drinks
    const isDrink = categorias.find(c => c.id === product.category_id)?.name.toLowerCase().includes('bebida');
    if (isDrink) {
      setTempOptions(prev => ({ ...prev, 'Momento de Entrega': 'Lo antes posible' }));
    } else {
      setTempOptions(prev => {
        const next = { ...prev };
        delete next['Momento de Entrega'];
        return next;
      });
    }
  };

  const addToCart = () => {
    if (!selectedProduct) return;
    const newItem: CartItem = {
      id: Math.random().toString(36).substring(7),
      productId: selectedProduct.id,
      product: selectedProduct,
      quantity: tempQuantity,
      selectedOptions: tempOptions,
      selectedExtras: tempExtras,
      note: tempNote
    };
    setCart([...cart, newItem]);
    setSelectedProduct(null);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const placeOrder = async () => {
    if (cart.length === 0 || isSubmitting) return;

    // Check if table session exists for dine-in
    if (orderType === 'local' && tableId === "unknown") {
      alert("Por favor escanea el código QR de tu mesa antes de ordenar para comer aquí.");
      return;
    }

    setIsSubmitting(true);
    try {
      const isLlevar = orderType === 'llevar';
      const orderData = {
        mesa_id: isLlevar ? 'llevar_web' : tableId,
        mesa_nombre: isLlevar ? `PARA RECOGER (${pickupTime})` : `Mesa ${mesaNum}`,
        items: cart.map(item => ({
          id: item.id,
          name: item.product.name,
          quantity: item.quantity,
          modifiers: [
            ...Object.values(item.selectedOptions),
            ...item.selectedExtras,
            ...(item.note ? [`Nota: ${item.note}`] : [])
          ],
          status: 'pending'
        })),
        total: cartTotal,
        estado: 'pendiente' as const,
        is_addition: hasPreviousOrder,
      };

      const newOrder = await insertOrder(orderData);

      // 4. Update UI State for ongoing experience
      const newOrderId = (newOrder as any)?.id || (newOrder as any)?.[0]?.id || Math.random().toString(36).substr(2, 9);
      const orderTitle = cart.length === 1 ? cart[0].product.name : `${cart.length} Productos`;

      setCart([]); // Clean cart
      setActiveTab('tracking'); // Send user to tracking tab

      // --- Connect to Tables Logic ---
      // Set to esperando_comida whenever a new order is received
      await updateTableStatus(tableId, 'esperando_comida');

      // Add to active orders array
      setActiveOrders(prev => [...prev, { 
        id: newOrderId, 
        name: orderTitle, 
        status: 'pendiente', 
        total: cartTotal,
        restaurant_id: (newOrder as any)?.restaurant_id || 'default_tenant'
      }]);

      // Always flag that this table has an active session from now on
      setHasPreviousOrder(true);
    } catch (e) {
      console.error("Error setting table active status or inserting order", e);
      alert("Hubo un error al procesar tu orden. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearSessionAndExit = () => {
    // Clear Local Session
    localStorage.removeItem('resto_session_table');
    localStorage.removeItem('resto_session_mesa_num');
    localStorage.removeItem('resto_has_previous_order');
    localStorage.removeItem('resto_active_orders');
    localStorage.removeItem('resto_cart');

    setIsReviewOpen(false);
    setHasPreviousOrder(false);
    setTableId("unknown");
    setMesaNum("?");
    setActiveOrders([]);
    setCart([]);

    // Hard refresh to reset the session view completely
    window.location.replace('/');
  };

  // Handle Review Submission
  const handleReviewSubmit = async () => {
    if (reviewScore > 0) {
      await addReview(tableId, reviewScore, reviewText);
    }
    clearSessionAndExit();
  };

  const handleWaiterCall = async (type: 'pago' | 'cubiertos' | 'ayuda', label: string) => {
    if (tableId === "unknown") {
      alert("Por favor escanea el código QR de tu mesa primero.");
      return;
    }

    // Create Waiter Notification (using the actual table ID)
    await sendNotification({
      tipo: type,
      mesa_id: tableId,
      mensaje: `Mesa ${mesaNum} solicitó: ${label}`,
      leido: false
    });
    alert('Mesero notificado con éxito');
  };

  // --- Sub-components (Inline for single-file artifact) ---
  return (
    <div className="min-h-[100dvh] bg-gray-50 flex justify-center selection:bg-orange-200">
      {/* Mobile App Container (Constrained width for desktop preview) */}
      <div className="w-full max-w-md bg-white shadow-2xl relative flex flex-col h-[100dvh] overflow-hidden">

        {/* --- HEADER --- */}
        <header className="p-4 bg-white border-b z-50 sticky top-0 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-50 border border-orange-100 flex flex-col items-center justify-center shadow-sm shrink-0">
              <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest leading-none mb-0.5">Mesa</span>
              <span className="text-lg font-black text-orange-500 leading-none">{mesaNum}</span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">BIENVENIDO AL</p>
              <h1 className="text-xl font-black leading-none tracking-tight text-gray-900">Menú Digital</h1>
            </div>
          </div>
          {/* Waiter Assistant Button */}
          <div className="bg-orange-50 hover:bg-orange-100 text-orange-600 p-2 rounded-full transition-colors relative group cursor-pointer" tabIndex={0}>
            <Bell className="w-6 h-6" />
            {/* Tooltip/Menu (Simplified for demo) */}
            <div className="absolute right-0 top-12 bg-white shadow-xl rounded-xl p-2 hidden group-focus-within:block border w-64 z-50 cursor-default">
              <p className="text-xs font-bold text-gray-500 mb-2 px-2 uppercase">Llamar Mesero</p>

              <p className="text-[10px] font-bold text-gray-400 mb-1 px-2 uppercase mt-2">Pedir la Cuenta</p>
              <button onMouseDown={() => handleWaiterCall('pago', 'Cuenta (Efectivo)')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded font-medium flex gap-2 mb-1"><Banknote className="w-4 h-4" /> Pago en Efectivo</button>
              <button onMouseDown={() => handleWaiterCall('pago', 'Cuenta (Tarjeta)')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded font-medium flex gap-2 mb-2"><CreditCard className="w-4 h-4" /> Pago con Tarjeta</button>

              <div className="h-px bg-gray-100 my-2"></div>

              {!showHelpInput ? (
                <button onMouseDown={(e) => { e.preventDefault(); setShowHelpInput(true); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded font-medium flex gap-2"><HelpCircle className="w-4 h-4" /> Ayuda General</button>
              ) : (
                <div className="px-2 pb-2">
                  <input type="text" value={helpText} onChange={e => setHelpText(e.target.value)} placeholder="Ej. Servilletas, hielo, salsa..." className="w-full border border-gray-200 outline-none p-2 mb-2 rounded text-sm bg-gray-50" />
                  <div className="flex gap-2">
                    <button onMouseDown={() => { handleWaiterCall('ayuda', helpText || 'Asistencia general'); setShowHelpInput(false); setHelpText(''); }} className="flex-1 bg-orange-500 text-white rounded py-1 text-sm font-bold">Enviar</button>
                    <button onMouseDown={(e) => { e.preventDefault(); setShowHelpInput(false); }} className="flex-1 bg-gray-200 text-gray-700 rounded py-1 text-sm font-bold hover:bg-gray-300">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* --- MAIN SCROLLABLE CONTENT --- */}
        <main className="flex-1 overflow-y-auto pb-24 relative bg-gray-50">

          {/* Loader */}
          {productsLoading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500"></div>
                <p className="text-lg font-semibold text-gray-700">Cargando menú...</p>
              </div>
            </div>
          )}

          {/* TAB: MENU */}
          {activeTab === 'menu' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Search */}
              <div className="p-4 bg-white sticky top-0 z-20 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar platillos, ingredientes, bebidas..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Categories (Horizontal Scroll) */}
              <div className="px-4 py-3 bg-white border-b border-gray-100 overflow-x-auto whitespace-nowrap hide-scrollbar flex gap-2 sticky top-[72px] z-10 shadow-sm">
                {/* Virtual Category: Populares */}
                <button
                  onClick={() => setActiveCategory('virtual_populares')}
                  className={`px-5 py-2 rounded-full font-bold text-sm transition-all shadow-sm ${activeCategory === 'virtual_populares'
                    ? "bg-black text-white scale-105"
                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                >
                  🔥 Populares
                </button>

                {/* Virtual Category: Promos */}
                {products.some(p => p.discount_price) && (
                  <button
                    onClick={() => setActiveCategory('virtual_promos')}
                    className={`px-5 py-2 rounded-full font-bold text-sm transition-all shadow-sm ${activeCategory === 'virtual_promos'
                      ? "bg-black text-white scale-105"
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                      }`}
                  >
                    💎 Promos
                  </button>
                )}

                {categorias.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-5 py-2 rounded-full font-bold text-sm transition-all shadow-sm ${activeCategory === cat.id
                      ? "bg-black text-white scale-105"
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                      }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Hero Carousel: Recomendaciones del Chef */}
              {activeCategory === 'virtual_populares' && products.filter(p => p.is_recommended).length > 0 && !searchQuery && (
                <div className="pt-6 pb-2 bg-white">
                  <h2 className="px-4 font-black text-xl mb-4 flex items-center gap-2">
                    <Star className="w-6 h-6 text-orange-500" fill="currentColor" /> Recomendaciones
                  </h2>
                  <div className="flex gap-4 overflow-x-auto px-4 pb-6 snap-x snap-mandatory hide-scrollbar">
                    {products.filter(p => p.is_recommended).map(product => (
                      <div
                        key={`rec-${product.id}`}
                        onClick={() => openProductModal(product)}
                        className="min-w-[280px] max-w-[300px] bg-white rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.08)] snap-center cursor-pointer active:scale-95 transition-transform border border-black/5"
                      >
                        <div className="h-44 bg-gray-100 relative">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Utensils className="w-12 h-12 text-gray-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                          )}
                          <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-white text-[10px] uppercase font-black tracking-widest px-3 py-1.5 rounded-xl border border-white/10">Chef&apos;s Pick</div>
                        </div>
                        <div className="p-5">
                          <h3 className="font-black text-gray-900 text-xl truncate mb-1">{product.name}</h3>
                          <p className="text-gray-500 text-sm truncate mb-3">{product.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {product.discount_price ? (
                                <>
                                  <span className="font-black text-orange-600 text-xl">${product.discount_price}</span>
                                  <span className="text-gray-400 text-sm line-through font-bold">${product.price}</span>
                                </>
                              ) : (
                                <span className="font-black text-gray-900 text-xl">${product.price}</span>
                              )}
                            </div>
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-900">
                              <Plus className="w-5 h-5" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Product List */}
              <div className="flex flex-col bg-white">
                <div className="px-4 py-4 sticky top-[132px] z-10 bg-white/95 backdrop-blur-md border-b border-gray-100">
                  <h2 className="font-black text-2xl text-gray-900">
                    {searchQuery ? 'Resultados' :
                      activeCategory === 'virtual_populares' ? 'Populares y Recomendados' :
                        activeCategory === 'virtual_promos' ? 'Promociones Especiales' :
                          categorias.find(c => c.id === activeCategory)?.name || 'Menú'}
                  </h2>
                </div>

                <div className="flex flex-col px-4 pt-2 pb-6">
                  {products
                    .filter((p) => {
                      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
                      if (searchQuery) return matchesSearch;

                      if (activeCategory === 'virtual_populares') {
                        return p.isPopular || p.is_recommended;
                      }

                      if (activeCategory === 'virtual_promos') {
                        return !!p.discount_price;
                      }

                      return p.category_id === activeCategory;
                    })
                    .map((product) => (
                      <div
                        key={product.id}
                        onClick={() => openProductModal(product)}
                        className="bg-white group cursor-pointer active:bg-gray-50 transition-colors py-5 border-b border-gray-100 last:border-0"
                      >
                        <div className="flex gap-4 justify-between h-[120px]">
                          <div className="flex-1 flex flex-col justify-between overflow-hidden">
                            <div>
                              <h3 className="font-bold text-gray-900 text-lg leading-tight truncate">{product.name}</h3>
                              <p className="text-sm text-gray-500 line-clamp-2 mt-1 pr-2 leading-relaxed">{product.description}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              {product.discount_price ? (
                                <>
                                  <span className="font-black text-orange-600 text-lg">${product.discount_price}</span>
                                  <span className="text-gray-400 text-xs line-through font-bold">${product.price}</span>
                                  <span className="bg-orange-100 text-orange-600 text-[10px] uppercase font-black px-2 py-0.5 rounded-md">Promo</span>
                                </>
                              ) : (
                                <span className="font-black text-gray-900 text-lg">${product.price}</span>
                              )}
                              {product.isPopular && !product.discount_price && (
                                <span className="bg-amber-100 text-amber-700 text-[10px] uppercase font-black px-2 py-0.5 rounded-md flex items-center gap-1"><Flame className="w-3 h-3" /> Top</span>
                              )}
                            </div>
                          </div>

                          <div className="w-[120px] h-full relative rounded-2xl overflow-hidden shrink-0 bg-gray-50 shadow-sm border border-black/[0.03]">
                            {product.image_url ?
                              <img src={product.image_url} alt={product.name} className="object-cover w-full h-full scale-100 group-hover:scale-105 transition-transform duration-500 ease-out" />
                              : <Utensils className="w-8 h-8 text-gray-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            }
                            <div className="absolute bottom-2 right-2 bg-white rounded-full p-1.5 shadow-md">
                              <Plus className="w-4 h-4 text-black" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: CART */}
          {activeTab === 'cart' && (
            <div className="p-4 animate-in fade-in slide-in-from-right-8 duration-300">
              <h2 className="text-2xl font-black mb-6">Tu Pedido</h2>

              {cart.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No has agregado nada aún.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Items */}
                  {cart.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
                      <div className="w-8 flex flex-col items-center justify-between bg-gray-50 rounded-full py-1">
                        <span className="text-sm font-black">{item.quantity}x</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <h4 className="font-bold text-gray-900">{item.product.name}</h4>
                          <span className="font-bold">${item.product.price * item.quantity}</span>
                        </div>

                        {/* Options & Extras Summary */}
                        <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                          {Object.entries(item.selectedOptions).map(([k, v]) => (
                            <p key={k}>• {v}</p>
                          ))}
                          {item.selectedExtras.map(ext => (
                            <p key={ext} className="text-orange-600">• + {ext}</p>
                          ))}
                          {item.note && <p className="italic mt-1 text-gray-400">&quot;{item.note}&quot;</p>}
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-red-400 self-start p-1 hover:bg-red-50 rounded">
                        <Minus className="w-5 h-5" />
                      </button>
                    </div>
                  ))}

                  <div className="pt-6 pb-12 sm:pb-6">
                    {/* Order Type Selector */}
                    <div className="bg-gray-50 p-4 rounded-2xl mb-6 border border-gray-100">
                      <h4 className="font-bold text-sm mb-3">¿Para comer aquí o llevar?</h4>
                      <div className="flex gap-2 mb-4">
                        <button
                          onClick={() => setOrderType('local')}
                          className={`flex-1 py-3 px-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors border ${orderType === 'local' ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-600 border-gray-200'}`}
                        >
                          <Building2 className="w-4 h-4" /> Comer Aquí
                        </button>
                        <button
                          onClick={() => setOrderType('llevar')}
                          className={`flex-1 py-3 px-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors border ${orderType === 'llevar' ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-600 border-gray-200'}`}
                        >
                          <ShoppingBag className="w-4 h-4" /> Para Llevar
                        </button>
                      </div>

                      {orderType === 'llevar' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                          <h4 className="font-bold text-sm mb-2">Horario de Recogida</h4>
                          <select
                            value={pickupTime}
                            onChange={(e) => setPickupTime(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                          >
                            <option value="Lo antes posible">Lo antes posible</option>
                            <option value="En 15 minutos">En 15 minutos</option>
                            <option value="En 30 minutos">En 30 minutos</option>
                            <option value="En 45 minutos">En 45 minutos</option>
                            <option value="En 1 hora">En 1 hora</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={placeOrder}
                      disabled={isSubmitting}
                      className="w-full bg-black hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-black text-lg flex justify-between px-6 shadow-xl active:scale-[0.98] transition-all"
                    >
                      <span>{isSubmitting ? "Procesando..." : "Enviar a Cocina"}</span>
                      <span>${cartTotal}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: TRACKING */}
          {activeTab === 'tracking' && (
            <div className="p-6 h-full flex flex-col animate-in fade-in zoom-in-95 duration-500 overflow-y-auto pb-32">
              <div className="flex justify-between items-center mb-8 pt-8">
                 <h2 className="text-2xl font-black">Mis Pedidos</h2>
              </div>

              {activeOrders.filter(o => o.status !== 'entregado').length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No hay pedidos en preparación.</p>
                </div>
              ) : (
                <div className="space-y-12">
                  {activeOrders.filter(o => o.status !== 'entregado').map((order, idx) => (
                    <div key={order.id} className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100">
                      <h3 className="font-black text-xl mb-6 text-gray-900 border-b pb-4">Tanda {idx + 1}: {order.name}</h3>
                      <div className="relative">
                        {/* Vertical Line */}
                        <div className="absolute left-[20px] top-4 bottom-12 w-1 bg-gray-200 rounded-full"></div>
                        {/* Active Line */}
                        <div className={`absolute left-[20px] top-4 w-1 bg-green-500 rounded-full transition-all duration-1000 ease-in-out ${order.status === 'pendiente' ? 'h-1/3' :
                          order.status === 'cocinando' ? 'h-2/3' : 'h-full'
                          }`}></div>

                        {/* Nodes */}
                        <div className="space-y-12 relative">
                          <TrackingStep
                            active={order.status === 'pendiente' || order.status === 'cocinando' || order.status === 'listo'}
                            icon={<CheckCircle2 className="w-5 h-5" />}
                            title="Orden Recibida"
                            desc="La cocina ha confirmado tu pedido."
                          />
                          <TrackingStep
                            active={order.status === 'cocinando' || order.status === 'listo'}
                            icon={<Flame className="w-5 h-5" />}
                            title="Preparando"
                            desc="Tus platillos están en el fuego."
                          />
                          <TrackingStep
                            active={order.status === 'listo'}
                            icon={<Utensils className="w-5 h-5" />}
                            title="¡Listo para servir!"
                            desc="El mesero va en camino a tu mesa."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>

        {/* --- BOTTOM NAVIGATION BAR --- */}
        <nav className="absolute bottom-0 w-full bg-white border-t pb-safe pt-2 px-6 flex justify-between items-center h-20 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40">
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'menu' ? 'text-black' : 'text-gray-400'}`}
          >
            <Utensils className="w-6 h-6" />
            <span className="text-[10px] font-black uppercase tracking-widest">Menú</span>
          </button>

          {activeOrders.filter(o => o.status !== 'entregado').length > 0 && (
            <button
              onClick={() => setActiveTab('tracking')}
              className={`flex flex-col items-center gap-1 transition-colors relative ${activeTab === 'tracking' ? 'text-blue-600' : 'text-gray-400'}`}
            >
              <Clock className="w-6 h-6" />
              <span className="text-[10px] font-black uppercase tracking-widest">Estatus</span>
              {/* Blinking dot if any order is cooking */}
              {activeOrders.some(o => o.status === 'cocinando') && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white animate-pulse"></span>}
              {/* Badge for multiple active orders */}
              {activeOrders.filter(o => o.status !== 'entregado').length > 1 && (
                <span className="absolute -top-1 -right-2 bg-blue-600 text-white text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                  {activeOrders.filter(o => o.status !== 'entregado').length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setActiveTab('cart')}
            className={`flex flex-col items-center gap-1 transition-colors relative ${activeTab === 'cart' ? 'text-orange-500' : 'text-gray-400'}`}
          >
            <ShoppingCart className="w-6 h-6" />
            <span className="text-[10px] font-black uppercase tracking-widest">Carrito</span>
            {/* Cart Badge */}
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-orange-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                {cartCount}
              </span>
            )}
          </button>
        </nav>

        {/* --- PRODUCT DETAIL MODAL (Wolt/Uber Style) --- */}
        {selectedProduct && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center animate-in fade-in duration-300">
            {/* Backdrop */}
            <div className="absolute inset-0" onClick={() => setSelectedProduct(null)}></div>

            {/* Sheet Content */}
            <div className="bg-[#f9fafb] w-full rounded-t-[2.5rem] h-[92vh] overflow-hidden flex flex-col shadow-[0_-10px_50px_rgba(0,0,0,0.15)] relative z-10 slide-in-from-bottom-full mt-auto mb-0 duration-500 ease-out">

              {/* Floating Close Button */}
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 left-4 bg-white/80 backdrop-blur-md rounded-full p-2.5 text-gray-900 shadow-sm z-20 hover:bg-white active:scale-95 transition-all"
              >
                <ChevronRight className="w-6 h-6 rotate-180" />
              </button>

              <button
                onClick={() => setActiveTab('cart')}
                className="absolute top-4 right-4 bg-white/80 backdrop-blur-md rounded-full p-2.5 text-gray-900 shadow-sm z-20 hover:bg-white active:scale-95 transition-all"
              >
                <ShoppingCart className="w-6 h-6" />
                {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full">{cartCount}</span>}
              </button>

              <div className="relative h-[35vh] w-full bg-gray-200 flex-shrink-0 flex items-center justify-center">
                {selectedProduct.image_url ?
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                  : <Utensils className="w-16 h-16 text-gray-400 opacity-50" />
                }
                {/* Gradient overlay for smooth transition */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#f9fafb] via-transparent to-transparent opacity-100"></div>
              </div>

              {/* Scrollable details */}
              <div className="px-6 pb-6 overflow-y-auto flex-1 bg-[#f9fafb] text-gray-900 relative -mt-10 rounded-t-[2.5rem] z-10">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6"></div>

                <h2 className="text-3xl font-black leading-tight text-center">{selectedProduct.name}</h2>
                <p className="text-gray-500 mt-3 leading-relaxed text-center max-w-sm mx-auto">{selectedProduct.description}</p>

                {/* Dynamically update the main price based on selected size or base price */}
                <div className="flex items-center justify-center gap-3 mt-4">
                  {selectedProduct.sizes && selectedProduct.sizes.length > 0 ? (
                    (() => {
                      const selectedSizeObj = selectedProduct.sizes?.find(s => s.name === tempOptions._size) || selectedProduct.sizes[0];
                      return <p className="text-3xl font-black text-gray-900">${selectedSizeObj.price}</p>;
                    })()
                  ) : (
                    selectedProduct.discount_price ? (
                      <>
                        <p className="text-3xl font-black text-gray-900">${selectedProduct.discount_price}</p>
                        <p className="text-xl font-bold text-gray-400 line-through">${selectedProduct.price}</p>
                      </>
                    ) : (
                      <p className="text-3xl font-black text-gray-900">${selectedProduct.price}</p>
                    )
                  )}
                </div>

                <div className="space-y-6 mt-8">
                  {/* Sizes (Porciones) */}
                  {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-bold mb-4 text-base text-gray-900">Tamaño</h4>
                      <div className="flex flex-wrap gap-3">
                        {selectedProduct.sizes.map((size) => (
                          <button
                            key={size.name}
                            onClick={() => setTempOptions({ ...tempOptions, _size: size.name })}
                            className={`px-3 py-3 rounded-2xl font-bold text-sm transition-all shadow-sm flex items-center justify-center flex-1 min-w-[110px] text-center border ${tempOptions._size === size.name
                                ? 'bg-black text-white border-black'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                              }`}
                          >
                            <span>{size.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Options (Radio Logic) */}
                  {selectedProduct.options?.map((opt: any) => (
                    <div key={opt.name} className="mt-6">
                      <h4 className="font-bold mb-3 text-base text-gray-900 flex justify-between items-center">
                        {opt.name} <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider">Requerido</span>
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {opt.choices.map((choice: string) => (
                          <label key={choice} className={`flex items-center justify-center p-3 rounded-2xl border cursor-pointer transition-colors text-sm font-bold flex-1 min-w-[100px] text-center ${tempOptions[opt.name] === choice
                              ? 'bg-black text-white border-black shadow-md'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                            }`}>
                            <input
                              type="radio"
                              name={opt.name}
                              value={choice}
                              checked={tempOptions[opt.name] === choice}
                              onChange={() => setTempOptions({ ...tempOptions, [opt.name]: choice })}
                              className="hidden"
                            />
                            <span>{choice}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Special Built-in Option: Drink Delivery Time */}
                  {categorias.find(c => c.id === selectedProduct.category_id)?.name.toLowerCase().includes('bebida') && (
                    <div className="mt-6">
                      <h4 className="font-bold mb-3 text-base text-gray-900 flex justify-between items-center">
                        Momento de Entrega <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider">Requerido</span>
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {['Lo antes posible', 'Junto con la comida'].map((choice: string) => (
                          <label key={choice} className={`flex items-center justify-center p-3 rounded-2xl border cursor-pointer transition-colors text-sm font-bold flex-1 min-w-[120px] text-center ${tempOptions['Momento de Entrega'] === choice
                              ? 'bg-black text-white border-black shadow-md'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                            }`}>
                            <input
                              type="radio"
                              name="momento_entrega"
                              value={choice}
                              checked={tempOptions['Momento de Entrega'] === choice}
                              onChange={() => setTempOptions({ ...tempOptions, 'Momento de Entrega': choice })}
                              className="hidden"
                            />
                            <span>{choice}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Extras (Checkbox Logic - Upselling) */}
                  {selectedProduct.extras && selectedProduct.extras.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-bold mb-3 text-base text-gray-900">
                        Extras
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedProduct.extras.map((extra: any) => {
                          const isSelected = tempExtras.includes(extra.name);
                          return (
                            <label key={extra.name} className={`flex flex-col items-center justify-center p-3 rounded-2xl border cursor-pointer transition-colors text-sm font-bold flex-1 min-w-[110px] text-center relative overflow-hidden ${isSelected
                                ? 'bg-black text-white border-black shadow-md'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                              }`}>
                              <span className="font-bold">{extra.name}</span>
                              <span className={isSelected ? "text-gray-300 text-xs mt-1" : "text-gray-500 text-xs mt-1"}>+${extra.price}</span>
                              {isSelected && <div className="absolute top-1 right-1"><CheckCircle2 className="w-3 h-3 text-white" /></div>}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (isSelected) setTempExtras(tempExtras.filter(x => x !== extra.name));
                                  else setTempExtras([...tempExtras, extra.name]);
                                }}
                                className="hidden"
                              >
                              </button>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Special Instructions */}
                  <div className="mt-6">
                    <h4 className="font-bold mb-3 text-base text-gray-900">Comentarios</h4>
                    <textarea
                      placeholder="Ej. Sin cebolla, aderezo aparte..."
                      value={tempNote}
                      onChange={e => setTempNote(e.target.value)}
                      className="w-full bg-white rounded-2xl p-4 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none h-24 placeholder:text-gray-400 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Add to Cart Actions */}
              <div className="bg-white p-4 pb-10 sm:pb-4 border-t border-gray-100 flex gap-4 items-center shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                {/* Quantity Picker */}
                <div className="flex items-center bg-gray-50 rounded-2xl p-1 shadow-inner">
                  <button
                    onClick={() => setTempQuantity(Math.max(1, tempQuantity - 1))}
                    className="w-12 h-12 flex items-center justify-center hover:bg-gray-200 rounded-xl transition-colors font-black text-xl text-gray-500"
                  >—</button>
                  <span className="w-8 text-center font-black text-xl">{tempQuantity}</span>
                  <button
                    onClick={() => setTempQuantity(tempQuantity + 1)}
                    className="w-12 h-12 flex items-center justify-center hover:bg-gray-200 rounded-xl transition-colors font-black text-xl text-gray-500"
                  >+</button>
                </div>

                <button
                  onClick={addToCart}
                  className="flex-1 bg-black hover:bg-gray-900 text-white py-4 rounded-2xl font-black text-lg shadow-[0_8px_20px_rgba(0,0,0,0.15)] active:scale-[0.98] transition-all flex justify-between px-6 items-center"
                >
                  <span>Agregar</span>
                  <span>
                    ${(() => {
                      let basePrice = selectedProduct.discount_price ? selectedProduct.discount_price : selectedProduct.price;
                      if (tempOptions._size && selectedProduct.sizes) {
                        const sz = selectedProduct.sizes.find(s => s.name === tempOptions._size);
                        if (sz) basePrice = sz.price;
                      }
                      let extrasTotal = 0;
                      tempExtras.forEach(extName => {
                        const extPrice = selectedProduct.extras?.find((e: any) => e.name === extName)?.price || 0;
                        extrasTotal += extPrice;
                      });
                      return (basePrice + extrasTotal) * tempQuantity;
                    })()}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- REVIEW MODAL --- */}
        {isReviewOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-[#111216] border border-white/10 rounded-3xl w-full max-w-md p-8 relative shadow-2xl flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mb-6">
                <Star className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-2xl font-black mb-2 text-white">¡Gracias por tu visita!</h3>
              <p className="text-gray-400 text-sm mb-6">Tu mesa ha sido liberada. ¿Cómo calificarías tu experiencia en RestoFlow hoy?</p>

              <div className="flex gap-2 mb-6 cursor-pointer">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setReviewScore(star)}
                    className={`transition-all ${reviewScore >= star ? 'text-orange-500 scale-110' : 'text-gray-600 hover:text-orange-300'}`}
                  >
                    <Star className="w-10 h-10" fill={reviewScore >= star ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>

              <textarea
                placeholder="Déjanos un comentario (opcional)..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors placeholder:text-gray-600 resize-none h-24 mb-6"
              />

              <button
                disabled={reviewScore === 0}
                onClick={handleReviewSubmit}
                className="w-full py-4 rounded-xl font-black text-lg bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-50 shadow-[0_0_20px_rgba(234,88,12,0.3)] transition-all mb-3"
              >
                Enviar y Finalizar
              </button>

              <button
                onClick={clearSessionAndExit}
                className="w-full py-3 rounded-xl font-bold text-sm bg-transparent border border-white/10 hover:bg-white/5 text-gray-400 transition-all font-mono"
              >
                Omitir Feedback
              </button>

              <div className="w-full mt-6 pt-6 border-t border-white/10 text-center">
                 <p className="text-gray-500 text-xs mb-3">¿Necesitas comprobante fiscal?</p>
                 <button 
                  onClick={() => setIsFacturaOpen(true)}
                  className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                 >
                   <ReceiptText className="w-4 h-4" /> Solicitar Factura
                 </button>
              </div>
            </div>
          </div>
        )}

        {/* --- FACTURA MODAL --- */}
        {isFacturaOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-[#111216] border border-white/10 rounded-3xl w-full max-w-md p-6 sm:p-8 relative shadow-2xl flex flex-col">
              <button 
                onClick={() => setIsFacturaOpen(false)} 
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-white/5 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <ReceiptText className="w-6 h-6 text-blue-500" />
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-white">Solicitar Factura</h3>
                    <p className="text-gray-400 text-xs mt-1">Completa tus datos fiscales</p>
                 </div>
              </div>

              <form onSubmit={async (e) => {
                  e.preventDefault();
                  setIsFacturando(true);
                  try {
                      // We pick the first available order for the session 
                      const latestOrder = activeOrders[0]; 
                      if (!latestOrder) {
                          alert("No hay una orden activa para facturar.");
                          return;
                      }
                      
                      const calculatedTotal = latestOrder.total || 0;

                      await requestInvoice({
                          restaurant_id: latestOrder.restaurant_id || 'default_tenant',
                          order_id: latestOrder.id,
                          cliente_rfc: facturaData.rfc.toUpperCase(),
                          cliente_nombre: facturaData.nombre,
                          cliente_regimen: facturaData.regimen,
                          cliente_uso_cfdi: facturaData.uso_cfdi,
                          cliente_correo: facturaData.correo,
                          monto_total: calculatedTotal
                      });
                      
                      alert('¡Solicitud de factura enviada exitosamente!');
                      setIsFacturaOpen(false);
                      setFacturaData({ rfc: '', nombre: '', regimen: '', uso_cfdi: '', correo: '' });
                  } catch (error) {
                      console.error(error);
                      alert('Error al solicitar la factura. Intenta de nuevo.');
                  } finally {
                      setIsFacturando(false);
                  }
              }} className="space-y-4">
                 
                 <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">RFC</label>
                    <input required type="text" maxLength={13} value={facturaData.rfc} onChange={e => setFacturaData({...facturaData, rfc: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-600 uppercase" placeholder="XAXX010101000" />
                 </div>
                 
                 <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Razón Social o Nombre</label>
                    <input required type="text" value={facturaData.nombre} onChange={e => setFacturaData({...facturaData, nombre: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-600" placeholder="Ej. Juan Pérez" />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Régimen Fiscal</label>
                        <select required value={facturaData.regimen} onChange={e => setFacturaData({...facturaData, regimen: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none text-sm">
                            <option value="">Selecciona...</option>
                            <option value="601">601 - General de Ley Personas Morales</option>
                            <option value="603">603 - Personas Morales con Fines no Lucrativos</option>
                            <option value="605">605 - Sueldos y Salarios</option>
                            <option value="606">606 - Arrendamiento</option>
                            <option value="612">612 - Personas Físicas con Actividades</option>
                            <option value="626">626 - RESICO</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Uso de CFDI</label>
                        <select required value={facturaData.uso_cfdi} onChange={e => setFacturaData({...facturaData, uso_cfdi: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none text-sm">
                            <option value="">Selecciona...</option>
                            <option value="G01">G01 - Adquisición de mercancías</option>
                            <option value="G03">G03 - Gastos en general</option>
                            <option value="P01">P01 - Por definir</option>
                        </select>
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Correo Electrónico</label>
                    <input required type="email" value={facturaData.correo} onChange={e => setFacturaData({...facturaData, correo: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-600" placeholder="correo@ejemplo.com" />
                 </div>

                 <button
                    type="submit"
                    disabled={isFacturando}
                    className="w-full mt-4 py-4 rounded-xl font-black text-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center gap-2"
                 >
                    {isFacturando ? <span className="animate-pulse">Enviando...</span> : 'Solicitar Factura'}
                 </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Inline Sub-component for Live Tracking
function TrackingStep({ active, icon, title, desc }: { active: boolean, icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex gap-6 relative z-10 items-start">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors duration-500 border-4 border-white shadow-sm ${active ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
        }`}>
        {icon}
      </div>
      <div className="pt-2 pb-6">
        <h4 className={`font-black text-lg ${active ? 'text-gray-900' : 'text-gray-400'}`}>{title}</h4>
        <p className={`text-sm mt-1 ${active ? 'text-gray-600' : 'text-gray-400'}`}>{desc}</p>
      </div>
    </div>
  );
}
