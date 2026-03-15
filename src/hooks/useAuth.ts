import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useAuth(type: 'restaurant' | 'superadmin' = 'restaurant') {
    const router = useRouter();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (type === 'restaurant') {
                const restaurantId = localStorage.getItem('restaurant_id');
                if (!restaurantId) {
                    router.push('/login');
                }
            } else if (type === 'superadmin') {
                const isSuperAdmin = localStorage.getItem('superadmin_logged_in');
                if (isSuperAdmin !== 'true') {
                    // Redirect to a superadmin login if we had one, 
                    // otherwise back to main login for now as it has the link
                    router.push('/login');
                }
            }
        }
    }, [router, type]);

    return {
        isAuthenticated: typeof window !== 'undefined' ? 
            (type === 'restaurant' ? !!localStorage.getItem('restaurant_id') : localStorage.getItem('superadmin_logged_in') === 'true') 
            : false
    };
}
