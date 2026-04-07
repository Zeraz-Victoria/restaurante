import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { action, entity, data, where, orderBy } = body;

    // Use getToken (reads JWT directly from cookies) — more reliable than getServerSession in App Router
    const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET || 'default-insecure-secret-for-local-dev-only-change-this'
    });

    let restaurantId = token?.sub as string | undefined;
    const isSuperAdmin = restaurantId === 'super-admin';

    if (!restaurantId) {
        // Fallback to payload's restaurant_id if it's a safe public action
        const payloadResId = where?.restaurant_id || data?.restaurant_id ||
                             (where?.AND && where.AND.find((c: any) => c.restaurant_id)?.restaurant_id);

        if (!payloadResId) {
            return NextResponse.json({ error: 'Unauthorized and no restaurant specified' }, { status: 401 });
        }

        // Whitelist public actions (Pseudo RLS)
        const isSafeRead = action === 'findMany' || action === 'findFirst';
        const isSafeWrite = action === 'create' && ['ordenes', 'solicitudes_ayuda', 'resenas', 'facturas'].includes(entity);
        const isSafeUpdate = action === 'update' && entity === 'mesas';

        // Let anyone read products/categories/tables, but restrict writing/updating.
        if ((isSafeRead && ['productos', 'categorias', 'mesas'].includes(entity)) || isSafeWrite || isSafeUpdate) {
            restaurantId = payloadResId;
        } else {
            return NextResponse.json({ error: 'Unauthorized action for public users' }, { status: 401 });
        }
    }

    try {
        let result;

        // Secure mapping of entity strings to Prisma models
        const models: Record<string, any> = {
            'ordenes': prisma.orden,
            'restaurantes': prisma.restaurant,
            'categorias': prisma.categoria,
            'productos': prisma.producto,
            'mesas': prisma.mesa,
            'facturas': prisma.factura,
            'resenas': prisma.resena,
            'solicitudes_ayuda': (prisma as any).solicitudAyuda
        };

        const model = models[entity];
        if (!model && action !== 'custom') {
            return NextResponse.json({ error: 'Model not found' }, { status: 400 });
        }

        // Helper to parse JSON strings
        const processResult = (res: any): any => {
            if (!res) return res;
            if (Array.isArray(res)) return res.map(processResult);
            const r = { ...res };
            ['sizes', 'options', 'extras', 'ingredients', 'items'].forEach(k => {
                if (typeof r[k] === 'string') {
                    try { r[k] = JSON.parse(r[k]); } catch(e) {}
                }
            });
            return r;
        };

        // Helper to stringify JSON arrays for storage
        const processDataIn = (d: any) => {
            const out = { ...d };
            ['sizes', 'options', 'extras', 'ingredients', 'items'].forEach(k => {
                if (out[k] !== undefined && typeof out[k] !== 'string') {
                    out[k] = JSON.stringify(out[k]);
                }
            });
            return out;
        };

        // SuperAdmin and restaurantes entity bypass the restaurant_id filter
        const useUnfilteredWhere = isSuperAdmin || entity === 'restaurantes';

        switch (action) {
            case 'findMany':
                result = await model.findMany({
                    where: useUnfilteredWhere ? (where || {}) : { ...where, restaurant_id: restaurantId },
                    orderBy: orderBy || undefined
                });
                break;
            case 'findFirst':
                result = await model.findFirst({
                    where: useUnfilteredWhere ? (where || {}) : { ...where, restaurant_id: restaurantId },
                    orderBy: orderBy || undefined
                });
                break;
            case 'create':
                const createData = processDataIn({ ...data });
                if (entity !== 'restaurantes') {
                    createData.restaurant_id = restaurantId;
                }
                result = await model.create({ data: createData });
                break;
            case 'update':
                result = await model.updateMany({
                    where: useUnfilteredWhere ? (where || {}) : { ...where, restaurant_id: restaurantId },
                    data: processDataIn(data)
                });
                break;
            case 'delete':
                result = await model.deleteMany({
                    where: useUnfilteredWhere ? (where || {}) : { ...where, restaurant_id: restaurantId }
                });
                break;
            default:
                return NextResponse.json({ error: 'Action not supported' }, { status: 400 });
        }

        return NextResponse.json({ data: processResult(result) });
    } catch (error: any) {
        console.error('RPC Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
