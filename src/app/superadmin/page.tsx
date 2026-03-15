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
    Users,
    LogOut,
    X,
    Trash2,
    PauseCircle,
    PlayCircle,
    Pencil
} from "lucide-react";
import { useTenants, Tenant } from "@/hooks/useTenants";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function SuperAdminDashboard() {
    useAuth('superadmin');
    const { tenants, loading, createTenant, updateTenant, updateTenantStatus, deleteTenant } = useTenants();
    const router = useRouter();
    const [activeView, setActiveView] = useState('tenants'); // 'tenants' | 'plans' | 'support'
    const [searchQuery, setSearchQuery] = useState('');
    const [themeColor, setThemeColor] = useState('#ea580c'); // Default Orange-600

    // Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [newTenant, setNewTenant] = useState({ name: '', plan: 'Pro' as const, access_code: '' });
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        // Apply dynamic CSS variables for theming to the document body
        const root = document.documentElement;
        root.style.setProperty('--theme-color', themeColor);
        root.style.setProperty('--theme-color-hover', `${themeColor}cc`);
        root.style.setProperty('--theme-color-light', `${themeColor}22`);
    }, [themeColor]);

    const handleLogout = () => {
        localStorage.clear();
        router.push('/login');
    };

    const handleEdit = (tenant: Tenant) => {
        setEditingTenant(tenant);
        setIsEditModalOpen(true);
    };

    const handleUpdateTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTenant) return;
        setIsSubmitting(true);
        try {
            await updateTenant(editingTenant.id, {
                name: editingTenant.name,
                plan: editingTenant.plan,
                access_code: editingTenant.access_code.trim().toUpperCase()
            });
            setIsEditModalOpen(false);
            setEditingTenant(null);
        } catch (error: any) {
            alert('Error al actualizar el restaurante: ' + (error.message || 'Error desconocido'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await createTenant({
                name: newTenant.name,
                plan: newTenant.plan,
                status: 'Active',
                access_code: (newTenant.access_code || `RTF-${Math.random().toString(36).substring(2, 6).toUpperCase()}`).trim().toUpperCase()
            });
            setIsCreateModalOpen(false);
            setNewTenant({ name: '', plan: 'Pro', access_code: '' });
        } catch (error: any) {
            alert('Error al crear el restaurante: ' + (error.message || 'Error desconocido'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate real metrics
    const activeTenantsCount = tenants.filter(t => t.status === 'Active').length;
    const basicCount = tenants.filter(t => t.plan === 'Basic').length;
    const proCount = tenants.filter(t => t.plan === 'Pro').length;
    const premiumCount = tenants.filter(t => t.plan === 'Premium').length;

    const estimatedMRR = (basicCount * 99) + (proCount * 499) + (premiumCount * 999);

    return (
        <div className="flex bg-[#f3f4f6] min-h-screen text-[#111827] font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-[#e5e7eb] flex flex-col shadow-sm z-10">
                <div className="p-6">
                    <h1 className="text-xl font-bold tracking-tight text-[#111827]">SaaS Control Center</h1>
                    <p className="text-xs text-[#6b7280] mt-1 font-medium">ServiFácil Admin</p>
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

                <div className="p-4 border-t border-[#e5e7eb] space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#111827] text-white flex items-center justify-center text-sm font-bold">
                            SA
                        </div>
                        <div>
                            <p className="text-sm font-bold">Super Admin</p>
                            <p className="text-xs text-[#6b7280]">admin@restoflow.com</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto pb-24 md:pb-0 flex flex-col">
                <header className="h-16 bg-white border-b border-[#e5e7eb] flex items-center justify-between px-8 shadow-sm">
                    <div className="relative w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af] w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar restaurantes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-[#f9fafb] border border-[#d1d5db] rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#111827] focus:border-[#111827] transition-all"
                        />
                    </div>
                </header>

                <div className="p-8 max-w-7xl w-full mx-auto space-y-8 flex-1">
                    {/* Global Metrics */}
                    <div>
                        <h2 className="text-2xl font-bold mb-6">Visión Global</h2>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <KpiCard title="Ingresos Est. (MXN)" value={`$${estimatedMRR.toLocaleString()}`} icon={<TrendingUp className="text-green-600 w-5 h-5" />} trend="+15%" />
                            <KpiCard title="Restaurantes Activos" value={activeTenantsCount} icon={<Building2 className="text-blue-600 w-5 h-5" />} />
                            <KpiCard title="Suscripciones Pro/Prem" value={proCount + premiumCount} icon={<Users className="text-purple-600 w-5 h-5" />} />
                            <KpiCard title="Tickets de Soporte" value={0} icon={<LifeBuoy className="text-orange-500 w-5 h-5" />} />
                        </div>
                    </div>

                    <hr className="border-[#e5e7eb] my-8" />

                    {activeView === 'tenants' && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold">Gestión de Restaurantes</h3>
                                <button 
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="flex items-center gap-2 bg-[#111827] text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-[#374151] transition-colors shadow-sm"
                                >
                                    <Plus className="w-4 h-4" /> Nuevo Restaurante
                                </button>
                            </div>

                            <div className="bg-white rounded-lg border border-[#e5e7eb] shadow-sm overflow-hidden">
                                {loading ? (
                                    <div className="p-20 text-center animate-pulse text-gray-400 font-medium">Cargando restaurantes...</div>
                                ) : (
                                    <table className="min-w-full text-left text-sm">
                                        <thead className="bg-[#f9fafb] border-b border-[#e5e7eb] text-[#374151]">
                                            <tr>
                                                <th className="px-6 py-3 font-semibold">Restaurante</th>
                                                <th className="px-6 py-3 font-semibold">Estado</th>
                                                <th className="px-6 py-3 font-semibold">Plan</th>
                                                <th className="px-6 py-3 font-semibold">Código Acceso</th>
                                                <th className="px-6 py-3 font-semibold">Registrado</th>
                                                <th className="px-6 py-3 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#e5e7eb]">
                                            {tenants.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).map((tenant) => (
                                                <tr key={tenant.id} className="hover:bg-[#f9fafb] transition-colors">
                                                    <td className="px-6 py-4 font-bold text-[#111827]">{tenant.name}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${tenant.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                            {tenant.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-[#4b5563] font-medium">{tenant.plan}</td>
                                                    <td className="px-6 py-4 font-mono text-xs text-blue-600 font-bold">{tenant.access_code}</td>
                                                    <td className="px-6 py-4 text-[#4b5563]">{tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : '-'}</td>
                                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                        <button 
                                                            onClick={() => updateTenantStatus(tenant.id, tenant.status === 'Active' ? 'Suspended' : 'Active')}
                                                            className={`p-1.5 rounded-md border ${tenant.status === 'Active' ? 'text-orange-600 border-orange-100 hover:bg-orange-50' : 'text-green-600 border-green-100 hover:bg-green-50'}`}
                                                            title={tenant.status === 'Active' ? 'Suspender' : 'Activar'}
                                                        >
                                                            {tenant.status === 'Active' ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                                                        </button>
                                                        <button 
                                                            onClick={() => handleEdit(tenant)}
                                                            className="p-1.5 rounded-md border text-blue-600 border-blue-100 hover:bg-blue-50"
                                                            title="Editar"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => { if(confirm('¿Seguro que deseas eliminar este restaurante?')) deleteTenant(tenant.id) }}
                                                            className="p-1.5 rounded-md border text-red-600 border-red-100 hover:bg-red-50"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}

                    {activeView === 'plans' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <PlanCard name="Básico" price={99} count={basicCount} />
                            <PlanCard name="Pro" price={499} count={proCount} />
                            <PlanCard name="Premium" price={999} count={premiumCount} />
                        </div>
                    )}

                    {activeView === 'support' && (
                        <div className="bg-white p-12 rounded-lg border border-[#e5e7eb] text-center">
                            <LifeBuoy className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-bold">Módulo de Soporte B2B</h3>
                            <p className="text-[#6b7280] max-w-md mx-auto mt-2">Próximamente: Integración con tickets de soporte directo desde el panel de restaurantes.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Create Tenant Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 overflow-hidden relative">
                        <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-all"><X className="w-5 h-5" /></button>
                        <h3 className="text-xl font-bold mb-6">Nuevo Restaurante</h3>
                        <form onSubmit={handleCreateTenant} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre del Restaurante</label>
                                <input required type="text" value={newTenant.name} onChange={e => setNewTenant({...newTenant, name: e.target.value})} className="w-full bg-[#f9fafb] border border-[#d1d5db] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#111827]" placeholder="Ej. El Buen Sabor" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Plan (Mensual MXN)</label>
                                <select value={newTenant.plan} onChange={e => setNewTenant({...newTenant, plan: e.target.value as any})} className="w-full bg-[#f9fafb] border border-[#d1d5db] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#111827]">
                                    <option value="Basic">Básico ($99 MXN)</option>
                                    <option value="Pro">Pro ($499 MXN)</option>
                                    <option value="Premium">Premium ($999 MXN)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Código de Acceso Especial (Opcional)</label>
                                <input type="text" value={newTenant.access_code} onChange={e => setNewTenant({...newTenant, access_code: e.target.value})} className="w-full bg-[#f9fafb] border border-[#d1d5db] rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#111827]" placeholder="Ej. TACO-123 (Dejar vacío para auto-generar)" />
                            </div>
                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="w-full bg-[#111827] text-white py-3 rounded-lg font-bold text-sm hover:bg-[#374151] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting ? "Creando..." : "Crear e Invitar"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Edit Tenant Modal */}
            {isEditModalOpen && editingTenant && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 overflow-hidden relative">
                        <button onClick={() => setIsEditModalOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-all"><X className="w-5 h-5" /></button>
                        <h3 className="text-xl font-bold mb-6">Editar Restaurante</h3>
                        <form onSubmit={handleUpdateTenant} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre del Restaurante</label>
                                <input required type="text" value={editingTenant.name} onChange={e => setEditingTenant({...editingTenant, name: e.target.value})} className="w-full bg-[#f9fafb] border border-[#d1d5db] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#111827]" placeholder="Ej. El Buen Sabor" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Plan (Mensual MXN)</label>
                                <select value={editingTenant.plan} onChange={e => setEditingTenant({...editingTenant, plan: e.target.value as any})} className="w-full bg-[#f9fafb] border border-[#d1d5db] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#111827]">
                                    <option value="Basic">Básico ($99 MXN)</option>
                                    <option value="Pro">Pro ($499 MXN)</option>
                                    <option value="Premium">Premium ($999 MXN)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Código de Acceso</label>
                                <input required type="text" value={editingTenant.access_code} onChange={e => setEditingTenant({...editingTenant, access_code: e.target.value})} className="w-full bg-[#f9fafb] border border-[#d1d5db] rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#111827]" />
                            </div>
                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="w-full bg-[#111827] text-white py-3 rounded-lg font-bold text-sm hover:bg-[#374151] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Bottom Nav Mobile */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e7eb] flex justify-around items-center px-4 pb-10 pt-3 z-40">
                <button onClick={() => setActiveView('tenants')} className={`flex flex-col items-center gap-1 ${activeView === 'tenants' ? 'text-[#111827]' : 'text-[#9ca3af]'}`}><Building2 className="w-6 h-6" /><span className="text-[10px] font-bold">Temants</span></button>
                <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-red-500"><LogOut className="w-6 h-6" /><span className="text-[10px] font-bold">Salir</span></button>
            </nav>
        </div>
    );
}

function PlanCard({ name, price, count }: { name: string, price: number, count: number }) {
    return (
        <div className="bg-white p-6 rounded-lg border border-[#e5e7eb] shadow-sm">
            <h4 className="font-bold text-lg mb-1">{name}</h4>
            <p className="text-3xl font-black text-[#111827] mb-6">${price}<span className="text-sm font-medium text-gray-400">/mes</span></p>
            <p className="text-sm text-[#4b5563] font-medium">
                <span className="text-[#111827] font-bold">{count}</span> restaurantes activos.
            </p>
        </div>
    );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
    return (
        <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm font-medium ${active ? "bg-[#f3f4f6] text-[#111827]" : "text-[#4b5563] hover:bg-[#f9fafb] hover:text-[#111827]"}`}>
            <span className={active ? "text-[#111827]" : "text-[#9ca3af]"}>{icon}</span>
            <span>{label}</span>
        </button>
    );
}

function KpiCard({ title, value, icon, trend }: { title: string, value: string | number, icon: React.ReactNode, trend?: string }) {
    return (
        <div className="bg-white p-6 rounded-lg border border-[#e5e7eb] shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
                <h4 className="text-[#6b7280] text-sm font-medium">{title}</h4>
                <div className="p-1.5 bg-[#f3f4f6] rounded-md">{icon}</div>
            </div>
            <div className="flex items-end gap-3">
                <span className="text-3xl font-black tracking-tight text-[#111827]">{value}</span>
                {trend && <span className="text-sm font-medium text-green-600 mb-1">{trend}</span>}
            </div>
        </div>
    );
}
