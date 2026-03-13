"use client";

import { useState, useEffect } from "react";
import { useOrders } from "@/hooks/useOrders";
import { useTables } from "@/hooks/useTables";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from '@/lib/supabase/client';
import {
    LayoutDashboard,
    TrendingUp,
    Users,
    Activity,
    UtensilsCrossed,
    Wallet,
    Receipt,
    QrCode,
    Download,
    Plus,
    Edit2,
    Trash2,
    ChefHat,
    Star,
    ArrowDownToLine,
    AlertTriangle,
    CheckCircle2,
    Coffee,
    X,
    Image as ImageIcon
} from "lucide-react";

import { useProducts } from "@/hooks/useProducts";

import { useAnalytics } from "@/hooks/useAnalytics";
import { useReviews } from "@/hooks/useReviews";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import WaiterPanel from "@/app/waiter/page";

export default function AdminDashboard() {
    const { products, categorias, addProduct, updateProduct, deleteProduct, loading, addCategoria, updateCategoria, deleteCategoria, refresh } = useProducts();
    const { notifications } = useNotifications();
    const unreadCount = notifications.filter(n => !n.leido).length;

    const [staff, setStaff] = useState([
        { id: 1, name: "Carlos López", role: "Mesero", pin: "****", status: "Activo" },
        { id: 2, name: "Ana Martínez", role: "Cocinero", pin: "****", status: "Activo" },
        { id: 3, name: "Adrian Vira", role: "Admin", pin: "****", status: "Activo" },
    ]);

    const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [currentImageUrl, setCurrentImageUrl] = useState('');
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);

    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [editingCat, setEditingCat] = useState<any>(null);

    const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<any>(null);

    // Dynamic states for Sizes and Extras
    const [tempSizes, setTempSizes] = useState<{ id: number; name: string; price: number }[]>([]);
    const [tempExtras, setTempExtras] = useState<{ id: number; name: string; price: number }[]>([]);

    const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const price = Number(formData.get('price'));
        const cost = Number(formData.get('cost'));
        const category_id = formData.get('category_id') as string;
        const description = formData.get('description') as string;
        const is_recommended = formData.get('is_recommended') === 'on';
        const discount_price_raw = formData.get('discount_price') as string;
        const discount_price = discount_price_raw ? Number(discount_price_raw) : undefined;
        let image_url = currentImageUrl;

        // Extract ingredients dynamically from the DOM (or state, but DOM is easier here with the current formData pattern)
        const ingredientsList: any[] = [];
        const ingNames = formData.getAll('ing_name');
        const ingQtys = formData.getAll('ing_qty');
        const ingUnits = formData.getAll('ing_unit');

        for (let i = 0; i < ingNames.length; i++) {
            if (ingNames[i]) {
                ingredientsList.push({
                    name: ingNames[i],
                    quantity: Number(ingQtys[i]) || 1,
                    unit: ingUnits[i]
                });
            }
        }

        // Extract sizes dynamically
        const sizesList: any[] = [];
        const sizeNames = formData.getAll('size_name');
        const sizePrices = formData.getAll('size_price');
        for (let i = 0; i < sizeNames.length; i++) {
            if (sizeNames[i]) {
                sizesList.push({ name: sizeNames[i] as string, price: Number(sizePrices[i]) || 0 });
            }
        }

        // Extract extras dynamically
        const extrasList: any[] = [];
        const extraNames = formData.getAll('extra_name');
        const extraPrices = formData.getAll('extra_price');
        for (let i = 0; i < extraNames.length; i++) {
            if (extraNames[i]) {
                extrasList.push({ name: extraNames[i] as string, price: Number(extraPrices[i]) || 0 });
            }
        }

        // Ensure we don't save empty strings if user didn't provide image
        if (!image_url || image_url.trim() === '') image_url = '';

        try {
            if (editingProduct) {
                await updateProduct(editingProduct.id, { name, price, cost, category_id, description, image_url, ingredients: ingredientsList, is_recommended, discount_price, sizes: sizesList, extras: extrasList });
            } else {
                await addProduct({ name, price, cost, category_id, description, image_url, status: 'Incógnita', ingredients: ingredientsList, is_recommended, discount_price, sizes: sizesList, extras: extrasList });
            }
            setIsMenuModalOpen(false);
        } catch (error: any) {
            console.error(error);
            const errStr = error?.message || JSON.stringify(error);
            alert(`🚨 Ups! Ha ocurrido un fallo en la base de datos de origen.\n\nError Supabase:\n${errStr}\n\nSi el error incluye "column does not exist", por favor asegúrate de haber ejecutado todo el código SQL en tu panel de Supabase. Si necesitas ayuda copia este error.`);
            setIsMenuModalOpen(false); // allow them to continue
        }
    };

    const generateAIImage = () => {
        const nameInput = (document.querySelector('input[name="name"]') as HTMLInputElement)?.value;
        const descInput = (document.querySelector('textarea[name="description"]') as HTMLTextAreaElement)?.value;

        if (!nameInput) {
            alert('Primero escribe el nombre del platillo para que la IA sepa qué dibujar.');
            return;
        }

        setIsGeneratingImage(true);
        // Using a reliable food placeholder service since some AI APIs block localhost / curl
        // We use loremflickr to get a random high quality food image based on the first word of the name
        const keywords = encodeURIComponent(nameInput.split(' ')[0] || 'food');
        const randomSeed = Math.floor(Math.random() * 10000);
        const generatedUrl = `https://loremflickr.com/800/800/food,${keywords}?lock=${randomSeed}`;

        // Update the input field via React State
        setCurrentImageUrl(generatedUrl);
        setIsGeneratingImage(false);
    };

    const handleDeleteProduct = async (id: string) => {
        if (confirm('¿Seguro que deseas eliminar este producto?')) {
            await deleteProduct(id);
        }
    };

    const handleSaveCategory = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;

        try {
            if (editingCat) {
                await updateCategoria(editingCat.id, name);
            } else {
                await addCategoria(name);
            }
            setIsCatModalOpen(false);
            setEditingCat(null);
            refresh();
        } catch (error) {
            alert('Error guardando categoría. Revisa la consola.');
        }
    };

    const handleDeleteCategory = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('¿Seguro que deseas eliminar esta categoría? Asegúrate de que no haya productos usando esta categoría o no aparecerán.')) {
            await deleteCategoria(id);
            refresh();
        }
    };

    const handleSeedDemoMenu = async () => {
        if (!confirm('¿Deseas cargar un menú de prueba completo? Esto agregará nuevas categorías y decenas de platillos pre-configurados.')) return;
        setIsGeneratingImage(true); // Reusing loader state
        try {
            // Create Categories
            const catNames = ['Populares', 'Tacos & Antojitos', 'Hamburguesas VIP', 'Pizzas de Origen', 'Ensaladas & Bowls', 'Postres', 'Bebidas y Mixología'];
            for (const name of catNames) {
                try { await addCategoria(name); } catch(e) {}
            }
            
            // Wait for categories to be created to get their IDs
            const tCategories = await supabase.from('categorias').select('id, name').in('name', catNames);
            if (!tCategories.data) return;

            const getId = (name: string) => tCategories.data.find((c: any) => c.name === name)?.id;

            // Create Products
            const demoProducts = [
                // TACOS
                {
                    name: 'Tacos Al Pastor (Orden de 5)',
                    description: 'Carne de cerdo adobada tradicional, asada al trompo con piña, cebolla, cilantro y salsa roja taquera.',
                    price: 120, cost: 45, category_id: getId('Tacos & Antojitos'),
                    image_url: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&q=80&w=800',
                    is_recommended: true, isPopular: true,
                    options: [{ name: 'Salsa', choices: ['Roja picante', 'Verde cruda', 'Sin salsa'] }, { name: 'Tortilla', choices: ['Maíz mini', 'Harina', 'Lechuga'] }],
                    extras: [{ name: 'Extra Carne', price: 35 }, { name: 'Queso fundido', price: 20 }],
                    status: 'activo'
                },
                {
                    name: 'Gringa de Asada',
                    description: 'Doble tortilla de harina gigante, mucho queso asadero fundido y jugosa carne de res.',
                    price: 95, cost: 35, category_id: getId('Tacos & Antojitos'),
                    image_url: 'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?auto=format&fit=crop&q=80&w=800',
                    status: 'activo'
                },
                // BURGERS
                {
                    name: 'La Burger del Patrón',
                    description: '200g de Ribeye molido trufado, fondue de queso suizo, cebolla caramelizada, mayonesa de ajo asado y pan brioche artesanal.',
                    price: 280, discount_price: 240, cost: 110, category_id: getId('Hamburguesas VIP'),
                    image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800',
                    is_recommended: true, isPopular: true,
                    options: [{ name: 'Término de la carne', choices: ['Medio', '3/4', 'Bien Cocida'] }],
                    extras: [{ name: 'Tocino Crujiente', price: 35 }, { name: 'Aros de Cebolla', price: 45 }],
                    status: 'activo'
                },
                {
                    name: 'Crispy Chicken Sandwich',
                    description: 'Pechuga de pollo frita extracrujiente, ensalada de col picante, encurtidos y salsa secreta.',
                    price: 190, cost: 60, category_id: getId('Hamburguesas VIP'),
                    image_url: 'https://images.unsplash.com/photo-1626082895617-1c6afdfc37d4?auto=format&fit=crop&q=80&w=800',
                    extras: [{ name: 'Papas a la francesa', price: 40 }, { name: 'Doble Pollo', price: 65 }],
                    status: 'activo'
                },
                {
                    name: 'Smash Burger Sencilla',
                    description: '100g de carne aplastada en la plancha con costra, queso amarillo, cebolla picada y catsup.',
                    price: 130, cost: 40, category_id: getId('Hamburguesas VIP'),
                    image_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&q=80&w=800',
                    sizes: [{ name: 'Sencilla (100g)', price: 130 }, { name: 'Doble (200g)', price: 180 }, { name: 'Triple (300g)', price: 230 }],
                    status: 'activo'
                },
                // PIZZAS
                {
                    name: 'Pizza Margherita Clásica',
                    description: 'Nuestra icónica pizza con salsa pomodoro San Marzano, mozzarella fresca, albahaca y un toque de aceite de oliva.',
                    price: 250, cost: 80, category_id: getId('Pizzas de Origen'),
                    image_url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&q=80&w=800',
                    sizes: [{ name: 'Personal (25cm)', price: 150 }, { name: 'Mediana (35cm)', price: 210 }, { name: 'Familiar (45cm)', price: 290 }],
                    extras: [{ name: 'Orilla Rellena Adicional', price: 45 }, { name: 'Extra Queso', price: 35 }],
                    status: 'activo'
                },
                {
                    name: 'Pizza Pepperoni Lovers',
                    description: 'Doble cubierta de pepperoni crujiente que se hace "cazuelita" en el horno con extra queso.',
                    price: 280, discount_price: 250, cost: 95, category_id: getId('Pizzas de Origen'),
                    image_url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&q=80&w=800',
                    is_recommended: true, isPopular: true,
                    sizes: [{ name: 'Mediana (35cm)', price: 250 }, { name: 'Familiar (45cm)', price: 320 }],
                    status: 'activo'
                },
                // SALADS
                {
                    name: 'Ensalada César con Pollo',
                    description: 'Lechuga romana fresca, crutones de ajo, queso parmesano añejado y nuestro aderezo César de la casa, coronada con pechuga asada.',
                    price: 180, cost: 55, category_id: getId('Ensaladas & Bowls'),
                    image_url: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&q=80&w=800',
                    options: [{ name: 'Proteína', choices: ['Pollo Asado', 'Pollo Empanizado', 'Camarones (+ $40)'] }],
                    extras: [{ name: 'Extra Aderezo', price: 15 }],
                    status: 'activo'
                },
                {
                    name: 'Bowl Atún Poke',
                    description: 'Cubos de atún fresco marinados en ponzu, arroz al vapor, aguacate, edamames, pepino y mayonesa spicy.',
                    price: 220, cost: 85, category_id: getId('Ensaladas & Bowls'),
                    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800',
                    status: 'activo'
                },
                // DESSERTS
                {
                    name: 'Volcán de Chocolate Fondant',
                    description: 'Pastelito de chocolate horneado al momento, con un centro líquido y caliente, servido con helado de vainilla.',
                    price: 140, cost: 35, category_id: getId('Postres'),
                    image_url: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?auto=format&fit=crop&q=80&w=800',
                    is_recommended: true,
                    extras: [{ name: 'Bola de helado extra', price: 25 }, { name: 'Frutos Rojos', price: 30 }],
                    status: 'activo'
                },
                {
                    name: 'Cheesecake Estilo NY',
                    description: 'Rebanada densa y cremosa de pay de queso horneado sobre costra de galleta, mermelada de zarzamora.',
                    price: 110, cost: 25, category_id: getId('Postres'),
                    image_url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&q=80&w=800',
                    status: 'activo'
                },
                // DRINKS
                {
                    name: 'Mojito Frutos Rojos',
                    description: 'Refrescante mezcla de ron blanco, frutos rojos macerados con menta, limón y agua mineral.',
                    price: 130, discount_price: 99, cost: 35, category_id: getId('Bebidas y Mixología'),
                    image_url: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&q=80&w=800',
                    is_recommended: true,
                    options: [{ name: 'Base', choices: ['Con Ron', 'Con Vodka', 'Sin Alcohol'] }],
                    status: 'activo'
                },
                {
                    name: 'Limonada Mineral Artesanal',
                    description: 'Limonada preparada al momento, ligeramente endulzada con jarabe de agave.',
                    price: 55, cost: 10, category_id: getId('Bebidas y Mixología'),
                    image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=800',
                    sizes: [{ name: 'Medio Litro', price: 55 }, { name: 'Litro', price: 85 }],
                    options: [{ name: 'Sabor', choices: ['Clásica', 'Con Chía', 'Fresa', 'Mango'] }],
                    status: 'activo'
                },
                {
                    name: 'Cerveza Artesanal IPA',
                    description: 'Cerveza pálida, amarga y aromática, ideal para acompañar nuestras hamburguesas.',
                    price: 95, cost: 40, category_id: getId('Bebidas y Mixología'),
                    image_url: 'https://images.unsplash.com/photo-1566816183611-37d451475759?auto=format&fit=crop&q=80&w=800',
                    status: 'activo'
                }
            ];

            for (const p of demoProducts) {
                try {
                    // Try to save full product
                    await addProduct(p);
                } catch (e: any) {
                    console.log("Demo seed warning on product:", p.name, e);
                }
            }
            alert('¡Menú Demo MASIVO cargado exitosamente! Tienes más de 10 platillos nuevos para probar.');
            refresh();
        } catch (e) {
            console.error(e);
            alert('Hubo un error cargando el demo.');
        } finally {
            setIsGeneratingImage(false);
        }
    };

    // --- PDF Export Logic ---
    const exportResupplyPDF = () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.text("RestoFlow 360", 14, 20);

        doc.setFontSize(14);
        doc.text("Sugerencias de Resurtido Inteligente", 14, 30);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Fecha de Gen: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 38);

        // Body Data
        const tableColumn = ["Prioridad", "Insumo/Artículo", "Cantidad Sugerida", "Motivo Predictivo"];
        const tableRows: any[] = [];

        resurtido.forEach(item => {
            const priorityText = item.severity === 'red' ? 'ALTA (Crítico)' : item.severity === 'yellow' ? 'MEDIA' : 'BAJA (Sano)';
            const rowData = [
                priorityText,
                item.name,
                item.suggestion,
                item.reason
            ];
            tableRows.push(rowData);
        });

        // Generate Table
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'grid',
            headStyles: { fillColor: [234, 88, 12] }, // Orange theme
            styles: { fontSize: 10, cellPadding: 3 },
            didParseCell: function (data) {
                // Colorize the priority column
                if (data.section === 'body' && data.column.index === 0) {
                    if (data.cell.raw === 'ALTA (Crítico)') {
                        data.cell.styles.textColor = [220, 38, 38]; // Red
                        data.cell.styles.fontStyle = 'bold';
                    } else if (data.cell.raw === 'MEDIA') {
                        data.cell.styles.textColor = [202, 138, 4]; // Yellow
                    } else {
                        data.cell.styles.textColor = [22, 163, 74]; // Green
                    }
                }
            }
        });

        // Save
        doc.save(`Resurtido_RestoFlow_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
    };

    const handleSaveStaff = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newStaff = {
            id: editingStaff ? editingStaff.id : Date.now(),
            name: formData.get('name') as string,
            role: formData.get('role') as string,
            pin: formData.get('pin') as string,
            status: "Activo"
        };

        if (editingStaff) {
            setStaff(staff.map(s => s.id === editingStaff.id ? newStaff : s));
        } else {
            setStaff([...staff, newStaff]);
        }
        setIsStaffModalOpen(false);
    };

    const handleDeleteStaff = (id: number) => {
        if (confirm('¿Seguro que deseas eliminar a este colaborador?')) {
            setStaff(staff.filter(s => s.id !== id));
        }
    };

    const handleDownloadQR = (mesaNum: number) => {
        alert(`Generando y descargando PDF con QR para la Mesa ${mesaNum}...`);
    };

    const [activeTab, setActiveTab] = useState<'dashboard' | 'menu' | 'qr' | 'staff' | 'reports' | 'reviews' | 'waiter'>('dashboard');
    const [reportInterval, setReportInterval] = useState('semanal');

    // Ingredients dynamic state for the modal
    const [tempIngredients, setTempIngredients] = useState<any[]>([]);

    const { orders } = useOrders();
    const { tables, addTable, deleteTable } = useTables();
    const { estrellas, vacas, perros, resurtido } = useAnalytics(products, reportInterval);
    const { reviews } = useReviews();

    // UI States
    const activeTables = tables.filter(t => t.estado !== 'libre');

    // Make sure we have the base URL to generate QRs
    const [baseUrl, setBaseUrl] = useState('http://localhost:3000');
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setBaseUrl(window.location.origin);
        }
    }, []);

    // --- KPIs Calculations (Filtered strictly for TODAY) ---
    const todayStr = new Date().toISOString().split('T')[0];

    const todaysOrders = orders.filter(o => {
        if (!o.created_at) return false;
        // Check if the order's created_at starts with today's date string
        return o.created_at.startsWith(todayStr);
    });

    // Total Vendido Hoy
    const totalSales = todaysOrders.reduce((acc, curr) => acc + (curr.total || 0), 0);

    // Total Orders count
    const totalOrders = todaysOrders.length;

    // Average Ticket
    const avgTicket = totalOrders > 0 ? (totalSales / totalOrders).toFixed(2) : "0.00";

    // Active items in kitchen (From Today's Orders)
    const activeKitchenItems = todaysOrders
        .filter(o => o.estado === 'pendiente' || o.estado === 'cocinando')
        .reduce((acc, curr) => acc + (curr.items?.length || 0), 0);

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-white font-sans selection:bg-orange-500/30 flex">

            {/* Sidebar Desktop */}
            <aside className="hidden lg:flex flex-col w-64 bg-[#111216] border-r border-white/5 p-6 h-screen sticky top-0">
                <div className="mb-12 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center font-black text-xl shadow-[0_0_20px_rgba(249,115,22,0.3)]">
                        R
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight leading-none text-white">RestoFlow</h1>
                        <span className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">Admin 360</span>
                    </div>
                </div>

                <nav className="flex-1 space-y-2">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-white/5 text-orange-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab('menu')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'menu' ? 'bg-white/5 text-orange-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <UtensilsCrossed className="w-5 h-5" />
                        Menú & Inventario
                    </button>
                    <button
                        onClick={() => setActiveTab('qr')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'qr' ? 'bg-white/5 text-orange-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <QrCode className="w-5 h-5" />
                        Gestor QR
                    </button>
                    <button
                        onClick={() => setActiveTab('staff')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'staff' ? 'bg-white/5 text-orange-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Users className="w-5 h-5" />
                        Personal
                    </button>
                    <button
                        onClick={() => setActiveTab('reports')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'reports' ? 'bg-white/5 text-orange-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <TrendingUp className="w-5 h-5" />
                        Analítica Predictiva
                    </button>
                    <button
                        onClick={() => setActiveTab('reviews')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'reviews' ? 'bg-white/5 text-orange-400' : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Star className="w-5 h-5" />
                        Reseñas de Clientes
                    </button>
                    <button
                        onClick={() => setActiveTab('waiter')}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all relative ${activeTab === 'waiter' ? 'bg-orange-600 shadow-[0_0_20px_rgba(234,88,12,0.3)] text-white' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-white/5'}`}
                    >
                        <div className="flex items-center gap-3">
                            <UtensilsCrossed className="w-5 h-5" />
                            Operación (Sala)
                        </div>
                        {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                                {unreadCount}
                            </span>
                        )}
                    </button>
                </nav>

                <div className="mt-auto pt-6 border-t border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center">
                            A
                        </div>
                        <div>
                            <p className="text-sm font-bold">Adrian V.</p>
                            <p className="text-xs text-gray-500">Propietario</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 md:p-10 lg:p-12 overflow-y-auto">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-black tracking-tight">
                            {activeTab === 'dashboard' && 'Vista General'}
                            {activeTab === 'menu' && 'Gestor de Menú e Inventario'}
                            {activeTab === 'qr' && 'Gestor QR de Mesas'}
                            {activeTab === 'staff' && 'Control de Personal'}
                            {activeTab === 'waiter' && 'Operación (Sala y Meseros)'}
                            {activeTab === 'reports' && 'Analítica Predictiva'}
                            {activeTab === 'reviews' && 'Reseñas de Clientes'}
                        </h2>
                        <p className="text-gray-400 font-medium mt-2">
                            {activeTab === 'dashboard' && 'Métricas en tiempo real de tu operación.'}
                            {activeTab === 'menu' && 'Añade nuevos platillos, organiza categorías, controla mermas y sincroniza el inventario directamente con el punto de venta y dispositivos móviles.'}
                            {activeTab === 'qr' && 'Descarga e imprime los accesos directos por mesa.'}
                            {activeTab === 'staff' && 'Administra accesos PIN para meseros y cocineros.'}
                            {activeTab === 'reports' && 'Semáforo de rentabilidad y proyecciones de stock.'}
                            {activeTab === 'reviews' && 'Calificaciones, comentarios y nivel de satisfacción de tus comensales.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 bg-[#111216] border border-white/5 py-2 px-4 rounded-full shadow-inner">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs font-bold uppercase tracking-wider text-green-400">Sistema Online</span>
                    </div>
                </header>

                {/* --- DASHBOARD TAB --- */}
                {activeTab === 'dashboard' && (
                    <>

                        {/* --- KPI CARDS GLOBALES --- */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                            {/* KPI 1 Sales */}
                            <div className="bg-[#111216] border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-orange-500/30 transition-colors">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-orange-500/10 transition-colors"></div>
                                <div className="flex justify-between items-start mb-6 align-top">
                                    <div className="p-3 bg-orange-500/10 rounded-2xl text-orange-400">
                                        <Wallet className="w-6 h-6" />
                                    </div>
                                    <span className="flex items-center gap-1 text-green-400 text-sm font-bold bg-green-500/10 px-2 py-1 rounded-full">
                                        <TrendingUp className="w-4 h-4" /> +14.5%
                                    </span>
                                </div>
                                <h3 className="text-gray-400 font-medium text-sm mb-1 uppercase tracking-wider">Ventas de Hoy</h3>
                                <p className="text-4xl font-black">${totalSales.toLocaleString()}</p>
                            </div>

                            {/* KPI 2 Tickets */}
                            <div className="bg-[#111216] border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-blue-500/10 transition-colors"></div>
                                <div className="flex justify-between items-start mb-6 align-top">
                                    <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                                        <Receipt className="w-6 h-6" />
                                    </div>
                                </div>
                                <h3 className="text-gray-400 font-medium text-sm mb-1 uppercase tracking-wider">Órdenes (Tandas)</h3>
                                <p className="text-4xl font-black">{totalOrders}</p>
                            </div>

                            {/* KPI 3 Avg Ticket */}
                            <div className="bg-[#111216] border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-purple-500/30 transition-colors">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-purple-500/10 transition-colors"></div>
                                <div className="flex justify-between items-start mb-6 align-top">
                                    <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400">
                                        <Activity className="w-6 h-6" />
                                    </div>
                                </div>
                                <h3 className="text-gray-400 font-medium text-sm mb-1 uppercase tracking-wider">Ticket Promedio</h3>
                                <p className="text-4xl font-black">${avgTicket}</p>
                            </div>

                            {/* KPI 4 Occupation */}
                            <div className="bg-[#111216] border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-green-500/30 transition-colors">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-green-500/10 transition-colors"></div>
                                <div className="flex justify-between items-start mb-6 align-top">
                                    <div className="p-3 bg-green-500/10 rounded-2xl text-green-400">
                                        <Users className="w-6 h-6" />
                                    </div>
                                </div>
                                <h3 className="text-gray-400 font-medium text-sm mb-1 uppercase tracking-wider">Mesas Activas</h3>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-4xl font-black">{activeTables.length}</p>
                                    <p className="text-gray-500 font-medium">/ {tables.length}</p>
                                </div>
                            </div>
                        </div>

                        {/* --- SECTIONS: LIVE STATUS --- */}
                    </>
                )}

                {/* --- MENU & INVENTORY TAB --- */}
                {activeTab === 'menu' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center bg-[#111216] border border-white/5 p-6 rounded-3xl">
                            <div>
                                <h3 className="text-xl font-black">Constructor de Menú</h3>
                                <p className="text-gray-400 text-sm mt-1">Configura platillos y recetas de inventario.</p>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={handleSeedDemoMenu}
                                    className="bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/20 text-purple-400 font-bold py-2 px-4 rounded-xl flex items-center gap-2 transition-colors shadow-sm"
                                >
                                    <Star className="w-4 h-4" fill="currentColor" /> Cargar Demo Menu
                                </button>
                                <button
                                    onClick={() => { setEditingCat(null); setIsCatModalOpen(true); }}
                                    className="bg-white/5 hover:bg-white/10 text-white font-bold py-2 px-6 rounded-xl flex items-center gap-2 transition-colors"
                                >
                                    <Plus className="w-5 h-5" /> Categoría
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingProduct(null);
                                        setCurrentImageUrl('');
                                        setTempIngredients([]);
                                        setTempSizes([]);
                                        setTempExtras([]);
                                        setIsMenuModalOpen(true);
                                    }}
                                    className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-6 rounded-xl flex items-center gap-2 shadow-[0_0_20px_rgba(234,88,12,0.3)] transition-colors"
                                >
                                    <Plus className="w-5 h-5" /> Platillo
                                </button>
                            </div>
                        </div>

                        {/* List of Categories Ribbon */}
                        {categorias.length > 0 && (
                            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                                {categorias.map(cat => (
                                    <div key={cat.id} className="flex items-center gap-2 bg-[#111216] border border-white/5 py-2 px-4 rounded-xl whitespace-nowrap group hover:border-white/10 transition-colors">
                                        <span className="font-bold text-sm">{cat.name}</span>
                                        <button onClick={(e) => { e.stopPropagation(); setEditingCat(cat); setIsCatModalOpen(true); }} className="text-gray-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={(e) => handleDeleteCategory(cat.id, e)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="bg-[#111216] border border-white/5 rounded-3xl overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-widest">
                                        <th className="p-4 font-bold border-b border-white/5">Platillo</th>
                                        <th className="p-4 font-bold border-b border-white/5">Categoría</th>
                                        <th className="p-4 font-bold border-b border-white/5">Precio</th>
                                        <th className="p-4 font-bold border-b border-white/5">Costo (Receta)</th>
                                        <th className="p-4 font-bold border-b border-white/5 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map(prod => (
                                        <tr key={prod.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                            <td className="p-4 font-bold flex items-center gap-3">
                                                {prod.image_url ?
                                                    <img src={prod.image_url} alt={prod.name} className="w-10 h-10 rounded-lg object-cover bg-gray-900 border border-white/10" />
                                                    : <div className="w-10 h-10 rounded-lg bg-gray-800 border border-white/10 flex items-center justify-center"><UtensilsCrossed className="w-4 h-4 text-gray-500" /></div>
                                                }
                                                <div>
                                                    <p>{prod.name}</p>
                                                    <p className="font-normal text-xs text-gray-500 truncate w-40">{prod.description}</p>
                                                </div>
                                            </td>
                                            <td className="p-4 text-gray-400">{categorias.find(c => c.id === prod.category_id)?.name || 'Sin Categoría'}</td>
                                            <td className="p-4 font-black text-green-400">${prod.price}</td>
                                            <td className="p-4 font-bold text-gray-500">${prod.cost}</td>
                                            <td className="p-4 flex gap-3 justify-end items-center h-[72px]">
                                                <button onClick={() => {
                                                    setEditingProduct(prod);
                                                    setCurrentImageUrl(prod.image_url || '');
                                                    setTempIngredients(prod.ingredients || []);
                                                    setTempSizes(prod.sizes?.map((s, i) => ({ id: i, ...s })) || []);
                                                    setTempExtras(prod.extras?.map((e, i) => ({ id: i, ...e })) || []);
                                                    setIsMenuModalOpen(true);
                                                }} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20"><Edit2 className="w-4 h-4" /></button>
                                                <button onClick={() => handleDeleteProduct(prod.id)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20"><Trash2 className="w-4 h-4" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- QR TAB --- */}
                {activeTab === 'qr' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center bg-[#111216] border border-white/5 p-6 rounded-3xl">
                            <div>
                                <h3 className="text-xl font-black">Gestor QR de Mesas</h3>
                                <p className="text-gray-400 text-sm mt-1">Genera códigos directos y crea la arquitectura virtual de tu Salón.</p>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={addTable}
                                    className="bg-white/5 hover:bg-white/10 text-white font-bold py-2 px-6 rounded-xl flex items-center gap-2 transition-colors"
                                >
                                    <Plus className="w-5 h-5" /> Nueva Mesa
                                </button>
                                <button
                                    onClick={() => alert('Generando ZIP con todos los códigos QR...')}
                                    className="bg-white hover:bg-gray-200 text-black font-black py-2 px-6 rounded-xl flex items-center gap-2"
                                >
                                    <ArrowDownToLine className="w-5 h-5" /> Descargar Todos (ZIP)
                                </button>
                            </div>
                        </div>

                        {/* Local Network Test Configuration */}
                        <div className="bg-[#111216] border border-blue-500/30 p-4 rounded-2xl flex items-center gap-4">
                            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                                <QrCode className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-sm">URL Base para Códigos QR</h4>
                                <p className="text-xs text-gray-400">Si pruebas con un celular en la misma red Wi-Fi, cambia <code>localhost</code> por tu IP (ej. 192.168.1.141).</p>
                            </div>
                            <input
                                type="text"
                                value={baseUrl}
                                onChange={(e) => setBaseUrl(e.target.value)}
                                className="bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white text-sm w-64 focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            {tables.map(table => (
                                <div key={table.id} className="bg-[#111216] border border-white/5 rounded-3xl p-6 text-center flex flex-col items-center hover:border-orange-500/30 transition-colors group relative">
                                    <button onClick={() => deleteTable(table.id)} className="absolute top-4 right-4 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <X className="w-5 h-5" />
                                    </button>
                                    <div className="w-40 h-40 bg-white rounded-xl mb-6 flex items-center justify-center p-3 shadow-[0_0_20px_rgba(255,255,255,0.1)] group-hover:scale-105 transition-transform cursor-pointer">
                                        <QRCodeSVG value={`${baseUrl}?table=${table.id}&mesaNum=${table.numero}`} className="w-full h-full text-black" />
                                    </div>
                                    <h4 className="text-xl font-black mb-1">Mesa {table.numero}</h4>
                                    <p className="text-xs text-gray-500 truncate w-full px-2">{table.id}</p>
                                    <button onClick={() => handleDownloadQR(table.numero)} className="mt-4 flex items-center gap-2 text-sm font-bold text-blue-400 hover:text-blue-300">
                                        <Download className="w-4 h-4" /> Bajar PNG
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- STAFF TAB --- */}
                {activeTab === 'staff' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center bg-[#111216] border border-white/5 p-6 rounded-3xl">
                            <div>
                                <h3 className="text-xl font-black">Configuración de Personal</h3>
                                <p className="text-gray-400 text-sm mt-1">Administra accesos para Meseros y Cocineros.</p>
                            </div>
                            <button
                                onClick={() => { setEditingStaff(null); setIsStaffModalOpen(true); }}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-xl flex items-center gap-2"
                            >
                                <Users className="w-5 h-5" /> Añadir Personal
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {staff.map(person => (
                                <div key={person.id} className="bg-[#111216] border border-white/5 rounded-3xl p-6 flex gap-4 items-center group">
                                    <div className="w-14 h-14 bg-gray-800 rounded-2xl flex items-center justify-center border border-white/10 shrink-0">
                                        {person.role === 'Cocinero' ? <ChefHat className="w-6 h-6 text-orange-400" /> :
                                            person.role === 'Admin' ? <Star className="w-6 h-6 text-yellow-400" /> :
                                                <Coffee className="w-6 h-6 text-blue-400" />}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-lg">{person.name}</h4>
                                        <p className="text-sm text-gray-400">{person.role} • PIN: {person.pin}</p>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setEditingStaff(person); setIsStaffModalOpen(true); }} className="p-3 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500/20 transition-colors">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDeleteStaff(person.id)} className="p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- WAITER EMBEDDED TAB --- */}
                {activeTab === 'waiter' && (
                    <div className="w-full h-full bg-[#0f1115] rounded-3xl overflow-hidden border border-white/5">
                        {/* Notice that WaiterPanel acts standalone, we just wrap it */}
                        <div className="h-[800px] w-full overflow-y-auto custom-scrollbar">
                            <WaiterPanel />
                        </div>
                    </div>
                )}

                {/* --- REPORTS TAB --- */}
                {activeTab === 'reports' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Title & Controls */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-2xl font-black flex items-center gap-3">
                                    <Activity className="w-8 h-8 text-purple-500" />
                                    Analítica Predictiva
                                </h3>
                                <p className="text-gray-400 mt-2">Basado en el cruce de ventas vs costo de receta configurada.</p>
                            </div>
                            <div className="flex items-center gap-2 bg-[#111216] border border-white/5 p-2 rounded-xl">
                                <span className="text-sm font-bold text-gray-400 px-2">Calcular para:</span>
                                <select
                                    value={reportInterval}
                                    onChange={(e) => setReportInterval(e.target.value)}
                                    className="bg-black border border-white/10 rounded-lg px-3 py-1 text-white focus:outline-none focus:border-purple-500"
                                >
                                    <option value="diario">Hoy</option>
                                    <option value="semanal">Últimos 7 Días</option>
                                    <option value="quincenal">Últimos 15 Días</option>
                                    <option value="mensual">Últimos 30 Días</option>
                                </select>
                            </div>
                        </div>

                        {/* Rentability Matrix */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* Estrella & Vaca */}
                            <div className="space-y-6">
                                <div className="bg-[#111216] border border-green-500/30 rounded-3xl p-6 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                    <h4 className="text-lg font-black text-green-400 flex items-center gap-2 mb-4">
                                        <Star className="w-5 h-5" /> Platos Estrella (Alta Rentabilidad / Alto Volumen)
                                    </h4>
                                    <div className="space-y-3">
                                        {estrellas.length > 0 ? estrellas.slice(0, 5).map(p => (
                                            <div key={p.id} className="flex justify-between items-center bg-black/20 p-3 rounded-xl">
                                                <span className="font-bold">{p.name} <span className="text-xs text-gray-400 ml-2">({(p as any).volume} vendidos)</span></span>
                                                <span className="text-green-400 font-bold">Margen: {p.price && p.price > 0 ? Math.round(((p.price - (p.cost || 0)) / p.price) * 100) : 0}%</span>
                                            </div>
                                        )) : <p className="text-sm text-gray-500">Esperando más ventas para calcular estrellas...</p>}
                                    </div>
                                </div>

                                <div className="bg-[#111216] border border-blue-500/30 rounded-3xl p-6 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                    <h4 className="text-lg font-black text-blue-400 flex items-center gap-2 mb-4">
                                        <TrendingUp className="w-5 h-5" /> Vacas Lecheras (Baja Rentabilidad / Alto Volumen)
                                    </h4>
                                    <div className="space-y-3">
                                        {vacas.length > 0 ? vacas.slice(0, 5).map(p => (
                                            <div key={p.id} className="flex justify-between items-center bg-black/20 p-3 rounded-xl">
                                                <span className="font-bold">{p.name} <span className="text-xs text-gray-400 ml-2">({(p as any).volume} vendidos)</span></span>
                                                <span className="text-blue-400 font-bold">Analizar Costos</span>
                                            </div>
                                        )) : <p className="text-sm text-gray-500">Sin productos en este rango.</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Resurtido */}
                            <div className="bg-[#111216] border border-white/5 rounded-3xl p-6 flex flex-col">
                                <h4 className="text-lg font-black flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                                    <AlertTriangle className="w-5 h-5 text-yellow-500" /> Sugerencia de Resurtido (IA)
                                </h4>
                                {resurtido.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-4 p-4 border border-white/5 rounded-2xl bg-white/[0.02]">
                                        <div className={`w-3 h-3 rounded-full bg-${item.severity === 'red' ? 'red-500 animate-pulse' : item.severity === 'yellow' ? 'yellow-500' : 'green-500'}`}></div>
                                        <div className="flex-1">
                                            <p className="font-bold">{item.name}</p>
                                            <p className="text-xs text-gray-400">{item.reason}</p>
                                        </div>
                                        <span className="font-black">{item.suggestion}</span>
                                    </div>
                                ))}
                                <button onClick={exportResupplyPDF} className="mt-6 w-full p-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-colors flex justify-center gap-2">
                                    <ArrowDownToLine className="w-5 h-5" /> Exportar Lista de Compras PDF
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- REVIEWS TAB --- */}
                {activeTab === 'reviews' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-[#111216] border border-white/5 p-6 rounded-3xl mb-6">
                            <h3 className="text-xl font-black flex items-center gap-2 text-orange-500">
                                <Star className="w-6 h-6" fill="currentColor" /> Historial de Satisfacción
                            </h3>
                            <p className="text-gray-400 text-sm mt-1">Calificaciones recopiladas automáticamente al liberar las mesas.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {reviews.length === 0 ? (
                                <p className="text-gray-500 col-span-3">Aún no hay reseñas registradas hoy.</p>
                            ) : (
                                reviews.map(rev => {
                                    const mesaAsociada = tables.find(t => t.id === rev.mesa_id)?.numero || '?';
                                    return (
                                        <div key={rev.id} className="bg-[#111216] border border-white/5 rounded-3xl p-6 relative flex flex-col justify-between group hover:border-orange-500/30 transition-colors">
                                            <div>
                                                <div className="flex justify-between items-center mb-4">
                                                    <span className="text-xs font-bold bg-white/5 px-3 py-1 rounded-full text-gray-300">
                                                        Mesa {mesaAsociada}
                                                    </span>
                                                    <div className="flex gap-1 text-orange-500">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star key={i} className="w-4 h-4" fill={i < rev.calificacion ? "currentColor" : "none"} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <p className="text-white italic text-sm leading-relaxed mb-4">
                                                    "{rev.comentario || 'Sin comentarios adicionales.'}"
                                                </p>
                                            </div>
                                            <span className="text-xs text-gray-500 text-right mt-4 border-t border-white/5 pt-4">
                                                {new Date(rev.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* --- MODALS --- */}
                {isMenuModalOpen && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-[#111216] border border-white/10 rounded-3xl w-full max-w-2xl p-6 relative shadow-2xl overflow-y-auto max-h-[90vh] hide-scrollbar">
                            <button onClick={() => setIsMenuModalOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-white/5 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                            <h3 className="text-2xl font-black mb-6">{editingProduct ? 'Editar Producto / Receta' : 'Nuevo Producto / Receta'}</h3>
                            <form onSubmit={handleSaveProduct} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-1">Nombre del Platillo</label>
                                    <input required name="name" defaultValue={editingProduct?.name || ''} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors placeholder:text-gray-600" placeholder="Ej. Tacos al Pastor" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-1">Descripción</label>
                                    <textarea name="description" defaultValue={editingProduct?.description || ''} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors placeholder:text-gray-600 resize-none h-20" placeholder="Ej. Doble tortilla bañada en salsa secreta..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-1">URL de Imagen (Opcional)</label>
                                    <div className="flex gap-2">
                                        <input id="image_url_input" value={currentImageUrl} onChange={(e) => setCurrentImageUrl(e.target.value)} name="image_url" className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors placeholder:text-gray-600" placeholder="https://unsplash.com/foto... o genera foto demo" />
                                        <button
                                            type="button"
                                            onClick={generateAIImage}
                                            disabled={isGeneratingImage}
                                            className="bg-purple-600/20 text-purple-400 hover:bg-purple-600/40 px-6 py-3 rounded-xl transition-all border border-purple-500/30 font-bold text-sm whitespace-nowrap active:scale-95 flex items-center gap-2"
                                        >
                                            {isGeneratingImage ? <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div> : <ImageIcon className="w-4 h-4" />}
                                            {isGeneratingImage ? 'Fotografiando...' : 'Autocompletar Imagen'}
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-1">Precio Venta ($)</label>
                                        <input required type="number" name="price" defaultValue={editingProduct?.price || ''} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-1">Costo Receta ($)</label>
                                        <input required type="number" name="cost" defaultValue={editingProduct?.cost || ''} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-1">Categoría</label>
                                    <select required name="category_id" defaultValue={editingProduct?.category_id || ''} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors appearance-none scrollbar-hide">
                                        <option value="" disabled>Selecciona una Categoría</option>
                                        {categorias.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3 bg-black/50 border border-white/10 rounded-xl px-4 py-3">
                                        <input type="checkbox" name="is_recommended" defaultChecked={editingProduct?.is_recommended || false} id="is_recommended" className="w-5 h-5 accent-orange-500" />
                                        <label htmlFor="is_recommended" className="text-sm font-bold text-gray-400 cursor-pointer">Recomendación del Chef</label>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-1">Precio Promoción ($) (Opcional)</label>
                                        <input type="number" name="discount_price" defaultValue={editingProduct?.discount_price || ''} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors" placeholder="Ej. 99" />
                                    </div>
                                </div>

                                {/* ---------------- SIZES BUILDER ---------------- */}
                                <div className="border-t border-white/10 pt-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h4 className="font-black text-lg text-white">Tamaños / Porciones</h4>
                                            <p className="text-xs text-gray-400">Si dejas esto vacío, se cobrará el Precio Base. Si agregas tamaños (ej. Chico, Grande), el cliente deberá elegir uno.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setTempSizes([...tempSizes, { id: Date.now(), name: '', price: 0 }])}
                                            className="bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 px-3 py-1.5 rounded-lg text-xs font-bold border border-orange-500/30 transition-colors flex items-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" /> Añadir Tamaño
                                        </button>
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-hide">
                                        {tempSizes.map((sz, idx) => (
                                            <div key={sz.id} className="flex gap-2 items-center bg-white/[0.02] p-2 rounded-xl border border-white/5">
                                                <input required name="size_name" defaultValue={sz.name} placeholder="Ej. Mediano" className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" />
                                                <input required type="number" step="0.01" name="size_price" defaultValue={sz.price} placeholder="Precio $" className="w-24 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" />
                                                <button type="button" onClick={() => setTempSizes(tempSizes.filter((_, i) => i !== idx))} className="p-2 text-gray-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* ---------------- EXTRAS BUILDER ---------------- */}
                                <div className="border-t border-white/10 pt-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h4 className="font-black text-lg text-white">Extras Modificadores</h4>
                                            <p className="text-xs text-gray-400">Complementos opcionales que el cliente puede agregar por un costo extra.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setTempExtras([...tempExtras, { id: Date.now(), name: '', price: 0 }])}
                                            className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-500/30 transition-colors flex items-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" /> Añadir Extra
                                        </button>
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-hide">
                                        {tempExtras.map((ext, idx) => (
                                            <div key={ext.id} className="flex gap-2 items-center bg-white/[0.02] p-2 rounded-xl border border-white/5">
                                                <input required name="extra_name" defaultValue={ext.name} placeholder="Ej. Queso Extra" className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                                                <input required type="number" step="0.01" name="extra_price" defaultValue={ext.price} placeholder="Precio $" className="w-24 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                                                <button type="button" onClick={() => setTempExtras(tempExtras.filter((_, i) => i !== idx))} className="p-2 text-gray-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* ---------------- INGREDIENTS RECIPE BUILDER ---------------- */}
                                <div className="border-t border-white/10 pt-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h4 className="font-black text-lg text-white">Receta Predictiva</h4>
                                            <p className="text-xs text-gray-400">Añade los insumos exactos para que la IA calcule con precisión tu resurtido de compras.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setTempIngredients([...tempIngredients, { id: Date.now(), name: '', quantity: 1, unit: 'Gramos' }])}
                                            className="bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 px-3 py-1.5 rounded-lg text-xs font-bold border border-purple-500/30 transition-colors flex items-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" /> Añadir Insumo
                                        </button>
                                    </div>

                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-hide">
                                        {tempIngredients.length === 0 ? (
                                            <p className="text-sm text-gray-500 italic text-center py-4 bg-white/[0.02] rounded-xl border border-white/5">Sin insumos. La IA deducirá por genéricos.</p>
                                        ) : tempIngredients.map((ing, idx) => (
                                            <div key={ing.id || idx} className="flex gap-2 items-center bg-white/[0.02] p-2 rounded-xl border border-white/5">
                                                <input required name="ing_name" defaultValue={ing.name} placeholder="Ej. Carne de Res" className="flex-2 bg-black/50 border border-white/10 w-full min-w-[120px] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" />
                                                <input required type="number" step="0.01" name="ing_qty" defaultValue={ing.quantity} placeholder="Cant" className="w-20 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" />
                                                <select required name="ing_unit" defaultValue={ing.unit} className="w-28 bg-black/50 border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-purple-500 appearance-none">
                                                    <option value="Gramos">Gramos</option>
                                                    <option value="Kilos">Kilos</option>
                                                    <option value="Litros">Litros</option>
                                                    <option value="Mililitros">Mililitros</option>
                                                    <option value="Piezas">Piezas</option>
                                                    <option value="Latas">Latas</option>
                                                    <option value="Paquetes">Paquetes</option>
                                                    <option value="Rebanadas">Rebanadas</option>
                                                </select>
                                                <button type="button" onClick={() => setTempIngredients(tempIngredients.filter((_, i) => i !== idx))} className="p-2 text-gray-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* ----------------------------------------------------------- */}

                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => setIsMenuModalOpen(false)} className="flex-1 py-3 px-4 rounded-xl font-bold bg-white/5 hover:bg-white/10 transition-colors">Cancelar</button>
                                    <button type="submit" className="flex-1 py-3 px-4 rounded-xl font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-[0_0_20px_rgba(234,88,12,0.3)] transition-colors">Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* --- CATEGORY MODAL --- */}
                {
                    isCatModalOpen && (
                        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                            <div className="bg-[#111216] border border-white/10 rounded-3xl w-full max-w-sm p-6 relative shadow-2xl">
                                <button onClick={() => setIsCatModalOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-white/5 rounded-full transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                                <h3 className="text-2xl font-black mb-6">{editingCat ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
                                <form onSubmit={handleSaveCategory} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-1">Nombre</label>
                                        <input required name="name" defaultValue={editingCat?.name || ''} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-600" placeholder="Ej. Postres Exclusivos" />
                                    </div>
                                    <div className="pt-4 flex gap-3">
                                        <button type="button" onClick={() => setIsCatModalOpen(false)} className="flex-1 py-3 px-4 rounded-xl font-bold bg-white/5 hover:bg-white/10 transition-colors">Cancelar</button>
                                        <button type="submit" className="flex-1 py-3 px-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-colors">Guardar</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }

                {
                    isStaffModalOpen && (
                        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                            <div className="bg-[#111216] border border-white/10 rounded-3xl w-full max-w-md p-6 relative shadow-2xl">
                                <button onClick={() => setIsStaffModalOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-white/5 rounded-full transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                                <h3 className="text-2xl font-black mb-6">{editingStaff ? 'Editar Colaborador' : 'Nuevo Colaborador'}</h3>
                                <form onSubmit={handleSaveStaff} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-1">Nombre Completo</label>
                                        <input required name="name" defaultValue={editingStaff?.name || ''} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-600" placeholder="Ej. Juan Pérez" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-400 mb-1">Rol</label>
                                            <select required name="role" defaultValue={editingStaff?.role || 'Mesero'} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none">
                                                <option value="Mesero">Mesero</option>
                                                <option value="Cocinero">Cocinero</option>
                                                <option value="Admin">Admin</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-400 mb-1">PIN de Acceso</label>
                                            <input required name="pin" defaultValue={editingStaff?.pin || ''} type="text" maxLength={4} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="****" />
                                        </div>
                                    </div>
                                    <div className="pt-4 flex gap-3">
                                        <button type="button" onClick={() => setIsStaffModalOpen(false)} className="flex-1 py-3 px-4 rounded-xl font-bold bg-white/5 hover:bg-white/10 transition-colors">Cancelar</button>
                                        <button type="submit" className="flex-1 py-3 px-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-colors">Guardar</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }

            </main>
        </div>
    );
}
