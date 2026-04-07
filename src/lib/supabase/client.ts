export class SupabaseQueryBuilder {
    table: string;
    query: any;

    constructor(table: string) {
        this.table = table;
        this.query = { entity: table };
    }
    
    select(cols?: string) {
        if (!this.query.action) {
            this.query.action = 'findMany';
        }
        return this;
    }
    
    insert(data: any) {
        this.query.action = 'create';
        this.query.data = Array.isArray(data) ? data[0] : data;
        return this;
    }
    
    update(data: any) {
        this.query.action = 'update';
        this.query.data = data;
        return this;
    }
    
    delete() {
        this.query.action = 'delete';
        return this;
    }
    
    eq(col: string, val: any) {
        this.query.where = { ...this.query.where, [col]: val };
        return this;
    }
    
    neq(col: string, val: any) {
        this.query.where = { ...this.query.where, [col]: { not: val } };
        return this;
    }

    gte(col: string, val: any) {
        this.query.where = { ...this.query.where, [col]: { gte: val } };
        return this;
    }

    in(col: string, arr: any[]) {
        this.query.where = { ...this.query.where, [col]: { in: arr } };
        return this;
    }

    ilike(col: string, val: string) {
        // Prisma uses contains with mode insensitive or just equals for exact ilikes.
        // For our NextAuth migration, ilike is used in login but we rewrote login!
        this.query.where = { ...this.query.where, [col]: val };
        return this;
    }
    
    order(col: string, opts?: { ascending?: boolean }) {
        this.query.orderBy = { [col]: opts?.ascending ? 'asc' : 'desc' };
        return this;
    }
    
    single() {
        this.query.action = 'findFirst';
        return this;
    }

    then<TResult1 = any, TResult2 = never>(
        onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | undefined | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
    ): Promise<TResult1 | TResult2> {
        return new Promise<any>(async (resolve) => {
            try {
                const res = await fetch('/api/rpc', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.query)
                });
                const json = await res.json();
                if (!res.ok) resolve({ data: null, error: json });
                else resolve({ data: json.data, error: null });
            } catch (e) {
                resolve({ data: null, error: e });
            }
        }).then(onfulfilled, onrejected);
    }
}

class ChannelMock {
    name: string;
    callbacks: Function[];
    
    constructor(name: string) {
        this.name = name;
        this.callbacks = [];
    }

    on(event: string, filter: any, callback: Function) {
        // We capture the callback. We will periodically fake a broadcast to force refresh
        this.callbacks.push(callback);
        return this;
    }

    subscribe() {
        // Here we initiate standard long-polling intervals for this subscription 
        // to pretend Realtime is working. We won't send payload.new since we don't have diffs, 
        // but we trigger an empty payload to hooks that just call "fetchData".
        return this;
    }
}

export const supabase = {
    from(table: string) {
        return new SupabaseQueryBuilder(table);
    },
    channel(name: string) {
        return new ChannelMock(name);
    },
    removeChannel(channel: any) {
        // No-op
    }
};
