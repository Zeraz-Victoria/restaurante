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
  Star
} from "lucide-react";
import Image from "next/image";
import { useOrders } from "@/hooks/useOrders";
import { useProducts, Product } from "@/hooks/useProducts";
import { useTables } from "@/hooks/useTables";
import { useNotifications, NotificationType } from "@/hooks/useNotifications";
import { useReviews } from "@/hooks/useReviews";

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
  const [activeCategory, setActiveCategory] = useState<string>("Populares");

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

  // Order Tracking State
  type OrderProgress = { id: string, name: string, status: 'pendiente' | 'cocinando' | 'listo' | 'entregado' };
  const [activeOrders, setActiveOrders] = useState<OrderProgress[]>([]);

  // Table Session State
  const [tableId, setTableId] = useState<string>("unknown");
  const [mesaNum, setMesaNum] = useState<string>("?");

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
  useEffect(() => {
    if (categorias.length > 0 && activeCategory === "Populares") {
      const popularesCategory = categorias.find(cat => cat.name === "Populares");
      if (popularesCategory) {
        setActiveCategory(popularesCategory.id);
      } else {
        setActiveCategory(categorias[0].id); // Fallback to first category
      }
    }
  }, [categorias, activeCategory]);

  // Helpers
  const cartTotal = cart.reduce((total, item) => {
    let base = item.product.price;
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
    if (cart.length === 0) return;

    // Check if table session exists, else warn
    if (tableId === "unknown") {
      alert("Por favor escanea el código QR de tu mesa antes de ordenar.");
      return;
    }

    const orderData = {
      mesa_id: tableId,
      mesa_nombre: `Mesa ${mesaNum}`,
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
      estado: 'pendiente',
      is_addition: hasPreviousOrder,
    };

    const newOrder = await insertOrder(orderData);

    // 4. Update UI State for ongoing experience
    const newOrderId = (newOrder as any)?.id || (newOrder as any)?.[0]?.id || Math.random().toString(36).substr(2, 9);
    const orderTitle = cart.length === 1 ? cart[0].product.name : `${cart.length} Productos`;

    setCart([]); // Clean cart
    setActiveTab('tracking'); // Send user to tracking tab

    // --- Connect to Tables Logic ---
    try {
      // Set to esperando_comida whenever a new order is received
      await updateTableStatus(tableId, 'esperando_comida');
    } catch (e) {
      console.error("Error setting table active status", e);
    }

    // Add to active orders array
    setActiveOrders(prev => [...prev, { id: newOrderId, name: orderTitle, status: 'pendiente' }]);

    // Always flag that this table has an active session from now on
    setHasPreviousOrder(true);
  };

  // Handle Review Submission
  const handleReviewSubmit = async () => {
    if (reviewScore === 0) return;
    await addReview(tableId, reviewScore, reviewText);

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
    window.location.href = '/';
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
            <div className="w-10 h-10 rounded-full bg-orange-500/20 border border-orange-500/50 flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-orange-500 uppercase leading-none mt-1">MESA</span>
              <span className="text-sm font-black text-orange-400 leading-none">{mesaNum}</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider">Mesa {mesaNum} • Invitado</p>
              <h1 className="text-xl font-black">Tu Orden</h1>
            </div>
          </div>
          {/* Waiter Assistant Button */}
          <div className="bg-orange-50 hover:bg-orange-100 text-orange-600 p-2 rounded-full transition-colors relative group cursor-pointer" tabIndex={0}>
            <Bell className="w-6 h-6" />
            {/* Tooltip/Menu (Simplified for demo) */}
            <div className="absolute right-0 top-12 bg-white shadow-xl rounded-xl p-2 hidden group-focus-within:block border w-64 z-50 cursor-default">
              <p className="text-xs font-bold text-gray-500 mb-2 px-2 uppercase">Llamar Mesero</p>
              <button onMouseDown={() => handleWaiterCall('pago', 'La Cuenta')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded font-medium flex gap-2 mb-2"><ReceiptText className="w-4 h-4" /> Pedir la Cuenta</button>

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
              <div className="p-4 bg-white sticky top-0 z-10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="¿Qué se te antoja hoy?"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-100 text-gray-900 rounded-2xl py-3 pl-10 pr-4 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 transition-shadow"
                  />
                </div>
              </div>

              {/* Categories (Horizontal Scroll) */}
              <div className="px-4 py-2 bg-white border-b overflow-x-auto whitespace-nowrap hide-scrollbar flex gap-2">
                {categorias.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-5 py-2 rounded-full font-bold text-sm transition-colors ${activeCategory === cat.id
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Product List */}
              <div className="p-4 flex flex-col gap-4">
                {products
                  .filter((p) => {
                    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
                    if (searchQuery) return matchesSearch;
                    return p.category_id === activeCategory;
                  })
                  .map((product) => (
                    <div
                      key={product.id}
                      onClick={() => openProductModal(product)}
                      className="bg-white rounded-3xl p-3 flex gap-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)] active:scale-[0.98] transition-all cursor-pointer border border-transparent hover:border-orange-100"
                    >
                      <div className="w-28 h-28 relative rounded-2xl overflow-hidden shrink-0 bg-gray-100">
                        {/* Replaced Next Image with standard img because we use external unrestrained URLs */}
                        {product.image_url ?
                          <img src={product.image_url} alt={product.name} className="object-cover w-full h-full" />
                          : <Utensils className="w-12 h-12 text-gray-600 opacity-50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        }
                        {product.isPopular && (
                          <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-black px-2 py-1 rounded-bl-xl z-10 uppercase tracking-widest flex items-center gap-1">
                            <Flame className="w-3 h-3" /> Top
                          </div>
                        )}
                      </div>
                      <div className="py-1 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-gray-900 leading-tight pr-4">{product.name}</h3>
                          <p className="text-sm text-gray-500 line-clamp-2 mt-1 leading-snug">{product.description}</p>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="font-black text-lg text-gray-900">${product.price}</span>
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <Plus className="w-5 h-5 text-gray-600" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
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
                          {item.note && <p className="italic mt-1 text-gray-400">"{item.note}"</p>}
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-red-400 self-start p-1 hover:bg-red-50 rounded">
                        <Minus className="w-5 h-5" />
                      </button>
                    </div>
                  ))}

                  {/* Action */}
                  <div className="pt-6">
                    <button
                      onClick={placeOrder}
                      className="w-full bg-black text-white py-4 rounded-xl font-black text-lg flex justify-between px-6 shadow-xl active:scale-[0.98] transition-transform"
                    >
                      <span>Enviar a Cocina</span>
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
              <h2 className="text-2xl font-black mb-8 text-center pt-8">Mis Pedidos</h2>

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

        {/* --- PRODUCT DETAIL MODAL (Bottom Sheet Style) --- */}
        {selectedProduct && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center animate-in fade-in duration-300">
            {/* Backdrop */}
            <div className="absolute inset-0" onClick={() => setSelectedProduct(null)}></div>

            {/* Sheet Content */}
            <div className="bg-[#111216] w-full rounded-t-3xl h-[90vh] overflow-hidden flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border border-white/5 relative z-10 slide-in-from-bottom-20">

              <div className="relative h-64 w-full bg-gray-900 flex-shrink-0 flex items-center justify-center rounded-t-3xl overflow-hidden">
                {selectedProduct.image_url ?
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                  : <Utensils className="w-16 h-16 text-gray-600 opacity-50" />
                }
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-4 right-4 bg-black/50 backdrop-blur-md rounded-full p-2 text-white hover:bg-black"
                >
                  <ChevronRight className="w-6 h-6 rotate-90" />
                </button>
              </div>

              {/* Scrollable details */}
              <div className="p-6 overflow-y-auto flex-1 bg-[#111216] text-white">
                <h2 className="text-3xl font-black leading-tight">{selectedProduct.name}</h2>
                <p className="text-gray-400 mt-2 leading-relaxed">{selectedProduct.description}</p>
                <p className="text-2xl font-black mt-4 text-orange-500">${selectedProduct.price}</p>

                <div className="space-y-6 mt-8">
                  {/* Options (Radio Logic) */}
                  {selectedProduct.options?.map((opt: any) => (
                    <div key={opt.name} className="bg-white/5 p-4 rounded-2xl border border-white/10 shadow-sm">
                      <h4 className="font-bold mb-3 uppercase tracking-wider text-sm flex justify-between">
                        {opt.name} <span className="text-orange-500 text-xs bg-orange-500/10 px-2 py-1 rounded">Requerido</span>
                      </h4>
                      <div className="flex flex-col gap-2">
                        {opt.choices.map((choice: string) => (
                          <label key={choice} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                            <input
                              type="radio"
                              name={opt.name}
                              value={choice}
                              checked={tempOptions[opt.name] === choice}
                              onChange={() => setTempOptions({ ...tempOptions, [opt.name]: choice })}
                              className="w-5 h-5 accent-orange-500"
                            />
                            <span className="font-medium">{choice}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Extras (Checkbox Logic - Upselling) */}
                  {selectedProduct.extras && selectedProduct.extras.length > 0 && (
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 shadow-sm">
                      <h4 className="font-bold mb-3 uppercase tracking-wider text-sm flex justify-between">
                        Agrega Extras <span className="text-gray-500 text-xs">Opcional</span>
                      </h4>
                      <div className="flex flex-col gap-2">
                        {selectedProduct.extras.map((extra: any) => (
                          <label key={extra.name} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                            <input
                              type="checkbox"
                              checked={tempExtras.includes(extra.name)}
                              onChange={(e) => {
                                if (e.target.checked) setTempExtras([...tempExtras, extra.name]);
                                else setTempExtras(tempExtras.filter(x => x !== extra.name));
                              }}
                              className="w-5 h-5 accent-orange-500 rounded"
                            />
                            <div className="flex-1 flex justify-between items-center">
                              <span className="font-medium">{extra.name}</span>
                              <span className="text-sm font-bold text-gray-400">+${extra.price}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Special Instructions */}
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10 shadow-sm">
                    <h4 className="font-bold mb-3 uppercase tracking-wider text-sm">Instrucciones Especiales</h4>
                    <textarea
                      placeholder="Ej. Sin cebolla, aderezo aparte..."
                      value={tempNote}
                      onChange={e => setTempNote(e.target.value)}
                      className="w-full bg-black/50 rounded-xl p-3 border border-white/5 focus:outline-none focus:border-orange-500 resize-none h-24 placeholder:text-gray-600"
                    />
                  </div>
                </div>
              </div>

              {/* Add to Cart Actions */}
              <div className="bg-[#111216] p-4 border-t border-white/10 flex gap-4 items-center pb-safe">
                {/* Quantity Picker */}
                <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
                  <button
                    onClick={() => setTempQuantity(Math.max(1, tempQuantity - 1))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors font-bold text-lg"
                  >—</button>
                  <span className="w-10 text-center font-black text-lg">{tempQuantity}</span>
                  <button
                    onClick={() => setTempQuantity(tempQuantity + 1)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors font-bold text-lg"
                  >+</button>
                </div>

                <button
                  onClick={addToCart}
                  className="flex-1 bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-xl font-black text-lg shadow-[0_0_20px_rgba(234,88,12,0.3)] active:scale-[0.98] transition-all"
                >
                  Agregar ${selectedProduct.price * tempQuantity}
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
                className="w-full py-4 rounded-xl font-black text-lg bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(234,88,12,0.3)] transition-all"
              >
                Enviar y Finalizar
              </button>
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
