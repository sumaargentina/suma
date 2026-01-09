"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useSellerNotifications } from '@/lib/seller-notifications';
import { HeaderWrapper } from '@/components/header';
import * as supabaseService from '@/lib/supabaseService';
import type { Doctor, SellerPayment, MarketingMaterial, AdminSupportTicket, Seller } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { } from 'lucide-react';
import { } from "@/components/ui/tabs";
import { ReferralsTab } from './tabs/referrals-tab';
import { FinancesTab } from './tabs/finances-tab';
import { AccountsTab } from './tabs/accounts-tab';
import { MarketingTab } from './tabs/marketing-tab';
import { SupportTab } from './tabs/support-tab';
import { Skeleton } from '../ui/skeleton';

function DashboardLoading() {
  return (
    <>
      <HeaderWrapper />
      <main className="flex-1 container py-12">
        <div className="mb-8">
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
        </div>
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-96 w-full" />
      </main>
    </>
  );
}

export function SellerDashboardClient({ currentTab }: { currentTab: string }) {
  const { user, loading } = useAuth();
  const { checkAndSetSellerNotifications } = useSellerNotifications();
  const router = useRouter();

  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [sellerData, setSellerData] = useState<Seller | null>(null);
  const [referredDoctors, setReferredDoctors] = useState<Doctor[]>([]);
  const [sellerPayments, setSellerPayments] = useState<SellerPayment[]>([]);
  const [marketingMaterials, setMarketingMaterials] = useState<MarketingMaterial[]>([]);
  const [supportTickets, setSupportTickets] = useState<AdminSupportTicket[]>([]);

  const fetchData = useCallback(async () => {
    if (!user || user.role !== 'seller' || !user.id) return;
    setIsLoading(true);
    try {
        const [materials, seller, allDocs, allPayments, allTickets] = await Promise.all([
            supabaseService.getMarketingMaterials(),
            supabaseService.getSeller(user.id),
            supabaseService.getDoctors(),
            supabaseService.getSellerPayments(),
            supabaseService.getSupportTickets(),
        ]);
        
        setMarketingMaterials(materials);
        
        if (seller) {
            setSellerData(seller);
            const filteredDocs = allDocs.filter(d => d.sellerId === seller.id);
            const filteredPayments = allPayments.filter(p => p.sellerId === seller.id);
            const filteredTickets = allTickets.filter(t => t.userId === user.email);
            
            setReferredDoctors(filteredDocs);
            setSellerPayments(filteredPayments);
            setSupportTickets(filteredTickets);
            
            // Actualizar notificaciones
            checkAndSetSellerNotifications(filteredDocs, filteredTickets, filteredPayments);
        }
    } catch (error) {
        console.error("Error fetching seller data:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos del panel.' });
    } finally {
        setIsLoading(false);
    }
  }, [user, toast, checkAndSetSellerNotifications]);

  useEffect(() => {
    if (user?.id) {
        fetchData();
    }
  }, [user, fetchData]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'seller')) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);
  
  if (loading || isLoading || !user || !sellerData) {
    return <DashboardLoading />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <HeaderWrapper />
      <main className="flex-1 bg-muted/40">
        <div className="container py-12">
            <h1 className="text-3xl font-bold font-headline mb-2">Panel de Vendedora</h1>
            <p className="text-muted-foreground mb-8">Bienvenida de nuevo, {user.name}. Aquí puedes gestionar tus médicos y finanzas.</p>

            {/* Elimina el TabsList y los TabsTrigger, y solo renderiza el contenido: */}
            <div className="mt-6">
              {currentTab === "referrals" && (
                <ReferralsTab 
                  referredDoctors={referredDoctors} 
                  referralCode={sellerData.referralCode}
                  onUpdate={fetchData}
                />
              )}
              {currentTab === "finances" && (
                <FinancesTab
                  sellerData={sellerData}
                  sellerPayments={sellerPayments}
                  onUpdate={fetchData}
                />
              )}
              {currentTab === "accounts" && (
                <AccountsTab 
                  sellerData={sellerData}
                  onUpdate={fetchData}
                />
              )}
              {currentTab === "marketing" && (
                <MarketingTab marketingMaterials={marketingMaterials}/>
              )}
              {currentTab === "support" && (
                <SupportTab 
                  supportTickets={supportTickets}
                  sellerData={sellerData}
                  onUpdate={fetchData}
                />
              )}
            </div>
        </div>
      </main>
    </div>
  );
}
