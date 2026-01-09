"use client";

import { HeaderWrapper, BottomNav } from '@/components/header';
import { FamilyTab } from '@/components/patient/tabs/family-tab';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function FamilyPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!user || user.role !== 'patient')) {
            router.push('/auth/login');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="flex flex-col min-h-screen bg-background">
                <HeaderWrapper />
                <main className="flex-1 flex items-center justify-center">
                    <p>Cargando...</p>
                </main>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <HeaderWrapper />
            <main className="flex-1 bg-muted/40 pb-20 md:pb-0">
                <div className="container py-4 md:py-8">
                    {/* Breadcrumb / Back */}
                    <div className="mb-6">
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                                <ArrowLeft className="h-4 w-4" />
                                Volver al Dashboard
                            </Link>
                        </Button>
                    </div>

                    {/* Family Tab Component */}
                    <FamilyTab />
                </div>
            </main>
            <BottomNav />
        </div>
    );
}
