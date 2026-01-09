"use client";

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ClinicDashboardClient } from '@/components/clinic/clinic-dashboard-client'; // We will create this
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

function DashboardLoading() {
    return (
        <div className="flex h-screen w-full bg-muted/40">
            <div className="hidden border-r bg-background md:block w-[280px]">
                <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                    <Skeleton className="h-6 w-32" />
                </div>
                <div className="p-4 space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                </div>
            </div>
            <div className="flex flex-col flex-1">
                <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
                    <Skeleton className="h-8 w-64" />
                </header>
                <main className="flex-1 p-4 lg:p-6">
                    <Skeleton className="h-64 w-full" />
                </main>
            </div>
        </div>
    );
}

function ClinicDashboardPage() {
    const searchParams = useSearchParams();
    const currentTab = searchParams.get('view') || 'overview';
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/auth/login');
            } else if (user.role !== 'clinic' && user.role !== 'secretary') {
                // Redirect based on role
                if (user.role === 'admin') router.push('/admin/dashboard');
                else if (user.role === 'doctor') router.push('/doctor/dashboard');
                else if (user.role === 'seller') router.push('/seller/dashboard');
                else router.push('/dashboard');
            }
        }
    }, [user, loading, router]);

    if (loading) return <DashboardLoading />;

    if (!user || (user.role !== 'clinic' && user.role !== 'secretary')) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return <ClinicDashboardClient currentTab={currentTab} />;
}

export default function ClinicDashboardPageWrapper() {
    return (
        <Suspense fallback={<DashboardLoading />}>
            <ClinicDashboardPage />
        </Suspense>
    );
}
