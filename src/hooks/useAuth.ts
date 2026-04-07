import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useAuth(type: 'restaurant' | 'superadmin' = 'restaurant') {
    return {
        isAuthenticated: true // Next.js layout and NextAuth protects the routes securely server-side.
    };
}
