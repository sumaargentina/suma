"use client";

import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/lib/settings";
import { uploadPublicImage } from '@/lib/supabaseService';
import { PharmacyProduct, DoctorPharmacySponsorship, Pharmacy, PharmacyRecipeOrder } from '@/lib/types';
import { PharmacyShowcaseModal } from './pharmacy-showcase-modal';
import {
  Sparkles,
  FileSpreadsheet,
  Upload,
  Download,
  Plus,
  Minus,
  Search,
  Tag,
  CheckCircle2,
  XCircle,
  Edit3,
  Trash2,
  Image as ImageIcon,
  Stethoscope,
  Handshake,
  MessageSquare,
  Send,
  MapPin,
  Building2,
  Globe,
  DollarSign,
  ShieldCheck,
  Loader2,
  Eye,
  Crown,
  CreditCard,
  Check,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  ShoppingBag,
  Truck,
  Store,
  Ticket,
  RefreshCw,
  BarChart3,
  MousePointerClick,
  Package,
  ClipboardPaste,
  FileText,
  Phone
} from 'lucide-react';

interface PharmacyB2BModuleProps {
  pharmacyId: string;
  pharmacyData: Partial<Pharmacy> & { id: string; name: string; city?: string; chainName?: string; branchName?: string };
  onPharmacyUpdated?: () => void;
}

export function PharmacyB2BModule({
  pharmacyId,
  pharmacyData,
  onPharmacyUpdated
}: PharmacyB2BModuleProps) {
  const { toast } = useToast();
  const excelInputRef = useRef<HTMLInputElement | null>(null);

  const [subTab, setSubTab] = useState<'catalog' | 'orders' | 'doctors' | 'alliances' | 'subscription'>('catalog');

  // Estado Suscripción B2B según el país de la farmacia + Convenios Super Admin
  const { getCountryPricing, companyBankDetails } = useSettings();
  const pharmacyPricing = getCountryPricing(pharmacyData.country);
  const effectiveBcv = pharmacyPricing.exchangeRate;
  const [planStatus, setPlanStatus] = useState<'inactive' | 'pending_verification' | 'active'>('inactive');
  const [nextPaymentDate, setNextPaymentDate] = useState<string | null>(null);
  const [discountPercentage, setDiscountPercentage] = useState<number>(Number(pharmacyData.discountPercentage ?? pharmacyData.discount_percentage ?? 0));
  const [freeMonths, setFreeMonths] = useState<number>(Number(pharmacyData.freeMonths ?? pharmacyData.free_months ?? 0));
  const [agreementNotes, setAgreementNotes] = useState<string>(pharmacyData.agreementNotes || pharmacyData.agreement_notes || '');
  const [activatingPlan, setActivatingPlan] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Pago Móvil / Transferencia Bs. (Tasa BCV)');
  const [transactionId, setTransactionId] = useState('');

  const effectiveFeeUsd = Math.round(pharmacyPricing.pharmacyB2BMonthlyFee * (1 - Math.min(100, Math.max(0, discountPercentage)) / 100) * 100) / 100;
  const effectiveFeeBs = effectiveFeeUsd * effectiveBcv;

  // Estado Catálogo de Productos (Manual + Excel + Cantidades SUMA + Indicaciones + WebP)
  const [products, setProducts] = useState<PharmacyProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productFilter, setProductFilter] = useState<'all' | 'promo' | 'available' | 'unavailable'>('all');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');

  // Modal Crear / Editar Producto Manual
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PharmacyProduct | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingProductImageId, setUploadingProductImageId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    genericName: '',
    presentation: '',
    category: 'Medicamentos',
    stockQuantity: '',
    isAvailable: true,
    isPromotion: false,
    promoLabel: '',
    referencePrice: '',
    promoPrice: '',
    imageUrl: '',
    description: '',
    usageIndications: ''
  });

  // Estado Pedidos 1-Clic (Módulo 3) y Recompras Crónicas (Módulo 5)
  const [orders, setOrders] = useState<PharmacyRecipeOrder[]>([]);
  const [chronicRefills, setChronicRefills] = useState<{ orders: PharmacyRecipeOrder[]; records: any[] }>({
    orders: [],
    records: []
  });
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [quotingOrder, setQuotingOrder] = useState<PharmacyRecipeOrder | null>(null);
  const [quoteForm, setQuoteForm] = useState({
    quotedTotalUsd: '',
    quotedTotalBs: '',
    pharmacyNotes: '',
    status: 'quoted' as PharmacyRecipeOrder['status']
  });
  const [savingOrderQuote, setSavingOrderQuote] = useState(false);

  // Estado Directorio de Médicos y Alianzas (Match + ROI + Cupones)
  const [availableDoctors, setAvailableDoctors] = useState<any[]>([]);
  const [sponsorships, setSponsorships] = useState<DoctorPharmacySponsorship[]>([]);
  const [loadingB2B, setLoadingB2B] = useState(false);
  const [doctorCityFilter, setDoctorCityFilter] = useState('all');
  const [doctorSpecialtyFilter, setDoctorSpecialtyFilter] = useState('all');
  const [doctorSearch, setDoctorSearch] = useState('');

  // Modal Solicitar Patrocinio a Médico
  const [requestDoctorModal, setRequestDoctorModal] = useState<any | null>(null);
  const [requestScope, setRequestScope] = useState<'city' | 'national'>('city');
  const [requestCity, setRequestCity] = useState(pharmacyData.city || '');
  const [requestChain, setRequestChain] = useState(pharmacyData.chainName || '');
  const [requestAgreementType, setRequestAgreementType] = useState<'monthly_fixed' | 'per_recipe_percentage' | 'patient_discount' | 'custom'>('monthly_fixed');
  const [requestAgreementValue, setRequestAgreementValue] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  // Modal Sala de Negociación y Chat (Match + Módulo 4 Cupones)
  const [activeNegotiation, setActiveNegotiation] = useState<DoctorPharmacySponsorship | null>(null);
  const [chatText, setChatText] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [updatingTerms, setUpdatingTerms] = useState(false);
  const [termsForm, setTermsForm] = useState({
    scopeType: 'city' as 'city' | 'national',
    targetCity: '',
    chainName: '',
    agreementType: 'monthly_fixed' as 'monthly_fixed' | 'per_recipe_percentage' | 'patient_discount' | 'custom',
    agreementValue: '',
    agreementNotes: '',
    hasPatientCoupon: false,
    couponCode: '',
    couponDiscountPercent: '10',
    couponDescription: ''
  });

  // Vista Previa Tarjeta Pública Interactiva
  const [isShowcaseOpen, setIsShowcaseOpen] = useState(false);

  const loadSubscriptionAndData = async () => {
    if (!pharmacyId) return;
    try {
      const subRes = await fetch(`/api/pharmacy/subscription?pharmacyId=${pharmacyId}`);
      if (subRes.ok) {
        const subData = await subRes.json();
        setPlanStatus(subData.pharmacy?.sponsorship_plan_status || 'inactive');
        setNextPaymentDate(subData.pharmacy?.sponsorship_next_payment_date || null);
        if (subData.pharmacy?.discount_percentage !== undefined) {
          setDiscountPercentage(Number(subData.pharmacy.discount_percentage || 0));
        }
        if (subData.pharmacy?.free_months !== undefined) {
          setFreeMonths(Number(subData.pharmacy.free_months || 0));
        }
        if (subData.pharmacy?.agreement_notes !== undefined) {
          setAgreementNotes(subData.pharmacy.agreement_notes || '');
        }
      }
    } catch (e) {
      console.error('Error cargando suscripción:', e);
    }
  };

  const loadProducts = async () => {
    if (!pharmacyId) return;
    try {
      setLoadingProducts(true);
      const res = await fetch(`/api/pharmacy/products?pharmacyId=${pharmacyId}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Error cargando catálogo de farmacia:', e);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadOrdersAndRefills = async () => {
    if (!pharmacyId) return;
    try {
      setLoadingOrders(true);
      const [ordRes, refRes] = await Promise.all([
        fetch(`/api/pharmacy/orders?pharmacyId=${pharmacyId}`),
        fetch(`/api/pharmacy/orders?pharmacyId=${pharmacyId}&mode=chronic_refills`)
      ]);
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        setOrders(Array.isArray(ordData) ? ordData : []);
      }
      if (refRes.ok) {
        const refData = await refRes.json();
        setChronicRefills({
          orders: Array.isArray(refData.orders) ? refData.orders : [],
          records: Array.isArray(refData.records) ? refData.records : []
        });
      }
    } catch (e) {
      console.error('Error cargando pedidos 1-clic:', e);
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadB2BDirectoryAndSponsorships = async () => {
    if (!pharmacyId) return;
    try {
      setLoadingB2B(true);
      const dirParams = new URLSearchParams({ mode: 'directory', pharmacyId });
      if (pharmacyData?.country) dirParams.set('country', pharmacyData.country);
      const [dirRes, sponRes] = await Promise.all([
        fetch(`/api/pharmacy/sponsorships?${dirParams.toString()}`),
        fetch(`/api/pharmacy/sponsorships?pharmacyId=${pharmacyId}`)
      ]);

      if (dirRes.ok) {
        const dirData = await dirRes.json();
        setAvailableDoctors(dirData.doctors || []);
      }
      if (sponRes.ok) {
        const sponData = await sponRes.json();
        setSponsorships(Array.isArray(sponData) ? sponData : []);
      }
    } catch (e) {
      console.error('Error cargando directorio B2B:', e);
    } finally {
      setLoadingB2B(false);
    }
  };

  useEffect(() => {
    loadSubscriptionAndData();
    loadProducts();
    loadOrdersAndRefills();
    loadB2BDirectoryAndSponsorships();
  }, [pharmacyId]);

  // ---------------------------------------------------------------------------
  // 1. SUSCRIPCIÓN PLAN PREMIUM B2B ($200 USD/MES)
  // ---------------------------------------------------------------------------
  const handleActivatePlan = async (autoApprove: boolean) => {
    try {
      setActivatingPlan(true);
      const res = await fetch('/api/pharmacy/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacyId,
          pharmacyName: pharmacyData.chainName || pharmacyData.name,
          amount: effectiveFeeUsd,
          paymentMethod,
          transactionId: transactionId.trim() || `SUMA-B2B-${Date.now().toString().slice(-6)}`,
          autoApprove
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar suscripción');

      setPlanStatus(data.planStatus);
      setNextPaymentDate(data.nextPaymentDate);
      toast({
        title: autoApprove ? '🎉 Plan B2B Patrocinio Activado ($200/mes)' : 'Comprobante enviado a SUMA',
        description: data.message
      });
      if (onPharmacyUpdated) onPharmacyUpdated();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error en suscripción',
        description: err.message
      });
    } finally {
      setActivatingPlan(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 2. PLANTILLA EXCEL E IMPORTACIÓN MASIVA (OPCIONAL)
  // ---------------------------------------------------------------------------
  const handleDownloadExcelTemplate = () => {
    const sampleRows = [
      {
        Medicamento: 'Losartán Potásico 50mg',
        'Principio Activo': 'Losartán',
        Presentacion: 'Caja x 30 Tabletas Recubiertas',
        Categoria: 'Antihipertensivos',
        'Cantidad SUMA': 25,
        Disponible: 'SI',
        'En Promocion': 'SI',
        'Etiqueta Promocion': '20% Descuento',
        'Precio Referencia': 8.5,
        'Precio Promocion': 6.8,
        Descripcion: 'Tratamiento de hipertensión arterial.',
        Indicaciones: 'Tomar 1 tableta cada 24 horas según indicación médica.'
      },
      {
        Medicamento: 'Amoxicilina + Ácido Clavulánico 875/125mg',
        'Principio Activo': 'Amoxicilina / Clavulanato',
        Presentacion: 'Caja x 14 Comprimidos',
        Categoria: 'Antibióticos',
        'Cantidad SUMA': 15,
        Disponible: 'SI',
        'En Promocion': 'NO',
        'Etiqueta Promocion': '',
        'Precio Referencia': 14.0,
        'Precio Promocion': '',
        Descripcion: 'Antibiótico de amplio espectro.',
        Indicaciones: '1 comprimido cada 12 horas por 7 días con las comidas.'
      },
      {
        Medicamento: 'Vitamina C 1000mg + Zinc Efervescente',
        'Principio Activo': 'Ácido Ascórbico + Zinc',
        Presentacion: 'Tubo x 20 Tabletas',
        Categoria: 'Vitaminas y Suplementos',
        'Cantidad SUMA': 40,
        Disponible: 'SI',
        'En Promocion': 'SI',
        'Etiqueta Promocion': '2x1 Pacientes SUMA',
        'Precio Referencia': 7.0,
        'Precio Promocion': 3.5,
        Descripcion: 'Refuerzo inmunológico antioxidante.',
        Indicaciones: 'Disolver 1 tableta efervescente en un vaso de agua al día.'
      },
      {
        Medicamento: 'Ibuprofeno 600mg',
        'Principio Activo': 'Ibuprofeno',
        Presentacion: 'Blíster x 10 Cápsulas Blandas',
        Categoria: 'Analgésicos y Antiinflamatorios',
        'Cantidad SUMA': 30,
        Disponible: 'SI',
        'En Promocion': 'NO',
        'Etiqueta Promocion': '',
        'Precio Referencia': 3.2,
        'Precio Promocion': '',
        Descripcion: 'Alivio rápido del dolor e inflamación.',
        Indicaciones: '1 cápsula cada 8 horas después de comer.'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Catalogo_SUMA');
    XLSX.writeFile(workbook, `Plantilla_Catalogo_Farmacia_SUMA.xlsx`);

    toast({
      title: 'Plantilla Excel descargada',
      description: 'Incluye columnas de Cantidad SUMA, Descripción e Indicaciones.'
    });
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingExcel(true);
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!rawRows || rawRows.length === 0) {
        throw new Error('El archivo Excel está vacío o no tiene filas válidas.');
      }

      const parseBool = (val: any, defaultVal = true) => {
        if (val === undefined || val === null || val === '') return defaultVal;
        const s = String(val).trim().toLowerCase();
        if (['si', 'sí', 'yes', 'true', '1', 'disponible', 'activo', 'promo'].includes(s)) return true;
        if (['no', 'false', '0', 'agotado', 'inactivo'].includes(s)) return false;
        return defaultVal;
      };

      const mappedProducts = rawRows
        .map((row) => {
          const name =
            row['Medicamento'] ||
            row['medicamento'] ||
            row['Nombre'] ||
            row['nombre'] ||
            row['Producto'] ||
            row['producto'] ||
            row['name'] ||
            '';
          if (!String(name).trim()) return null;

          const genericName =
            row['Principio Activo'] ||
            row['principio_activo'] ||
            row['Componente'] ||
            row['Genérico'] ||
            row['Generico'] ||
            row['genericName'] ||
            '';

          const presentation =
            row['Presentacion'] ||
            row['Presentación'] ||
            row['presentacion'] ||
            row['Formato'] ||
            row['presentation'] ||
            '';

          const category =
            row['Categoria'] ||
            row['Categoría'] ||
            row['categoria'] ||
            row['category'] ||
            'Medicamentos';

          const rawQty =
            row['Cantidad SUMA'] ??
            row['Cantidad'] ??
            row['Stock'] ??
            row['stock'] ??
            row['Unidades'] ??
            row['stockQuantity'];

          const stockQuantity =
            rawQty !== '' && rawQty !== undefined && rawQty !== null && !isNaN(Number(rawQty))
              ? Math.max(0, Math.floor(Number(rawQty)))
              : null;

          let isAvailable = parseBool(
            row['Disponible'] ?? row['disponible'] ?? row['Disponibilidad'] ?? row['isAvailable'],
            true
          );
          if (stockQuantity !== null) {
            isAvailable = stockQuantity > 0;
          }

          const isPromotion = parseBool(
            row['En Promocion'] ?? row['En Promoción'] ?? row['Promocion'] ?? row['Promoción'] ?? row['isPromotion'],
            false
          );

          const promoLabel =
            row['Etiqueta Promocion'] ||
            row['Etiqueta Promoción'] ||
            row['Oferta'] ||
            row['promoLabel'] ||
            '';

          const refPriceRaw = row['Precio Referencia'] ?? row['Precio'] ?? row['referencePrice'];
          const promoPriceRaw = row['Precio Promocion'] ?? row['Precio Promoción'] ?? row['Precio Oferta'] ?? row['promoPrice'];

          const referencePrice =
            refPriceRaw !== '' && refPriceRaw !== undefined && !isNaN(Number(refPriceRaw))
              ? Number(refPriceRaw)
              : null;
          const promoPrice =
            promoPriceRaw !== '' && promoPriceRaw !== undefined && !isNaN(Number(promoPriceRaw))
              ? Number(promoPriceRaw)
              : null;

          const description = row['Descripcion'] || row['Descripción'] || row['Notas'] || row['description'] || '';
          const usageIndications =
            row['Indicaciones'] ||
            row['indicaciones'] ||
            row['Posologia'] ||
            row['Posología'] ||
            row['Modo de Uso'] ||
            row['usageIndications'] ||
            '';

          return {
            name: String(name).trim(),
            genericName: String(genericName).trim() || null,
            presentation: String(presentation).trim() || null,
            category: String(category).trim() || 'Medicamentos',
            stockQuantity,
            isAvailable,
            isPromotion,
            promoLabel: String(promoLabel).trim() || (isPromotion ? 'En Promoción' : null),
            referencePrice,
            promoPrice,
            description: String(description).trim() || null,
            usageIndications: String(usageIndications).trim() || null
          };
        })
        .filter(Boolean);

      if (mappedProducts.length === 0) {
        throw new Error('No se encontraron medicamentos con la columna "Medicamento" o "Nombre".');
      }

      const res = await fetch('/api/pharmacy/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacyId,
          mode: importMode,
          products: mappedProducts
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar catálogo Excel');

      toast({
        title: `✅ Catálogo Excel cargado (${data.count || mappedProducts.length} productos)`,
        description: 'Puedes editar cualquier producto manualmente, ajustar su cantidad SUMA o pegar su foto en formato WebP.'
      });

      await loadProducts();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error al importar archivo Excel',
        description: err.message
      });
    } finally {
      setUploadingExcel(false);
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  // ---------------------------------------------------------------------------
  // 3. GESTIÓN MANUAL DE PRODUCTOS, CANTIDADES SUMA E IMÁGENES WEBP (SUBIR O PEGAR CTRL+V)
  // ---------------------------------------------------------------------------
  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      genericName: '',
      presentation: '',
      category: 'Medicamentos',
      stockQuantity: '10',
      isAvailable: true,
      isPromotion: false,
      promoLabel: '',
      referencePrice: '',
      promoPrice: '',
      imageUrl: '',
      description: '',
      usageIndications: ''
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: PharmacyProduct) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name || '',
      genericName: prod.genericName || '',
      presentation: prod.presentation || '',
      category: prod.category || 'Medicamentos',
      stockQuantity: prod.stockQuantity !== null && prod.stockQuantity !== undefined ? String(prod.stockQuantity) : '',
      isAvailable: prod.isAvailable,
      isPromotion: prod.isPromotion,
      promoLabel: prod.promoLabel || '',
      referencePrice: prod.referencePrice !== null && prod.referencePrice !== undefined ? String(prod.referencePrice) : '',
      promoPrice: prod.promoPrice !== null && prod.promoPrice !== undefined ? String(prod.promoPrice) : '',
      imageUrl: prod.imageUrl || '',
      description: prod.description || '',
      usageIndications: prod.usageIndications || ''
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProductModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) return;

    const parsedStock =
      productForm.stockQuantity !== '' && !isNaN(Number(productForm.stockQuantity))
        ? Math.max(0, Math.floor(Number(productForm.stockQuantity)))
        : null;

    const computedAvailable = parsedStock !== null ? parsedStock > 0 : productForm.isAvailable;

    try {
      setSavingProduct(true);
      if (editingProduct) {
        const res = await fetch('/api/pharmacy/products', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingProduct.id,
            name: productForm.name.trim(),
            genericName: productForm.genericName.trim() || null,
            presentation: productForm.presentation.trim() || null,
            category: productForm.category.trim() || 'Medicamentos',
            stockQuantity: parsedStock,
            isAvailable: computedAvailable,
            isPromotion: productForm.isPromotion,
            promoLabel: productForm.promoLabel.trim() || null,
            referencePrice: productForm.referencePrice ? Number(productForm.referencePrice) : null,
            promoPrice: productForm.promoPrice ? Number(productForm.promoPrice) : null,
            imageUrl: productForm.imageUrl.trim() || null,
            description: productForm.description.trim() || null,
            usageIndications: productForm.usageIndications.trim() || null
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al actualizar');
        setProducts(prev => prev.map(p => (p.id === editingProduct.id ? data : p)));
        toast({ title: 'Producto actualizado', description: `${data.name} se actualizó correctamente.` });
      } else {
        const res = await fetch('/api/pharmacy/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pharmacyId,
            product: {
              name: productForm.name.trim(),
              genericName: productForm.genericName.trim() || null,
              presentation: productForm.presentation.trim() || null,
              category: productForm.category.trim() || 'Medicamentos',
              stockQuantity: parsedStock,
              isAvailable: computedAvailable,
              isPromotion: productForm.isPromotion,
              promoLabel: productForm.promoLabel.trim() || null,
              referencePrice: productForm.referencePrice ? Number(productForm.referencePrice) : null,
              promoPrice: productForm.promoPrice ? Number(productForm.promoPrice) : null,
              imageUrl: productForm.imageUrl.trim() || null,
              description: productForm.description.trim() || null,
              usageIndications: productForm.usageIndications.trim() || null
            }
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al crear producto');
        await loadProducts();
        toast({ title: 'Producto cargado manualmente', description: `${productForm.name} fue añadido a tu catálogo SUMA.` });
      }
      setIsProductModalOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setSavingProduct(false);
    }
  };

  const handleQuickAdjustStock = async (prod: PharmacyProduct, delta: number) => {
    const current = prod.stockQuantity !== null && prod.stockQuantity !== undefined ? prod.stockQuantity : (prod.isAvailable ? 1 : 0);
    const nextQty = Math.max(0, current + delta);
    try {
      const res = await fetch('/api/pharmacy/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: prod.id,
          stockQuantity: nextQty,
          isAvailable: nextQty > 0
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setProducts(prev => prev.map(p => (p.id === prod.id ? updated : p)));
      }
    } catch (e) {
      console.error('Error ajustando stock SUMA:', e);
    }
  };

  const handleQuickToggleProduct = async (prod: PharmacyProduct, field: 'isAvailable' | 'isPromotion') => {
    try {
      const nextVal = !prod[field];
      const payload: Record<string, any> = {
        id: prod.id,
        [field]: nextVal
      };
      if (field === 'isAvailable') {
        if (!nextVal && prod.stockQuantity && prod.stockQuantity > 0) {
          payload.stockQuantity = 0;
        } else if (nextVal && prod.stockQuantity === 0) {
          payload.stockQuantity = 10;
        }
      }
      if (field === 'isPromotion' && nextVal && !prod.promoLabel) {
        payload.promoLabel = 'Oferta Especial';
      }
      const res = await fetch('/api/pharmacy/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updated = await res.json();
        setProducts(prev => prev.map(p => (p.id === prod.id ? updated : p)));
      }
    } catch (e) {
      console.error('Error actualizando producto:', e);
    }
  };

  const handleUploadProductWebPImage = async (file: File, targetProduct?: PharmacyProduct) => {
    try {
      if (targetProduct) setUploadingProductImageId(targetProduct.id);
      else setUploadingProductImageId('modal');

      // uploadPublicImage comprime y convierte automáticamente a formato .webp
      const webpUrl = await uploadPublicImage(file, 'profile-images', 'pharmacies/products');

      if (targetProduct) {
        const res = await fetch('/api/pharmacy/products', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: targetProduct.id, imageUrl: webpUrl })
        });
        if (res.ok) {
          const updated = await res.json();
          setProducts(prev => prev.map(p => (p.id === targetProduct.id ? updated : p)));
          toast({
            title: 'Imagen WebP optimizada y guardada',
            description: `La foto de ${targetProduct.name} se comprimió en formato WebP ultraligero.`
          });
        }
      } else {
        setProductForm(prev => ({ ...prev, imageUrl: webpUrl }));
        toast({
          title: 'Foto convertida a WebP',
          description: 'Imagen lista para guardar con el producto.'
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error al procesar imagen WebP',
        description: err.message
      });
    } finally {
      setUploadingProductImageId(null);
    }
  };

  // Soporte para Copiar y Pegar Foto (Ctrl+V) directamente en el modal de producto
  const handlePasteImageInModal = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          await handleUploadProductWebPImage(file);
        }
        return;
      }
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const res = await fetch(`/api/pharmacy/products?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== id));
        toast({ title: 'Producto eliminado del catálogo' });
      }
    } catch (e) {
      console.error('Error eliminando producto:', e);
    }
  };

  // ---------------------------------------------------------------------------
  // 4. GESTIÓN DE PEDIDOS 1-CLIC (MÓDULO 3) Y RECOMPRAS CRÓNICAS (MÓDULO 5)
  // ---------------------------------------------------------------------------
  const handleOpenQuoteOrder = (order: PharmacyRecipeOrder) => {
    setQuotingOrder(order);
    setQuoteForm({
      quotedTotalUsd: order.quotedTotalUsd !== null && order.quotedTotalUsd !== undefined ? String(order.quotedTotalUsd) : '',
      quotedTotalBs: order.quotedTotalBs !== null && order.quotedTotalBs !== undefined ? String(order.quotedTotalBs) : '',
      pharmacyNotes: order.pharmacyNotes || '',
      status: order.status === 'pending' ? 'quoted' : order.status
    });
  };

  const handleSaveOrderUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotingOrder) return;
    try {
      setSavingOrderQuote(true);
      const res = await fetch('/api/pharmacy/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: quotingOrder.id,
          status: quoteForm.status,
          quotedTotalUsd: quoteForm.quotedTotalUsd !== '' ? Number(quoteForm.quotedTotalUsd) : null,
          quotedTotalBs: quoteForm.quotedTotalBs !== '' ? Number(quoteForm.quotedTotalBs) : null,
          pharmacyNotes: quoteForm.pharmacyNotes.trim() || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar el pedido');

      setOrders(prev => prev.map(o => (o.id === data.id ? data : o)));
      if (quoteForm.status === 'completed') {
        await loadProducts(); // Refrescar stock SUMA descontado automáticamente
      }
      toast({
        title:
          quoteForm.status === 'completed'
            ? '✅ Pedido Entregado y Stock SUMA Actualizado'
            : '📋 Cotización / Estado Actualizado',
        description: `El pedido de ${quotingOrder.patientName} ahora está en estado "${quoteForm.status}".`
      });
      setQuotingOrder(null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setSavingOrderQuote(false);
    }
  };

  const handleSendRefillWhatsAppReminder = (patientName: string, patientPhone: string | null | undefined, prescriptionText: string, nextRefillDate?: string | null) => {
    const cleanPhone = (patientPhone || '').replace(/\D/g, '');
    const text = `Hola ${patientName}, te saludamos desde *${pharmacyData.chainName || pharmacyData.name}* a través de SUMA Salud 🏥.\n\nTe recordamos que tu tratamiento mensual (${prescriptionText.slice(0, 80)}...) tiene fecha estimada de reposición (${nextRefillDate || 'próximos días'}).\n\n¿Deseas que te lo apartemos en mostrador o te lo enviemos a domicilio?`;
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    } else {
      navigator.clipboard?.writeText(text);
      toast({
        title: 'Mensaje copiado al portapapeles',
        description: 'El paciente no tiene teléfono registrado; hemos copiado el recordatorio.'
      });
    }
  };

  // ---------------------------------------------------------------------------
  // 5. SOLICITUDES B2B, MATCH, NEGOCIACIÓN Y CUPONES (MÓDULO 2 Y MÓDULO 4)
  // ---------------------------------------------------------------------------
  const handleSendSponsorshipRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestDoctorModal) return;

    if (planStatus !== 'active') {
      toast({
        variant: 'destructive',
        title: 'Suscripción B2B requerida ($200/mes)',
        description: 'Activa tu Plan B2B de Patrocinio para enviar solicitudes y negociar con médicos.'
      });
      setRequestDoctorModal(null);
      setSubTab('subscription');
      return;
    }

    try {
      setSendingRequest(true);
      const res = await fetch('/api/pharmacy/sponsorships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: requestDoctorModal.id,
          pharmacyId,
          initiatedBy: 'pharmacy',
          scopeType: requestScope,
          targetCity: requestScope === 'city' ? (requestCity || pharmacyData.city || requestDoctorModal.city) : null,
          chainName: requestScope === 'national' ? (requestChain || pharmacyData.chainName || pharmacyData.name) : null,
          agreementType: requestAgreementType,
          agreementValue: requestAgreementValue.trim() || null,
          initialMessage:
            requestMessage.trim() ||
            `Hola Dr(a). ${requestDoctorModal.name}, desde ${pharmacyData.chainName || pharmacyData.name} nos gustaría patrocinar sus récipes médicos y acordar beneficios para usted y sus pacientes.`,
          senderName: pharmacyData.chainName || pharmacyData.name
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar la solicitud');

      toast({
        title: data.status === 'matched' ? '🎉 ¡Match Instantáneo!' : 'Solicitud de Patrocinio Enviada',
        description:
          data.status === 'matched'
            ? 'Ambos tenían interés mutuo. Ya puedes abrir la ventana de negociación.'
            : `Se envió la invitación a Dr(a). ${requestDoctorModal.name}. Cuando acepte se abrirá el chat de negociación.`
      });

      setRequestDoctorModal(null);
      await loadB2BDirectoryAndSponsorships();
      setSubTab('alliances');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setSendingRequest(false);
    }
  };

  const handleSponsorshipAction = async (
    sponsorshipId: string,
    action: 'accept_match' | 'activate_alliance' | 'pause_alliance' | 'reject',
    extraPayload: Record<string, any> = {}
  ) => {
    try {
      const res = await fetch('/api/pharmacy/sponsorships', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sponsorshipId,
          action,
          actorRole: 'pharmacy',
          senderName: pharmacyData.chainName || pharmacyData.name,
          ...extraPayload
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar alianza');

      setSponsorships(prev => prev.map(s => (s.id === sponsorshipId ? data : s)));
      if (activeNegotiation?.id === sponsorshipId) {
        setActiveNegotiation(data);
      }

      if (action === 'accept_match') {
        toast({
          title: '🤝 ¡Match Confirmado!',
          description: 'Se ha habilitado la ventana de comunicación para negociar el acuerdo y el cupón de descuento.'
        });
        setActiveNegotiation(data);
        openNegotiationModal(data);
      } else if (action === 'activate_alliance') {
        toast({
          title: '🚀 ¡Alianza Comercial Activada!',
          description: 'Ahora cada vez que este médico emita un récipe, tu farmacia aparecerá recomendada a sus pacientes.'
        });
      } else if (action === 'pause_alliance') {
        toast({ title: 'Alianza en modo negociación', description: 'Se pausó temporalmente la recomendación.' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  const generateDefaultCouponCode = (docName?: string, pct?: string | number) => {
    const cleanDoc = (docName || 'MED')
      .split(' ')
      .filter(Boolean)
      .slice(-1)[0]
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 6);
    return `DR-${cleanDoc || 'SUMA'}-${pct || 10}`;
  };

  const openNegotiationModal = (spon: DoctorPharmacySponsorship) => {
    setActiveNegotiation(spon);
    setTermsForm({
      scopeType: spon.scopeType === 'national' ? 'national' : 'city',
      targetCity: spon.targetCity || pharmacyData.city || spon.doctor?.city || '',
      chainName: spon.chainName || pharmacyData.chainName || pharmacyData.name || '',
      agreementType: (spon.agreementType as any) || 'monthly_fixed',
      agreementValue: spon.agreementValue || '',
      agreementNotes: spon.agreementNotes || '',
      hasPatientCoupon: Boolean(spon.hasPatientCoupon),
      couponCode: spon.couponCode || generateDefaultCouponCode(spon.doctor?.name, spon.couponDiscountPercent || 10),
      couponDiscountPercent: String(spon.couponDiscountPercent || 10),
      couponDescription: spon.couponDescription || 'Descuento especial presentando este récipe médico'
    });
    fetch('/api/pharmacy/sponsorships', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: spon.id, action: 'mark_read', actorRole: 'pharmacy' })
    }).catch(() => {});
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNegotiation || !chatText.trim()) return;
    try {
      setSendingChat(true);
      const res = await fetch('/api/pharmacy/sponsorships', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeNegotiation.id,
          action: 'send_message',
          actorRole: 'pharmacy',
          senderName: pharmacyData.chainName || pharmacyData.name,
          messageText: chatText.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar mensaje');
      setActiveNegotiation(data);
      setSponsorships(prev => prev.map(s => (s.id === data.id ? data : s)));
      setChatText('');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error al enviar mensaje', description: err.message });
    } finally {
      setSendingChat(false);
    }
  };

  const handleSaveTerms = async () => {
    if (!activeNegotiation) return;
    try {
      setUpdatingTerms(true);
      const res = await fetch('/api/pharmacy/sponsorships', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeNegotiation.id,
          action: 'update_terms',
          actorRole: 'pharmacy',
          senderName: pharmacyData.chainName || pharmacyData.name,
          ...termsForm,
          couponDiscountPercent: Number(termsForm.couponDiscountPercent) || 0
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar propuesta');
      setActiveNegotiation(data);
      setSponsorships(prev => prev.map(s => (s.id === data.id ? data : s)));
      toast({
        title: 'Propuesta comercial y cupón actualizados',
        description: 'Los términos fueron registrados en la sala de negociación con el médico.'
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setUpdatingTerms(false);
    }
  };

  // Filtros
  const filteredProducts = products.filter(p => {
    if (productFilter === 'promo' && !p.isPromotion) return false;
    if (productFilter === 'available' && !p.isAvailable) return false;
    if (productFilter === 'unavailable' && p.isAvailable) return false;
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.genericName && p.genericName.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  });

  const doctorCities = Array.from(new Set(availableDoctors.map(d => d.city).filter(Boolean))).sort();
  const doctorSpecialties = Array.from(new Set(availableDoctors.map(d => d.specialty).filter(Boolean))).sort();

  const filteredDoctors = availableDoctors.filter(d => {
    if (doctorCityFilter !== 'all' && d.city?.toLowerCase() !== doctorCityFilter.toLowerCase()) return false;
    if (doctorSpecialtyFilter !== 'all' && d.specialty !== doctorSpecialtyFilter) return false;
    if (!doctorSearch.trim()) return true;
    const q = doctorSearch.toLowerCase();
    return (
      d.name?.toLowerCase().includes(q) ||
      d.specialty?.toLowerCase().includes(q) ||
      d.city?.toLowerCase().includes(q)
    );
  });

  const getExistingSponsorshipWithDoctor = (docId: string) =>
    sponsorships.find(s => s.doctorId === docId);

  // Totales de ROI (Módulo 2)
  const totalImpressions = sponsorships.reduce((acc, s) => acc + (s.impressionsCount || 0), 0);
  const totalCardClicks = sponsorships.reduce((acc, s) => acc + (s.cardClicksCount || 0), 0);
  const totalWhatsappClicks = sponsorships.reduce((acc, s) => acc + (s.whatsappClicksCount || 0), 0);
  const totalOrdersCount = sponsorships.reduce((acc, s) => acc + (s.ordersCount || 0), 0) || orders.length;
  const totalDispensedCount = sponsorships.reduce((acc, s) => acc + (s.dispensedRecipesCount || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in-50">
      {/* Banner Principal del Módulo B2B Comercial */}
      <Card className="border-teal-200 bg-gradient-to-r from-slate-900 via-teal-950 to-emerald-950 text-white rounded-2xl overflow-hidden shadow-lg">
        <CardContent className="p-6 sm:p-7">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-amber-400 text-slate-950 font-extrabold text-[11px] px-2.5 py-0.5 border-0">
                  <Crown className="h-3.5 w-3.5 mr-1 text-slate-950" />
                  MÓDULO B2B FARMACIA PATROCINADA
                </Badge>
                {planStatus === 'active' ? (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Suscripción Activa ($200/mes)
                  </Badge>
                ) : (
                  <Badge className="bg-rose-500/20 text-rose-200 border border-rose-400/30 text-[11px] font-semibold">
                    Suscripción Requerida ($200 USD/mes)
                  </Badge>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Catálogo SUMA, Pedidos 1-Clic, Cupones y Patrocinio Médico
              </h2>
              <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed">
                Carga tus productos <strong>manualmente</strong> (con foto pegada o subida en WebP, indicaciones, descripción y cantidad dispuesta para SUMA) o mediante <strong>Excel</strong>. Recibe reservas de récipes en 1 clic, negocia cupones con médicos y mide tu retorno de inversión en tiempo real.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsShowcaseOpen(true)}
                className="bg-white/10 hover:bg-white/20 text-white border-white/25 rounded-xl text-xs font-bold h-10"
              >
                <Eye className="h-4 w-4 mr-1.5 text-teal-300" />
                Ver Mi Tarjeta y Catálogo (Vista Paciente)
              </Button>

              {planStatus !== 'active' && (
                <Button
                  type="button"
                  onClick={() => setSubTab('subscription')}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-xl text-xs h-10 shadow-md"
                >
                  <Crown className="h-4 w-4 mr-1.5" />
                  Activar Plan $200/mes
                </Button>
              )}
            </div>
          </div>

          {/* Sub-navegación interna */}
          <div className="flex flex-wrap items-center gap-2 mt-6 pt-5 border-t border-white/10">
            <Button
              type="button"
              size="sm"
              onClick={() => setSubTab('catalog')}
              className={`rounded-xl text-xs font-bold ${
                subTab === 'catalog'
                  ? 'bg-teal-500 text-slate-950 hover:bg-teal-400'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Package className="h-3.5 w-3.5 mr-1.5" />
              1. Catálogo Manual / Excel y Stock SUMA ({products.length})
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => {
                setSubTab('orders');
                loadOrdersAndRefills();
              }}
              className={`rounded-xl text-xs font-bold ${
                subTab === 'orders'
                  ? 'bg-teal-500 text-slate-950 hover:bg-teal-400'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
              2. Pedidos 1-Clic y Recompras Crónicas ({orders.length})
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => setSubTab('doctors')}
              className={`rounded-xl text-xs font-bold ${
                subTab === 'doctors'
                  ? 'bg-teal-500 text-slate-950 hover:bg-teal-400'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
              3. Médicos para Patrocinar ({availableDoctors.length})
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => setSubTab('alliances')}
              className={`rounded-xl text-xs font-bold ${
                subTab === 'alliances'
                  ? 'bg-teal-500 text-slate-950 hover:bg-teal-400'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Handshake className="h-3.5 w-3.5 mr-1.5" />
              4. Matches, Cupones y Métricas ROI ({sponsorships.length})
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => setSubTab('subscription')}
              className={`rounded-xl text-xs font-bold ${
                subTab === 'subscription'
                  ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <CreditCard className="h-3.5 w-3.5 mr-1.5" />
              5. Membresía B2B ($200/mes)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* =====================================================================
          SUB-TAB 1: CATÁLOGO DE MEDICAMENTOS (CARGA MANUAL + EXCEL + STOCK SUMA)
         ===================================================================== */}
      {subTab === 'catalog' && (
        <div className="space-y-6">
          {/* Barra de Carga Manual (Principal) e Importación Excel (Opcional) */}
          <Card className="border-slate-200 bg-white rounded-2xl shadow-xs">
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Package className="h-5 w-5 text-teal-600" />
                    Carga de Productos (Manual o Excel) y Cantidad Dispuesta para SUMA
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                    Puedes <strong>cargar productos manualmente uno por uno</strong> (copiando y pegando la foto, agregando indicaciones, descripción y cantidad disponible para clientes SUMA) o apoyarte con un archivo Excel para carga rápida.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleOpenNewProduct}
                    className="rounded-xl text-xs bg-teal-600 hover:bg-teal-700 text-white font-extrabold h-10 px-4 shadow-sm"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Cargar Producto Manual
                  </Button>

                  <input
                    ref={excelInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleExcelUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingExcel}
                    onClick={() => excelInputRef.current?.click()}
                    className="rounded-xl text-xs border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 font-bold h-10"
                  >
                    {uploadingExcel ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-emerald-700" />
                    )}
                    Importar desde Excel (Opcional)
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDownloadExcelTemplate}
                    className="rounded-xl text-xs text-slate-600 hover:bg-slate-100 h-10 font-semibold"
                  >
                    <Download className="h-3.5 w-3.5 mr-1 text-slate-500" />
                    Plantilla .xlsx
                  </Button>
                </div>
              </div>

              {/* Buscador y Filtros del Catálogo */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    placeholder="Buscar medicamento, principio activo o categoría..."
                    className="pl-9 h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'all', label: `Todos (${products.length})` },
                    { id: 'promo', label: `🔥 En Promoción (${products.filter(p => p.isPromotion).length})` },
                    { id: 'available', label: `✅ Con Stock SUMA (${products.filter(p => p.isAvailable).length})` },
                    { id: 'unavailable', label: `🔴 Sin Stock (${products.filter(p => !p.isAvailable).length})` }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setProductFilter(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        productFilter === tab.id
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Listado Editable de Productos */}
          {loadingProducts ? (
            <div className="py-14 flex flex-col items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
              <span className="text-xs text-slate-500">Cargando catálogo de medicamentos...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <Card className="border-dashed border-2 border-slate-200 bg-white/60 rounded-2xl">
              <CardContent className="py-12 text-center space-y-3">
                <Package className="h-10 w-10 text-slate-400 mx-auto" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    {products.length === 0
                      ? 'Aún no has cargado medicamentos en tu catálogo SUMA'
                      : 'No hay medicamentos que coincidan con este filtro'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Haz clic en <strong>"Cargar Producto Manual"</strong> para agregar un medicamento con su foto, indicaciones, descripción y cantidad dispuesta para SUMA, o súbelos desde Excel.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProducts.map(prod => (
                <Card
                  key={prod.id}
                  className={`rounded-2xl overflow-hidden border transition-all ${
                    prod.isPromotion
                      ? 'border-amber-300 bg-gradient-to-br from-white to-amber-50/30 shadow-xs'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <CardContent className="p-4 flex items-start gap-4">
                    {/* Imagen del Producto (WebP) */}
                    <div className="relative h-24 w-24 rounded-xl bg-slate-100 border border-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center group">
                      {prod.imageUrl ? (
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-1 text-slate-400">
                          <ImageIcon className="h-5 w-5 mx-auto opacity-50" />
                          <span className="text-[9px] block mt-0.5">Subir WebP</span>
                        </div>
                      )}

                      <label className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer text-[10px] font-bold">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) handleUploadProductWebPImage(f, prod);
                          }}
                        />
                        {uploadingProductImageId === prod.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Upload className="h-3.5 w-3.5 mb-0.5" />
                            Foto WebP
                          </>
                        )}
                      </label>
                    </div>

                    {/* Datos y Controles Rápidos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h4 className="font-bold text-slate-900 text-sm leading-tight">
                              {prod.name}
                            </h4>
                            {prod.isPromotion && (
                              <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold px-1.5 py-0">
                                <Tag className="h-2.5 w-2.5 mr-1 text-amber-700" />
                                {prod.promoLabel || 'Promoción'}
                              </Badge>
                            )}
                          </div>
                          {prod.genericName && (
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Principio activo: <span className="font-medium text-slate-700">{prod.genericName}</span>
                            </p>
                          )}
                          {prod.presentation && (
                            <p className="text-[11px] text-slate-400">{prod.presentation}</p>
                          )}
                        </div>

                        {/* Precios */}
                        <div className="text-right shrink-0">
                          {prod.promoPrice ? (
                            <div>
                              {prod.referencePrice && (
                                <span className="text-[10px] text-slate-400 line-through block">
                                  ${Number(prod.referencePrice).toFixed(2)}
                                </span>
                              )}
                              <span className="text-sm font-extrabold text-emerald-700">
                                ${Number(prod.promoPrice).toFixed(2)}
                              </span>
                            </div>
                          ) : prod.referencePrice ? (
                            <span className="text-xs font-bold text-slate-700">
                              ${Number(prod.referencePrice).toFixed(2)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Descripción e Indicaciones de Uso */}
                      {(prod.description || prod.usageIndications) && (
                        <div className="mt-2 space-y-1 bg-slate-50/90 border border-slate-100 rounded-lg p-2">
                          {prod.description && (
                            <p className="text-[11px] text-slate-600 line-clamp-1">
                              <strong className="text-slate-700">Descripción:</strong> {prod.description}
                            </p>
                          )}
                          {prod.usageIndications && (
                            <p className="text-[11px] text-teal-800 line-clamp-1">
                              <strong>Indicaciones:</strong> {prod.usageIndications}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Control de Cantidad SUMA y Disponibilidad */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Control rápido de stock SUMA */}
                          <div className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg px-1.5 py-0.5">
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustStock(prod, -1)}
                              className="h-5 w-5 rounded bg-white hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold"
                              title="Restar 1 unidad SUMA"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-[11px] font-extrabold text-slate-800 px-1.5">
                              Stock SUMA: {prod.stockQuantity !== null && prod.stockQuantity !== undefined ? prod.stockQuantity : 'S/L'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustStock(prod, 1)}
                              className="h-5 w-5 rounded bg-white hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold"
                              title="Sumar 1 unidad SUMA"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleQuickToggleProduct(prod, 'isAvailable')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors ${
                              prod.isAvailable
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                            }`}
                          >
                            {prod.isAvailable ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Disponible
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 text-rose-600" /> Sin Stock
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleQuickToggleProduct(prod, 'isPromotion')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors ${
                              prod.isPromotion
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <Sparkles className="h-3 w-3" />
                            {prod.isPromotion ? 'Promo' : 'Promocionar'}
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditProduct(prod)}
                            className="h-7 px-2 text-xs text-slate-600 hover:text-teal-700"
                          >
                            <Edit3 className="h-3.5 w-3.5 mr-1" /> Editar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteProduct(prod.id)}
                            className="h-7 px-2 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 2: PEDIDOS 1-CLIC (MÓDULO 3) Y RECOMPRAS CRÓNICAS (MÓDULO 5)
         ===================================================================== */}
      {subTab === 'orders' && (
        <div className="space-y-6">
          {/* Pedidos y Cotizaciones 1-Clic */}
          <Card className="border-slate-200 bg-white rounded-2xl shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-teal-600" />
                    Solicitudes de Pacientes: "Cotizar o Apartar mi Récipe en 1 Clic"
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Cuando marques un pedido como <strong>Entregado / Completado</strong>, el sistema descontará automáticamente las unidades del Stock SUMA de los medicamentos incluidos.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadOrdersAndRefills}
                  className="rounded-xl text-xs h-8"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Actualizar Pedidos
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-5">
              {loadingOrders ? (
                <div className="py-10 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-teal-600 mx-auto" />
                  <p className="text-xs text-slate-500 mt-2">Cargando reservas y cotizaciones...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <ShoppingBag className="h-9 w-9 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">Aún no has recibido reservas 1-Clic</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Cuando un paciente abra tu tarjeta desde su récipe médico y presione "Enviar mi Récipe para Cotizar / Apartar", aparecerá aquí al instante.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map(order => (
                    <div
                      key={order.id}
                      className="rounded-2xl border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-teal-300 transition-all"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-sm">{order.patientName}</span>
                          {order.patientCedula && (
                            <Badge variant="outline" className="text-[10px]">
                              C.I: {order.patientCedula}
                            </Badge>
                          )}
                          <Badge
                            className={`text-[10px] font-bold ${
                              order.deliveryType === 'delivery'
                                ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                                : 'bg-teal-100 text-teal-900 border-teal-300'
                            }`}
                          >
                            {order.deliveryType === 'delivery' ? (
                              <>
                                <Truck className="h-3 w-3 mr-1" /> Delivery a Domicilio
                              </>
                            ) : (
                              <>
                                <Store className="h-3 w-3 mr-1" /> Retiro en Mostrador
                              </>
                            )}
                          </Badge>

                          <Badge
                            className={`text-[10px] font-bold ${
                              order.status === 'completed'
                                ? 'bg-emerald-600 text-white'
                                : order.status === 'quoted' || order.status === 'ready'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-blue-100 text-blue-900 border-blue-300'
                            }`}
                          >
                            {order.status === 'pending'
                              ? '🔔 Pendiente por Cotizar'
                              : order.status === 'quoted'
                              ? '💲 Cotizado al Paciente'
                              : order.status === 'ready'
                              ? '📦 Listo para Retiro/Envío'
                              : order.status === 'completed'
                              ? '✅ Entregado (Stock Descontado)'
                              : 'Cancelado'}
                          </Badge>

                          {order.couponCode && (
                            <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-extrabold">
                              <Ticket className="h-3 w-3 mr-1" /> Cupón {order.couponCode} ({order.discountPercentage}% OFF)
                            </Badge>
                          )}

                          {order.isChronicTreatment && (
                            <Badge className="bg-purple-100 text-purple-900 border-purple-300 text-[10px] font-bold">
                              🔄 Tratamiento Mensual (Recompra: {order.nextRefillDate})
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 whitespace-pre-line">
                          <strong className="text-slate-900 block mb-0.5">Récipe Solicitado ({order.recipeCode || 'Digital'}):</strong>
                          {order.prescriptionText}
                        </p>

                        {order.deliveryType === 'delivery' && order.deliveryAddress && (
                          <p className="text-xs text-indigo-800 font-medium">
                            📍 Dirección de entrega: <strong>{order.deliveryAddress}</strong>
                          </p>
                        )}

                        {order.quotedTotalUsd !== null && order.quotedTotalUsd !== undefined && (
                          <p className="text-xs font-bold text-emerald-700">
                            Cotización enviada: ${Number(order.quotedTotalUsd).toFixed(2)} USD
                            {order.quotedTotalBs ? ` (Bs. ${Number(order.quotedTotalBs).toFixed(2)})` : ''}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {order.patientPhone && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const clean = order.patientPhone!.replace(/\D/g, '');
                              const msg = `Hola ${order.patientName}, te escribimos de *${pharmacyData.chainName || pharmacyData.name}* respecto a tu récipe reservado en SUMA Salud.`;
                              window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank');
                            }}
                            className="rounded-xl text-xs h-9 border-emerald-300 text-emerald-800"
                          >
                            <Phone className="h-3.5 w-3.5 mr-1" /> WhatsApp
                          </Button>
                        )}

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleOpenQuoteOrder(order)}
                          className="rounded-xl text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold h-9"
                        >
                          Cotizar / Cambiar Estado
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Módulo 5: Alertas de Recompra de Tratamientos Crónicos / Mensuales */}
          <Card className="border-purple-200 bg-gradient-to-br from-white to-purple-50/30 rounded-2xl shadow-xs">
            <CardHeader className="pb-3 border-b border-purple-100">
              <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-purple-600" />
                Módulo de Recompra de Tratamientos Crónicos / Mensuales (Fidelización)
              </CardTitle>
              <CardDescription className="text-xs">
                Pacientes con tratamientos continuos (hipertensión, diabetes, control mensual) cuya fecha de reposición está programada. Envíales un recordatorio en 1 clic para asegurar su recompra mensual.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              {chronicRefills.orders.length === 0 && chronicRefills.records.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  Los pedidos o récipes marcados como "Tratamiento Crónico / Mensual" aparecerán aquí con su fecha de próximo reabastecimiento (+25 días).
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {chronicRefills.orders.map(co => (
                    <div key={co.id} className="p-3.5 rounded-xl bg-white border border-purple-200 flex items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-slate-900 text-xs block">{co.patientName}</span>
                        <span className="text-[11px] text-purple-800 font-semibold block">
                          📅 Próxima Recompra: {co.nextRefillDate || 'En 25 días'}
                        </span>
                        <span className="text-[11px] text-slate-500 line-clamp-1">{co.prescriptionText}</span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSendRefillWhatsAppReminder(co.patientName, co.patientPhone, co.prescriptionText || '', co.nextRefillDate)}
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs h-8 shrink-0"
                      >
                        Recordar Recompra
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 3: DIRECTORIO DE MÉDICOS DISPONIBLES PARA PATROCINAR
         ===================================================================== */}
      {subTab === 'doctors' && (
        <div className="space-y-5">
          {planStatus !== 'active' && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900">
                  <strong className="font-bold block text-sm">Activa tu Membresía B2B ($200 USD/mes) para hacer Match con Médicos</strong>
                  Puedes explorar todos los médicos que aceptan patrocinios por ciudad, pero para enviarles solicitudes y abrir el chat de negociación necesitas activar el módulo.
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setSubTab('subscription')}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shrink-0"
              >
                Activar Ahora ($200/mes)
              </Button>
            </div>
          )}

          {/* Filtros de Médicos por Ciudad y Especialidad */}
          <Card className="border-slate-200 bg-white rounded-2xl shadow-xs">
            <CardContent className="p-5 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  value={doctorSearch}
                  onChange={e => setDoctorSearch(e.target.value)}
                  placeholder="Buscar médico por nombre o especialidad..."
                  className="pl-9 h-10 text-xs rounded-xl"
                />
              </div>

              <select
                value={doctorCityFilter}
                onChange={e => setDoctorCityFilter(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
              >
                <option value="all">📍 Todas las Ciudades ({availableDoctors.length})</option>
                {doctorCities.map(c => (
                  <option key={c} value={c}>
                    📍 {c}
                  </option>
                ))}
              </select>

              <select
                value={doctorSpecialtyFilter}
                onChange={e => setDoctorSpecialtyFilter(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
              >
                <option value="all">🩺 Todas las Especialidades</option>
                {doctorSpecialties.map(s => (
                  <option key={s} value={s}>
                    🩺 {s}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          {loadingB2B ? (
            <div className="py-12 text-center bg-white rounded-2xl border border-slate-200">
              <Loader2 className="h-7 w-7 animate-spin text-teal-600 mx-auto" />
              <p className="text-xs text-slate-500 mt-2">Cargando médicos disponibles para patrocinio...</p>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <Card className="border-dashed border-2 border-slate-200 bg-white/60 rounded-2xl">
              <CardContent className="py-12 text-center space-y-2">
                <Stethoscope className="h-10 w-10 text-slate-400 mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm">
                  No se encontraron médicos con patrocinio habilitado en este filtro
                </h4>
                <p className="text-xs text-slate-500">
                  Los médicos que activan su interruptor de "Aceptar Patrocinios de Farmacias" aparecerán listados aquí.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDoctors.map(doc => {
                const existing = getExistingSponsorshipWithDoctor(doc.id);
                return (
                  <Card key={doc.id} className="border-slate-200 bg-white rounded-2xl shadow-xs hover:shadow-md transition-all">
                    <CardContent className="p-5 flex items-start gap-4">
                      <img
                        src={doc.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(doc.name)}`}
                        alt={doc.name}
                        className="h-14 w-14 rounded-2xl object-cover border border-slate-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">Dr(a). {doc.name}</h4>
                            <p className="text-xs font-semibold text-teal-700">{doc.specialty}</p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              {doc.city || 'Venezuela'}
                            </p>
                          </div>

                          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                            Abierto a Patrocinio
                          </Badge>
                        </div>

                        {doc.sponsorshipConditions && (
                          <div className="mt-2.5 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-[11px] text-slate-600">
                            <strong className="text-slate-800">Interés del médico:</strong> {doc.sponsorshipConditions}
                          </div>
                        )}

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end">
                          {existing ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSubTab('alliances');
                                if (existing.status === 'matched' || existing.status === 'active') {
                                  openNegotiationModal(existing);
                                }
                              }}
                              className="rounded-xl text-xs font-bold border-teal-300 text-teal-800 bg-teal-50/50 h-8"
                            >
                              {existing.status === 'active'
                                ? '✅ Alianza Activa (Ver Acuerdo)'
                                : existing.status === 'matched'
                                ? '🤝 ¡Match! Abrir Negociación'
                                : existing.status === 'pending_pharmacy'
                                ? '🔔 El médico te envió solicitud (Responder)'
                                : '⏳ Solicitud Enviada'}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setRequestDoctorModal(doc);
                                setRequestCity(doc.city || pharmacyData.city || '');
                                setRequestChain(pharmacyData.chainName || '');
                              }}
                              className="rounded-xl text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold h-8"
                            >
                              <Handshake className="h-3.5 w-3.5 mr-1.5" />
                              Solicitar Patrocinio
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 4: MIS MATCHES, CUPONES Y PANEL DE MÉTRICAS ROI (MÓDULOS 2 Y 4)
         ===================================================================== */}
      {subTab === 'alliances' && (
        <div className="space-y-5">
          {/* Panel General de Métricas y Retorno de Inversión (Módulo 2) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card className="border-slate-200 bg-white rounded-2xl">
              <CardContent className="p-4">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5 text-teal-600" /> Vistas en Récipes
                </span>
                <p className="text-2xl font-black text-slate-900 mt-1">{totalImpressions}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-white rounded-2xl">
              <CardContent className="p-4">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <MousePointerClick className="h-3.5 w-3.5 text-blue-600" /> Clics en Tarjeta
                </span>
                <p className="text-2xl font-black text-slate-900 mt-1">{totalCardClicks}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-white rounded-2xl">
              <CardContent className="p-4">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-emerald-600" /> Clics WhatsApp
                </span>
                <p className="text-2xl font-black text-slate-900 mt-1">{totalWhatsappClicks}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-white rounded-2xl">
              <CardContent className="p-4">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <ShoppingBag className="h-3.5 w-3.5 text-amber-600" /> Pedidos 1-Clic
                </span>
                <p className="text-2xl font-black text-slate-900 mt-1">{totalOrdersCount}</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 bg-emerald-50/50 rounded-2xl">
              <CardContent className="p-4">
                <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Récipes Dispensados
                </span>
                <p className="text-2xl font-black text-emerald-900 mt-1">{totalDispensedCount}</p>
              </CardContent>
            </Card>
          </div>

          {sponsorships.length === 0 ? (
            <Card className="border-dashed border-2 border-slate-200 bg-white/60 rounded-2xl">
              <CardContent className="py-12 text-center space-y-3">
                <Handshake className="h-10 w-10 text-slate-400 mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm">
                  Aún no tienes solicitudes ni alianzas con médicos
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Ve a la pestaña <strong>"3. Médicos para Patrocinar"</strong> y envía tu primera solicitud para hacer Match, definir si lleva cupón de descuento y aparecer en sus récipes.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {sponsorships.map(spon => (
                <Card key={spon.id} className="border-slate-200 bg-white rounded-2xl shadow-xs">
                  <CardContent className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <img
                        src={
                          spon.doctor?.profileImage ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(spon.doctor?.name || 'Dr')}`
                        }
                        alt={spon.doctor?.name}
                        className="h-12 w-12 rounded-2xl object-cover border border-slate-200"
                      />
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">
                            Dr(a). {spon.doctor?.name || 'Médico SUMA'}
                          </h4>
                          <Badge
                            className={`text-[10px] font-bold ${
                              spon.status === 'active'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : spon.status === 'matched'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : spon.status === 'pending_pharmacy'
                                ? 'bg-blue-100 text-blue-900 border-blue-300'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {spon.status === 'active'
                              ? '🚀 Alianza Comercial Activa en Récipes'
                              : spon.status === 'matched'
                              ? '🤝 Match Confirmado (En Negociación)'
                              : spon.status === 'pending_pharmacy'
                              ? '🔔 Solicitud Recibida del Médico'
                              : spon.status === 'pending_doctor'
                              ? '⏳ Esperando Aceptación del Médico'
                              : 'Rechazada'}
                          </Badge>

                          {spon.hasPatientCoupon && spon.couponCode && (
                            <Badge className="bg-amber-400/20 text-amber-950 border-amber-400 text-[10px] font-extrabold">
                              <Ticket className="h-3 w-3 mr-1 text-amber-700" />
                              Cupón Pacientes: {spon.couponCode} ({spon.couponDiscountPercent}% OFF)
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-slate-600">
                          {spon.doctor?.specialty} • 📍 {spon.doctor?.city}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                          <span>
                            Alcance:{' '}
                            <strong className="text-slate-700">
                              {spon.scopeType === 'national'
                                ? `Nacional (${spon.chainName || pharmacyData.chainName || pharmacyData.name})`
                                : `Ciudad (${spon.targetCity || spon.doctor?.city || pharmacyData.city})`}
                            </strong>
                          </span>
                          {spon.agreementValue && (
                            <span>
                              • Acuerdo con Médico: <strong className="text-emerald-700">{spon.agreementValue}</strong>
                            </span>
                          )}
                        </div>

                        {/* Métricas ROI de esta Alianza (Módulo 2) */}
                        <div className="flex flex-wrap items-center gap-2 pt-1.5">
                          <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-md">
                            👁️ {spon.impressionsCount || 0} vistas en récipes
                          </span>
                          <span className="text-[10px] bg-blue-50 text-blue-800 font-semibold px-2 py-0.5 rounded-md">
                            👆 {spon.cardClicksCount || 0} clics tarjeta
                          </span>
                          <span className="text-[10px] bg-amber-50 text-amber-900 font-semibold px-2 py-0.5 rounded-md">
                            🛵 {spon.ordersCount || 0} pedidos 1-clic
                          </span>
                          <span className="text-[10px] bg-emerald-50 text-emerald-900 font-bold px-2 py-0.5 rounded-md">
                            ✅ {spon.dispensedRecipesCount || 0} récipes dispensados
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {spon.status === 'pending_pharmacy' && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleSponsorshipAction(spon.id, 'accept_match')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
                          >
                            <Handshake className="h-3.5 w-3.5 mr-1.5" />
                            Aceptar y Hacer Match
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleSponsorshipAction(spon.id, 'reject')}
                            className="text-xs rounded-xl text-rose-600 border-rose-200"
                          >
                            Rechazar
                          </Button>
                        </>
                      )}

                      {(spon.status === 'matched' || spon.status === 'active' || spon.status === 'pending_doctor') && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => openNegotiationModal(spon)}
                          className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs"
                        >
                          <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                          Negociar / Cupón / Chat ({spon.messages?.length || 0})
                        </Button>
                      )}

                      {spon.status === 'matched' && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleSponsorshipAction(spon.id, 'activate_alliance')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
                        >
                          <PlayCircle className="h-3.5 w-3.5 mr-1" />
                          Activar Recomendación
                        </Button>
                      )}

                      {spon.status === 'active' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleSponsorshipAction(spon.id, 'pause_alliance')}
                          className="rounded-xl text-xs border-amber-300 text-amber-800 hover:bg-amber-50"
                        >
                          <PauseCircle className="h-3.5 w-3.5 mr-1" />
                          Pausar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 5: MEMBRESÍA B2B FARMACIA PATROCINADA ($200 USD / MES)
         ===================================================================== */}
      {subTab === 'subscription' && (
        <Card className="border-slate-200 bg-white rounded-2xl shadow-xs overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-amber-500/15 via-teal-500/10 to-slate-50 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  Plan B2B Farmacia Patrocinada y Red de Médicos SUMA
                </CardTitle>
                <CardDescription className="text-xs text-slate-600 mt-1">
                  Membresía mensual para conectar con médicos, negociar patrocinios y aparecer recomendado en los récipes digitales de los pacientes.
                </CardDescription>
              </div>
              <div className="text-right">
                {discountPercentage > 0 && (
                  <span className="text-xs line-through text-slate-400 mr-1.5">${pharmacyPricing.pharmacyB2BMonthlyFee} USD</span>
                )}
                <span className="text-2xl font-black text-slate-900">${effectiveFeeUsd} USD</span>
                <span className="text-xs font-bold text-amber-800 block">
                  {pharmacyPricing.currencySymbol} {effectiveFeeBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mes ({pharmacyPricing.rateLabel})
                </span>
                {discountPercentage > 0 && (
                  <Badge className="mt-1 bg-teal-600 text-white text-[10px]">
                    Convenio SUMA -{discountPercentage}% OFF
                  </Badge>
                )}
                {freeMonths > 0 && (
                  <Badge className="mt-1 ml-1 bg-purple-600 text-white text-[10px]">
                    🎁 {freeMonths} Mes(es) Gratis Otorgados
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Handshake className="h-4 w-4 text-teal-600" /> Match Ilimitado y Cupones
                </span>
                <p className="text-slate-600">
                  Conecta con médicos de tu ciudad o a nivel nacional y decidan juntos el porcentaje de comisión y si el récipe incluye cupón para el paciente.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Semáforo y Reserva 1-Clic
                </span>
                <p className="text-slate-600">
                  El sistema cruza automáticamente el récipe del paciente con tu stock SUMA y le permite apartar o pedir delivery en 1 clic.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-emerald-600" /> Métricas ROI y Recompras
                </span>
                <p className="text-slate-600">
                  Mide vistas, clics, pedidos y récipes dispensados por médico, y recibe alertas automáticas de pacientes con tratamientos crónicos.
                </p>
              </div>
            </div>

            {planStatus === 'active' ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  <div>
                    <h4 className="font-bold text-emerald-950 text-sm">
                      Tu Membresía B2B (${effectiveFeeUsd} USD/mes • {pharmacyPricing.currencySymbol} {effectiveFeeBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })} a {pharmacyPricing.rateLabel}) está ACTIVA
                    </h4>
                    <p className="text-xs text-emerald-800">
                      Próximo corte de facturación: {nextPaymentDate ? new Date(nextPaymentDate).toLocaleDateString('es-VE') : 'En 30 días'}. Tienes acceso completo a la red de médicos, catálogo y patrocinios.
                    </p>
                    {agreementNotes && (
                      <p className="text-[11px] text-teal-900 font-semibold mt-1">
                        📋 Convenio SUMA: {agreementNotes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <h4 className="font-bold text-slate-900 text-sm">
                  Activar Suscripción Mensual (${effectiveFeeUsd} USD / {pharmacyPricing.currencySymbol} {effectiveFeeBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} a {pharmacyPricing.rateLabel})
                </h4>

                {/* Cuentas Bancarias de SUMA para este país */}
                {companyBankDetails && companyBankDetails.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">
                      Cuentas Recaudadoras de SUMA ({pharmacyPricing.flag} {pharmacyPricing.name}):
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(companyBankDetails.filter(acc => {
                        const accCountry = (acc.country || 'VE').toUpperCase();
                        return accCountry === pharmacyPricing.code || accCountry === 'GLOBAL';
                      }).length > 0
                        ? companyBankDetails.filter(acc => {
                            const accCountry = (acc.country || 'VE').toUpperCase();
                            return accCountry === pharmacyPricing.code || accCountry === 'GLOBAL';
                          })
                        : companyBankDetails
                      ).map((acc, i) => (
                        <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{acc.bank}</span>
                            {acc.currency && (
                              <Badge variant="outline" className="text-[10px] font-bold">
                                {acc.currency}
                              </Badge>
                            )}
                          </div>
                          <p className="text-slate-600">Titular: <strong>{acc.accountHolder}</strong> ({acc.idNumber})</p>
                          <p className="font-mono text-slate-900 bg-slate-50 px-2 py-0.5 rounded border">{acc.accountNumber}</p>
                          {(acc.alias || acc.phone) && (
                            <p className="font-mono text-teal-800 font-semibold">
                              {acc.alias ? `Alias: ${acc.alias}` : ''} {acc.phone ? `Tel: ${acc.phone}` : ''}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Método de Pago ({pharmacyPricing.currencySymbol} a {pharmacyPricing.rateLabel} o Divisas)</Label>
                    <Input
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value)}
                      placeholder="Pago Móvil / Transferencia / CBU / Zelle"
                      className="h-10 text-xs rounded-xl bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Referencia de Pago (Opcional en modo prueba)</Label>
                    <Input
                      value={transactionId}
                      onChange={e => setTransactionId(e.target.value)}
                      placeholder="Ej: REF-9928172"
                      className="h-10 text-xs rounded-xl bg-white"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    disabled={activatingPlan}
                    onClick={() => handleActivatePlan(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-10 px-5"
                  >
                    {activatingPlan && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                    Activar Plan B2B (${effectiveFeeUsd} USD / {pharmacyPricing.currencySymbol} {effectiveFeeBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })})
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* =====================================================================
          MODAL CREAR / EDITAR PRODUCTO MANUAL (CON PEGAR FOTO CTRL+V, STOCK SUMA E INDICACIONES)
         ===================================================================== */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto" onPaste={handlePasteImageInModal}>
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold">
              {editingProduct ? 'Editar Medicamento / Producto' : 'Cargar Producto Manualmente al Catálogo SUMA'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Puedes subir o <strong>pegar directamente una foto copiada (Ctrl+V)</strong> y se convertirá automáticamente a formato <strong>.webp</strong>. Define también la cantidad dispuesta para clientes de SUMA.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProductModal} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-semibold">Nombre Comercial del Medicamento / Producto *</Label>
                <Input
                  required
                  value={productForm.name}
                  onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Ej: Losartán Potásico 50mg"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Principio Activo / Genérico</Label>
                <Input
                  value={productForm.genericName}
                  onChange={e => setProductForm({ ...productForm, genericName: e.target.value })}
                  placeholder="Ej: Losartán"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Presentación</Label>
                <Input
                  value={productForm.presentation}
                  onChange={e => setProductForm({ ...productForm, presentation: e.target.value })}
                  placeholder="Ej: Caja x 30 Tabletas"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-extrabold text-teal-900">
                  Cantidad Dispuesta para Clientes SUMA (Stock)
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={productForm.stockQuantity}
                  onChange={e => {
                    const val = e.target.value;
                    const num = val !== '' ? Number(val) : null;
                    setProductForm({
                      ...productForm,
                      stockQuantity: val,
                      isAvailable: num !== null ? num > 0 : productForm.isAvailable
                    });
                  }}
                  placeholder="Ej: 20 unidades"
                  className="h-9 text-xs border-teal-300 bg-teal-50/40 font-bold"
                />
                <span className="text-[10px] text-slate-500 block">
                  Si colocas 0, el sistema marcará automáticamente "Sin disponibilidad" a los pacientes.
                </span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Categoría</Label>
                <Input
                  value={productForm.category}
                  onChange={e => setProductForm({ ...productForm, category: e.target.value })}
                  placeholder="Ej: Antihipertensivos, Antibióticos..."
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Precio Referencial ($ USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={productForm.referencePrice}
                  onChange={e => setProductForm({ ...productForm, referencePrice: e.target.value })}
                  placeholder="Ej: 8.50"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Precio en Promoción ($ USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={productForm.promoPrice}
                  onChange={e => setProductForm({ ...productForm, promoPrice: e.target.value })}
                  placeholder="Ej: 6.80"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Descripción del Producto e Indicaciones de Uso */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Descripción del Producto</Label>
                <Textarea
                  rows={2}
                  value={productForm.description}
                  onChange={e => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Ej: Medicamento antihipertensivo de laboratorio certificado..."
                  className="text-xs rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-teal-900">Indicaciones / Modo de Uso</Label>
                <Textarea
                  rows={2}
                  value={productForm.usageIndications}
                  onChange={e => setProductForm({ ...productForm, usageIndications: e.target.value })}
                  placeholder="Ej: Vía oral. Tomar según prescripción del médico tratante..."
                  className="text-xs rounded-xl border-teal-200"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-5 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={productForm.isAvailable}
                  onChange={e => setProductForm({ ...productForm, isAvailable: e.target.checked })}
                  className="rounded text-teal-600"
                />
                Disponible para Pacientes SUMA
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-amber-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={productForm.isPromotion}
                  onChange={e => setProductForm({ ...productForm, isPromotion: e.target.checked })}
                  className="rounded text-amber-600"
                />
                🔥 Destacar en Promoción
              </label>
            </div>

            {productForm.isPromotion && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Etiqueta de Promoción</Label>
                <Input
                  value={productForm.promoLabel}
                  onChange={e => setProductForm({ ...productForm, promoLabel: e.target.value })}
                  placeholder="Ej: 20% Dto. Pacientes SUMA / 2x1"
                  className="h-9 text-xs"
                />
              </div>
            )}

            {/* Subida o Pegado (Ctrl+V) de Foto en formato WebP */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Foto del Producto (Subir archivo o Pegar imagen copiada con Ctrl+V → Auto-WebP)
              </Label>
              <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/30">
                <div className="h-16 w-16 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                  {productForm.imageUrl ? (
                    <img src={productForm.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-[180px] space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadProductWebPImage(f);
                        }}
                      />
                      <div className="px-3 py-1.5 rounded-xl border border-teal-400 bg-teal-600 text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-teal-700">
                        {uploadingProductImageId === 'modal' ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        Elegir Foto (WebP)
                      </div>
                    </label>
                    <span className="text-[11px] text-teal-900 font-semibold flex items-center gap-1">
                      <ClipboardPaste className="h-3.5 w-3.5 text-teal-700" />
                      o presiona <kbd className="px-1.5 py-0.5 bg-white border rounded text-[10px]">Ctrl+V</kbd> para pegar foto
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Cualquier imagen que pegues o subas se optimiza automáticamente a formato WebP ultraligero.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsProductModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingProduct} className="bg-teal-600 hover:bg-teal-700 text-white font-bold">
                {savingProduct && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Guardar en Catálogo SUMA
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          MODAL COTIZAR / ACTUALIZAR PEDIDO 1-CLIC (MÓDULO 3)
         ===================================================================== */}
      <Dialog open={Boolean(quotingOrder)} onOpenChange={open => !open && setQuotingOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Gestionar Pedido 1-Clic de {quotingOrder?.patientName}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Envía el monto cotizado al paciente o marca el pedido como entregado (esto descontará automáticamente las unidades del Stock SUMA).
            </DialogDescription>
          </DialogHeader>

          {quotingOrder && (
            <form onSubmit={handleSaveOrderUpdate} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <span className="font-bold text-slate-800 block">Medicamentos en el Récipe:</span>
                <p className="text-slate-600 whitespace-pre-line">{quotingOrder.prescriptionText}</p>
                {quotingOrder.couponCode && (
                  <p className="text-emerald-700 font-bold pt-1">
                    🎟️ Incluye Cupón Médico: {quotingOrder.couponCode} ({quotingOrder.discountPercentage}% OFF)
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Total Cotizado ($ USD)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={quoteForm.quotedTotalUsd}
                    onChange={e => setQuoteForm({ ...quoteForm, quotedTotalUsd: e.target.value })}
                    placeholder="Ej: 18.50"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Total en Bolívares (Bs)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={quoteForm.quotedTotalBs}
                    onChange={e => setQuoteForm({ ...quoteForm, quotedTotalBs: e.target.value })}
                    placeholder="Opcional"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Estado del Pedido</Label>
                <select
                  value={quoteForm.status}
                  onChange={e => setQuoteForm({ ...quoteForm, status: e.target.value as any })}
                  className="w-full h-9 rounded-xl border border-slate-200 px-2.5 text-xs font-semibold"
                >
                  <option value="quoted">💲 Cotizado (Esperando confirmación del paciente)</option>
                  <option value="ready">📦 Apartado / Listo en Mostrador o En Camino</option>
                  <option value="completed">✅ Entregado / Completado (Descontar Stock SUMA)</option>
                  <option value="cancelled">❌ Cancelado</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Respuesta / Nota para el Paciente</Label>
                <Textarea
                  rows={2}
                  value={quoteForm.pharmacyNotes}
                  onChange={e => setQuoteForm({ ...quoteForm, pharmacyNotes: e.target.value })}
                  placeholder="Ej: Tenemos todos los medicamentos disponibles y te aplicamos el descuento de tu médico..."
                  className="text-xs rounded-xl"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setQuotingOrder(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={savingOrderQuote} className="bg-teal-600 hover:bg-teal-700 text-white font-bold">
                  {savingOrderQuote && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  Guardar Estado
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          MODAL ENVIAR SOLICITUD DE PATROCINIO A UN MÉDICO
         ===================================================================== */}
      <Dialog open={Boolean(requestDoctorModal)} onOpenChange={open => !open && setRequestDoctorModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Handshake className="h-5 w-5 text-teal-600" />
              Solicitar Alianza con Dr(a). {requestDoctorModal?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cuando el médico acepte tu solicitud, se hará <strong>Match</strong> y se abrirá el chat privado para acordar los términos de recomendación y si lleva cupón para el paciente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendSponsorshipRequest} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Alcance de la Recomendación</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRequestScope('city')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold ${
                    requestScope === 'city'
                      ? 'border-teal-600 bg-teal-50 text-teal-900'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  📍 Por Ciudad ({requestCity || requestDoctorModal?.city || 'Local'})
                </button>
                <button
                  type="button"
                  onClick={() => setRequestScope('national')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold ${
                    requestScope === 'national'
                      ? 'border-teal-600 bg-teal-50 text-teal-900'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  🇻🇪 Franquicia Nacional (Todas las Sedes)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Modalidad Propuesta</Label>
                <select
                  value={requestAgreementType}
                  onChange={e => setRequestAgreementType(e.target.value as any)}
                  className="w-full h-9 rounded-xl border border-slate-200 px-2.5 text-xs"
                >
                  <option value="monthly_fixed">Monto Fijo Mensual ($)</option>
                  <option value="per_recipe_percentage">Porcentaje / Comisión (%)</option>
                  <option value="patient_discount">Beneficio / Descuento a Pacientes</option>
                  <option value="custom">Acuerdo Mixto</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Oferta Inicial (Opcional)</Label>
                <Input
                  value={requestAgreementValue}
                  onChange={e => setRequestAgreementValue(e.target.value)}
                  placeholder="Ej: $100/mes o 10% comisión"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Mensaje Inicial para el Médico</Label>
              <Textarea
                rows={3}
                value={requestMessage}
                onChange={e => setRequestMessage(e.target.value)}
                placeholder={`Hola Dr(a). ${requestDoctorModal?.name}, queremos patrocinar sus récipes en ${requestCity || 'la ciudad'}...`}
                className="text-xs rounded-xl"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRequestDoctorModal(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={sendingRequest} className="bg-teal-600 hover:bg-teal-700 text-white font-bold">
                {sendingRequest && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Enviar Solicitud de Match
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          MODAL SALA DE NEGOCIACIÓN, CUPÓN NEGOCIABLE (MÓDULO 4) Y CHAT PRIVADO
         ===================================================================== */}
      <Dialog open={Boolean(activeNegotiation)} onOpenChange={open => !open && setActiveNegotiation(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2">
              <Handshake className="h-5 w-5 text-teal-600" />
              Sala de Negociación B2B: Dr(a). {activeNegotiation?.doctor?.name} ↔ {pharmacyData.chainName || pharmacyData.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Acuerda las condiciones económicas, decidan juntos si la alianza incluye un <strong>Cupón de Descuento para los pacientes</strong> y activen la recomendación en los récipes.
            </DialogDescription>
          </DialogHeader>

          {activeNegotiation && (
            <div className="space-y-4">
              {/* Términos del Acuerdo y Módulo 4 (Cupón Negociable) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    1. Condiciones del Acuerdo Médico ↔ Farmacia
                  </span>
                  <Badge
                    className={
                      activeNegotiation.status === 'active'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-100 text-amber-900'
                    }
                  >
                    {activeNegotiation.status === 'active' ? 'ALIANZA ACTIVA EN RÉCIPES' : 'EN NEGOCIACIÓN'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-600">Alcance</Label>
                    <select
                      value={termsForm.scopeType}
                      onChange={e => setTermsForm({ ...termsForm, scopeType: e.target.value as any })}
                      className="w-full h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs font-medium"
                    >
                      <option value="city">📍 En la Ciudad ({termsForm.targetCity || pharmacyData.city})</option>
                      <option value="national">🇻🇪 Nacional / Franquicia</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-600">Tipo de Patrocinio</Label>
                    <select
                      value={termsForm.agreementType}
                      onChange={e => setTermsForm({ ...termsForm, agreementType: e.target.value as any })}
                      className="w-full h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs font-medium"
                    >
                      <option value="monthly_fixed">Monto Fijo Mensual ($)</option>
                      <option value="per_recipe_percentage">Porcentaje por Récipe (%)</option>
                      <option value="patient_discount">Descuento a Pacientes</option>
                      <option value="custom">Acuerdo Mixto</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-600">Valor / Comisión Acordada</Label>
                    <Input
                      value={termsForm.agreementValue}
                      onChange={e => setTermsForm({ ...termsForm, agreementValue: e.target.value })}
                      placeholder="Ej: $120/mes o 12%"
                      className="h-9 text-xs bg-white rounded-xl"
                    />
                  </div>
                </div>

                {/* MÓDULO 4: Cupón Negociable entre Médico y Farmacia para el Paciente */}
                <div className="pt-3 border-t border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs font-extrabold text-amber-950 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={termsForm.hasPatientCoupon}
                        onChange={e =>
                          setTermsForm({
                            ...termsForm,
                            hasPatientCoupon: e.target.checked,
                            couponCode:
                              termsForm.couponCode ||
                              generateDefaultCouponCode(activeNegotiation.doctor?.name, termsForm.couponDiscountPercent)
                          })
                        }
                        className="rounded text-amber-600 h-4 w-4"
                      />
                      <Ticket className="h-4 w-4 text-amber-600" />
                      ¿Incluir Cupón de Descuento para el Paciente en el Récipe? (Acuerdo Médico-Farmacia)
                    </label>
                  </div>

                  {termsForm.hasPatientCoupon && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-amber-50/70 border border-amber-200 rounded-xl p-3">
                      <div>
                        <Label className="text-[11px] font-bold text-amber-950">% Descuento al Paciente</Label>
                        <Input
                          type="number"
                          min="1"
                          max="90"
                          value={termsForm.couponDiscountPercent}
                          onChange={e => setTermsForm({ ...termsForm, couponDiscountPercent: e.target.value })}
                          placeholder="Ej: 10"
                          className="h-8 text-xs bg-white rounded-lg font-bold"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-bold text-amber-950">Código del Cupón</Label>
                        <Input
                          value={termsForm.couponCode}
                          onChange={e => setTermsForm({ ...termsForm, couponCode: e.target.value.toUpperCase() })}
                          placeholder="Ej: DR-PEREZ-10"
                          className="h-8 text-xs bg-white rounded-lg font-mono font-bold"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-bold text-amber-950">Beneficio Visible</Label>
                        <Input
                          value={termsForm.couponDescription}
                          onChange={e => setTermsForm({ ...termsForm, couponDescription: e.target.value })}
                          placeholder="Ej: Descuento en todo el récipe"
                          className="h-8 text-xs bg-white rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={updatingTerms}
                    onClick={handleSaveTerms}
                    className="rounded-xl text-xs h-8"
                  >
                    {updatingTerms && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                    Guardar Términos y Cupón
                  </Button>

                  {activeNegotiation.status !== 'active' ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        handleSponsorshipAction(activeNegotiation.id, 'activate_alliance', {
                          ...termsForm,
                          couponDiscountPercent: Number(termsForm.couponDiscountPercent) || 0
                        })
                      }
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-8"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Activar Negociación y Recomendación en Récipes
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleSponsorshipAction(activeNegotiation.id, 'pause_alliance')}
                      className="border-amber-300 text-amber-900 rounded-xl text-xs h-8"
                    >
                      Pausar Recomendación
                    </Button>
                  )}
                </div>
              </div>

              {/* Ventana de Chat entre Farmacia y Médico */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                <div className="bg-slate-900 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-teal-400" />
                    Chat Directo de Negociación
                  </span>
                  <span className="text-[11px] text-slate-300">
                    Dr(a). {activeNegotiation.doctor?.name} ({activeNegotiation.doctor?.specialty})
                  </span>
                </div>

                <div className="h-56 overflow-y-auto p-4 space-y-2.5 bg-slate-50/60">
                  {(activeNegotiation.messages || []).length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-12">
                      Envía un mensaje para acordar los detalles del patrocinio y del cupón de descuento.
                    </p>
                  ) : (
                    (activeNegotiation.messages || []).map((msg: any) => {
                      const isMe = msg.senderRole === 'pharmacy';
                      const isSystem = msg.senderRole === 'system';
                      if (isSystem) {
                        return (
                          <div key={msg.id} className="text-center my-2">
                            <span className="inline-block bg-teal-50 text-teal-900 border border-teal-200 rounded-full px-3 py-1 text-[11px] font-semibold">
                              {msg.text}
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs ${
                              isMe
                                ? 'bg-teal-600 text-white rounded-br-xs'
                                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                            }`}
                          >
                            <span className={`block text-[10px] font-bold mb-0.5 ${isMe ? 'text-teal-100' : 'text-teal-700'}`}>
                              {msg.senderName}
                            </span>
                            <p className="leading-relaxed">{msg.text}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleSendChatMessage} className="p-3 border-t border-slate-200 flex items-center gap-2 bg-white">
                  <Input
                    value={chatText}
                    onChange={e => setChatText(e.target.value)}
                    placeholder="Escribe tu propuesta económica o de cupón al médico..."
                    className="h-9 text-xs rounded-xl"
                  />
                  <Button type="submit" size="sm" disabled={sendingChat} className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-9 px-4">
                    {sendingChat ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </Button>
                </form>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Vista Previa de Tarjeta Interactiva */}
      <PharmacyShowcaseModal
        isOpen={isShowcaseOpen}
        onClose={() => setIsShowcaseOpen(false)}
        pharmacy={pharmacyData as any}
        isDoctorRecommended={true}
        recommendingDoctorName="Vista Previa en Récipe Médico"
      />
    </div>
  );
}
