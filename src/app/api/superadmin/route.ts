import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SUPER_ADMIN_KEY = 'SUPER-ADMIN-360';

export async function GET(req: NextRequest) {
    const key = req.headers.get('x-admin-key');
    if (key !== SUPER_ADMIN_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const restaurants = await prisma.restaurant.findMany({
            orderBy: { created_at: 'desc' }
        });
        return NextResponse.json({ data: restaurants });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const key = req.headers.get('x-admin-key');
    if (key !== SUPER_ADMIN_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await req.json();
        const { action, id, data } = body;

        if (action === 'create') {
            const { plan, ...safeData } = data;
            const restaurant = await prisma.restaurant.create({ data: safeData });
            return NextResponse.json({ data: restaurant });
        }

        if (action === 'update' && id) {
            const { plan, ...safeData } = data;
            await prisma.restaurant.update({ where: { id }, data: safeData });
            return NextResponse.json({ data: { success: true } });
        }

        if (action === 'delete' && id) {
            await prisma.restaurant.delete({ where: { id } });
            return NextResponse.json({ data: { success: true } });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
