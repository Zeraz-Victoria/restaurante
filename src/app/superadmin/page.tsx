"use client";

import { useState, useEffect } from "react";
import {
    Building2,
    CreditCard,
    LifeBuoy,
    MoreHorizontal,
    Plus,
    Search,
    TrendingUp,
    Users
} from "lucide-react";

// Mock Data for the SuperAdmin SaaS Dashboard
const METRICS = {
    mrr: 45200,
    activeTenants: 124,
    churnRate: 1.2,
    supportTickets: 8
};

const TENANTS = [
    { id: "1", name: "La Parrilla de Juan", plan: "Premium", status: "Active", users: 15, joined: "Oct 2024" },
    { id: "2", name: "Sushi & Co.", plan: "Pro", status: "Active", users: 8, joined: "Nov 2024" },
    { id: "3", name: "Café París", plan: "Basic", status: "Suspended", users: 3, joined: "Jan 2025" },
    { id: "4", name: "El Taquito Veloz", plan: "Pro", status: "Active", users: 5, joined: "Feb 2025" },
];

const PLANS = [
    { id: "p1", name: "Básico", price: "$49/mo", activeUsers: 45 },
    { id: "p2", name: "Pro", price: "$99/mo", activeUsers: 60 },
    { id: "p3", name: "Premium", price: "$199/mo", activeUsers: 19 },
];

export default function SuperAdminDashboard() {
    const [activeView, setActiveView] = useState('tenants'); // 'tenants' | 'plans' | 'support'
    const [searchQuery, setSearchQuery] = useState('');
    const [themeColor, setThemeColor] = useState('#ea580c'); // Default Orange-600

    useEffect(() => {
        // Apply dynamic CSS variables for theming to the document body
        const root = document.documentElement;
        root.style.setProperty('--theme-color', themeColor);
        // We can add a simple logic to adjust hover states or lighter variants
        root.style.setProperty('--theme-color-hover', `${themeColor}cc`);
        root.style.setProperty('--theme-color-light', `${themeColor}22`);
    }, [themeColor]);

    return (
        <div className="flex bg-[#f3f4f6] min-h-screen text-[#111827] font-sans">
            {/* Sidebar - Stripe Style (Clean, White, High Contrast) */}
            <aside className="w-64 bg-white border-r border-[#e5e7eb] flex flex-col shadow-sm z-10">
                <div className="p-6">
                    <h1 className="text-xl font-bold tracking-tight text-[#111827]">SaaS Control Center</h1>
                    <p className="text-xs text-[#6b7280] mt-1 font-medium">RestoFlow 360 Admin</p>
                </div>

                <nav className="flex-1 px-4 space-y-1 overflow-y-auto mt-2">
                    <NavItem
                        icon={<Building2 className="w-5 h-5" />}
                        label="Tenants (Restaurantes)"
                        active={activeView === 'tenants'}
                        onClick={() => setActiveView('tenants')}
                    />
                    <NavItem
                        icon={<CreditCard className="w-5 h-5" />}
                        label="Planes & Billing"
                        active={activeView === 'plans'}
                        onClick={() => setActiveView('plans')}
                    />
                    <NavItem
                        icon={<LifeBuoy className="w-5 h-5" />}
                        label="Soporte Técnico"
                        active={activeView === 'support'}
                        onClick={() => setActiveView('support')}
                    />
                </nav>

                <div className="p-4 border-t border-[#e5e7eb]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#111827] text-white flex items-center justify-center text-sm font-bold">
                            SA
                        </div>
                        <div>
                            <p className="text-sm font-bold">Super Admin</p>
                            <p className="text-xs text-[#6b7280]">admin@restoflow.com</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto flex flex-col">
                {/* Top Navbar */}
                <header className="h-16 bg-white border-b border-[#e5e7eb] flex items-center justify-between px-8 shadow-sm">
                    <div className="relative w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af] w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar restaurantes, usuarios, tickets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-[#f9fafb] border border-[#d1d5db] rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#111827] focus:border-[#111827] transition-all"
                        />
                    </div>
                </header>

                {/* Dashboard Content */}
                <div className="p-8 max-w-7xl w-full mx-auto space-y-8 flex-1">

                    {/* Global Metrics KPI */}
                    <div>
                        <h2 className="text-2xl font-bold mb-6">Visión Global</h2>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <KpiCard title="Ingresos Recurrentes (MRR)" value={`$${METRICS.mrr.toLocaleString()}`} icon={<TrendingUp className="text-green-600 w-5 h-5" />} trend="+14% m/m" />
                            <KpiCard title="Restaurantes Activos" value={METRICS.activeTenants} icon={<Building2 className="text-blue-600 w-5 h-5" />} trend="+5 m/m" />
                            <KpiCard title="Tasa de Churn" value={`${METRICS.churnRate}%`} icon={<Users className="text-red-600 w-5 h-5" />} trend="-0.2% m/m" />
                            <KpiCard title="Tickets de Soporte" value={METRICS.supportTickets} icon={<LifeBuoy className="text-orange-500 w-5 h-5" />} activeAlert={METRICS.supportTickets > 5} />
                        </div>
                    </div>

                    <hr className="border-[#e5e7eb] my-8" />

                    {/* Dynamic View Area */}
                    {activeView === 'tenants' && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold">Gestión de Restaurantes (Tenants)</h3>
                                <button className="flex items-center gap-2 bg-[#111827] text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-[#374151] transition-colors shadow-sm">
                                    <Plus className="w-4 h-4" /> Nuevo Restaurante
                                </button>
                            </div>

                            <div className="bg-white rounded-lg border border-[#e5e7eb] shadow-sm overflow-hidden">
                                <table className="min-w-full text-left text-sm">
                                    <thead className="bg-[#f9fafb] border-b border-[#e5e7eb] text-[#374151]">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold">Restaurante</th>
                                            <th className="px-6 py-3 font-semibold">Estado</th>
                                            <th className="px-6 py-3 font-semibold">Plan Actual</th>
                                            <th className="px-6 py-3 font-semibold">Tema App</th>
                                            <th className="px-6 py-3 font-semibold">Usuarios (Staff)</th>
                                            <th className="px-6 py-3 font-semibold">Registrado</th>
                                            <th className="px-6 py-3 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#e5e7eb]">
                                        {TENANTS.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).map((tenant) => (
                                            <tr key={tenant.id} className="hover:bg-[#f9fafb] transition-colors">
                                                <td className="px-6 py-4 font-medium text-[#111827]">{tenant.name}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tenant.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {tenant.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-[#4b5563]">{tenant.plan}</td>
                                                <td className="px-6 py-4 flex items-center gap-2">
                                                    <div className="w-4 h-4 rounded-full border border-gray-300 shadow-sm" style={{ backgroundColor: tenant.id === '1' ? '#ea580c' : tenant.id === '2' ? '#2563eb' : '#16a34a' }}></div>
                                                    <span className="text-xs text-gray-500 uppercase font-mono">{tenant.id === '1' ? '#ea580c' : tenant.id === '2' ? '#2563eb' : '#16a34a'}</span>
                                                </td>
                                                <td className="px-6 py-4 text-[#4b5563]">{tenant.users}</td>
                                                <td className="px-6 py-4 text-[#4b5563]">{tenant.joined}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="text-[#6b7280] hover:text-[#111827] p-1 rounded-md hover:bg-[#f3f4f6]">
                                                        <MoreHorizontal className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {TENANTS.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                                    <div className="p-8 text-center text-[#6b7280]">
                                        No se encontraron restaurantes con &quot;{searchQuery}&quot;
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeView === 'plans' && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold">Configuración de Suscripciones</h3>
                                <button className="text-[#111827] font-medium text-sm">Añadir Plan</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {PLANS.map(plan => (
                                    <div key={plan.id} className="bg-white p-6 rounded-lg border border-[#e5e7eb] shadow-sm flex flex-col">
                                        <h4 className="font-bold text-lg mb-1">{plan.name}</h4>
                                        <p className="text-3xl font-bold text-[#111827] mb-6">{plan.price}</p>
                                        <p className="text-sm text-[#4b5563] font-medium mb-6">
                                            <span className="text-[#111827] font-bold">{plan.activeUsers}</span> restaurantes en este plan.
                                        </p>
                                        <button className="mt-auto w-full py-2 bg-[#f9fafb] border border-[#d1d5db] rounded-md text-sm font-medium text-[#374151] hover:bg-[#f3f4f6] transition-colors">
                                            Editar Límites
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeView === 'support' && (
                        <div className="bg-white p-8 rounded-lg border border-[#e5e7eb] shadow-sm text-center">
                            <LifeBuoy className="w-16 h-16 mx-auto text-[#d1d5db] mb-4" />
                            <h3 className="text-lg font-bold">Módulo de Soporte B2B</h3>
                            <p className="text-[#6b7280] max-w-md mx-auto mt-2">
                                Conexión con Intercom / Zendesk o listado de tickets generados por dueños de restaurantes desde sus paneles administrativos.
                            </p>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
}

// ------ Stripe-Like Minimal UI Components ------

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm font-medium ${active
                ? "bg-[#f3f4f6] text-[#111827]"
                : "text-[#4b5563] hover:bg-[#f9fafb] hover:text-[#111827]"
                }`}
        >
            <span className={active ? "text-[#111827]" : "text-[#9ca3af]"}>
                {icon}
            </span>
            <span>{label}</span>
        </button>
    );
}

function KpiCard({ title, value, icon, trend, activeAlert }: { title: string, value: string | number, icon: React.ReactNode, trend?: string, activeAlert?: boolean }) {
    return (
        <div className={`bg-white p-6 rounded-lg border shadow-sm relative overflow-hidden ${activeAlert ? 'border-orange-500' : 'border-[#e5e7eb]'}`}>
            <div className="flex justify-between items-start mb-4">
                <h4 className="text-[#6b7280] text-sm font-medium">{title}</h4>
                <div className="p-1.5 bg-[#f3f4f6] rounded-md">
                    {icon}
                </div>
            </div>
            <div className="flex items-end gap-3">
                <span className="text-3xl font-bold tracking-tight text-[#111827]">{value}</span>
                {trend && (
                    <span className="text-sm font-medium text-[#6b7280] mb-1">{trend}</span>
                )}
            </div>
            {activeAlert && (
                <div className="absolute top-0 right-0 w-2 h-full bg-orange-500" />
            )}
        </div>
    );
}
