"use client";

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { 
  CheckCircle2, 
  ShieldCheck, 
  Printer, 
  Share2, 
  Copy, 
  Check, 
  Stethoscope, 
  Pill, 
  ClipboardList, 
  MapPin, 
  Phone, 
  FileText, 
  Clock, 
  QrCode, 
  AlertCircle,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface VerificationData {
  success: boolean;
  verified: boolean;
  recipeCode: string;
  record: {
    id: string;
    visitDate: string;
    diagnosis?: string;
    prescription?: string;
    treatmentPlan?: string;
    requestedStudies?: string;
    createdAt: string;
  };
  doctor: {
    name: string;
    specialty: string;
    medical_license?: string;
    signature_url?: string | null;
    phone?: string;
    whatsapp?: string;
    address?: string;
    city?: string;
  };
  patient: {
    name: string;
    cedula: string;
    email?: string;
  };
}

export default function VerifyRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const recipeId = resolvedParams.id;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VerificationData | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchRecipe() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/medical-records/verify?id=${recipeId}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || 'No se pudo verificar el récipe médico');
        }

        setData(json);

        // Generar QR de verificación
        if (typeof window !== 'undefined') {
          const currentUrl = window.location.href;
          const qr = await QRCode.toDataURL(currentUrl, {
            width: 250,
            margin: 2,
            color: {
              dark: '#0f172a',
              light: '#ffffff'
            }
          });
          setQrCodeUrl(qr);
        }
      } catch (err: any) {
        console.error('Error verifying recipe:', err);
        setError(err.message || 'El récipe no existe o el código es inválido.');
      } finally {
        setLoading(false);
      }
    }

    if (recipeId) {
      fetchRecipe();
    }
  }, [recipeId]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast({
        title: 'Enlace copiado',
        description: 'El link de verificación del récipe ha sido copiado al portapapeles.',
      });
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    if (!data) return;
    const doc = data.doctor;
    const pat = data.patient;
    const rec = data.record;

    const text = `*RÉCIPE MÉDICO OFICIAL - SUMA SALUD*\n` +
      `*Código:* ${data.recipeCode}\n` +
      `*Dr(a).* ${doc.name} (${doc.specialty})\n` +
      (doc.medical_license ? `*M.P.:* ${doc.medical_license}\n` : '') +
      `*Paciente:* ${pat.name} (CI: ${pat.cedula})\n` +
      `\n*℞ MEDICAMENTOS:*\n${rec.prescription || 'Indicados en consulta'}\n` +
      `\n*🔗 Verificación Oficial en Línea para Farmacias:*\n${typeof window !== 'undefined' ? window.location.href : ''}`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-200 flex flex-col items-center max-w-sm w-full text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Validando Récipe Médico</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Consultando la firma digital y los datos de autenticidad en SUMA Salud...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-red-200 flex flex-col items-center max-w-md w-full text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Récipe No Encontrado</h2>
            <p className="text-sm text-slate-600 mt-2">
              {error || 'El código del récipe no coincide con ningún documento médico oficial registrado en SUMA Salud.'}
            </p>
          </div>
          <Button asChild className="bg-slate-900 hover:bg-slate-800 text-white text-xs mt-2">
            <Link href="/">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Ir al Inicio
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const { record, doctor: doc, patient: pat, recipeCode } = data;

  let formattedDate = 'Fecha no registrada';
  try {
    if (record.visitDate) {
      formattedDate = format(parseISO(record.visitDate), "dd 'de' MMMM, yyyy", { locale: es });
    }
  } catch {
    formattedDate = record.visitDate || 'Fecha no registrada';
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-teal-50/30 py-6 px-3 sm:px-6">
      
      {/* Contenedor Principal */}
      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* Barra Superior de Verificación (Hidden on Print) */}
        <div className="print:hidden bg-white border border-teal-200/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-xs font-semibold px-2.5 py-0.5 shadow-xs flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Récipe Oficial Verificado
                </Badge>
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {recipeCode}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Documento médico con validez oficial emitido a través de la red <strong>SUMA Salud</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="text-xs h-8.5 rounded-xl border-slate-200 hover:bg-slate-50"
            >
              {copied ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 mr-1 text-slate-500" />}
              {copied ? 'Copiado' : 'Copiar Link'}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleShareWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8.5 rounded-xl shadow-xs"
            >
              <Share2 className="h-3.5 w-3.5 mr-1.5" /> WhatsApp
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8.5 rounded-xl shadow-xs"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" /> Imprimir
            </Button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* HOJA DEL RÉCIPE MÉDICO OFICIAL                                            */}
        {/* ========================================================================= */}
        <div 
          id="printable-recipe-sheet"
          className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden print:border-0 print:shadow-none print:m-0 print:p-0"
        >
          {/* Header del Documento */}
          <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              {/* Datos del Doctor */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center backdrop-blur-xs border border-teal-400/30">
                    <Stethoscope className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight">
                      Dr(a). {doc.name || 'Médico Tratante'}
                    </h1>
                    <p className="text-xs text-teal-300 font-semibold">
                      {doc.specialty || 'Medicina General'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-teal-100/90 pt-1">
                  {doc.medical_license && (
                    <span className="bg-teal-950/60 px-2 py-0.5 rounded border border-teal-700/50 font-mono font-medium">
                      M.P. / C.M.: {doc.medical_license}
                    </span>
                  )}
                  {(doc.phone || doc.whatsapp) && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-teal-400" /> {doc.whatsapp || doc.phone}
                    </span>
                  )}
                  {(doc.address || doc.city) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-teal-400" /> {doc.address ? `${doc.address}, ` : ''}{doc.city}
                    </span>
                  )}
                </div>
              </div>

              {/* Logo SUMA y Código */}
              <div className="text-left sm:text-right shrink-0 bg-teal-950/40 sm:bg-transparent p-3 sm:p-0 rounded-xl border border-teal-700/30 sm:border-0">
                <div className="flex items-center gap-1 sm:justify-end">
                  <Stethoscope className="h-4 w-4 text-teal-400" />
                  <span className="font-headline font-black text-base text-white tracking-tight">SUMA</span>
                  <span className="text-[10px] text-teal-300 uppercase tracking-widest font-bold">SALUD</span>
                </div>
                <p className="text-[10px] text-teal-200 mt-0.5">Validación Oficial para Farmacias</p>
                <div className="mt-1 font-mono text-xs font-bold text-teal-300 bg-teal-950/80 px-2 py-0.5 rounded inline-block">
                  {recipeCode}
                </div>
              </div>

            </div>
          </div>

          {/* Barra de Datos del Paciente */}
          <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 font-medium block uppercase text-[10px]">Paciente:</span>
                <span className="font-bold text-slate-900 text-sm">{pat.name}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block uppercase text-[10px]">Cédula / DNI:</span>
                <span className="font-semibold text-slate-800">{pat.cedula || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block uppercase text-[10px]">Fecha de Emisión:</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-400" /> {formattedDate}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block uppercase text-[10px]">Estado de Validez:</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Vigente / Auténtico
                </span>
              </div>
            </div>

            {record.diagnosis && (
              <div className="mt-3 pt-3 border-t border-slate-200/80 text-xs">
                <span className="font-bold text-slate-700">Diagnóstico Clínico (Dx): </span>
                <span className="text-slate-900 font-medium">{record.diagnosis}</span>
              </div>
            )}
          </div>

          {/* Cuerpo Dual: Récipe Farmacia (Rp) e Indicaciones Paciente */}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            
            {/* LADO IZQUIERDO: RÉCIPE / DESPACHO FARMACÉUTICO */}
            <div className="p-5 sm:p-6 bg-gradient-to-b from-teal-50/10 via-white to-white flex flex-col justify-between min-h-[380px]">
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-teal-700 text-white px-3 py-1.5 rounded-lg shadow-xs">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span className="text-lg font-serif italic font-black">℞</span>
                    <span>RÉCIPE (DESPACHO FARMACIA)</span>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider font-semibold bg-teal-800/80 px-2 py-0.5 rounded text-teal-100">
                    Copia Farmacéutica
                  </span>
                </div>

                <div className="p-4 bg-teal-50/20 border border-teal-100 rounded-xl text-slate-900 font-sans text-sm whitespace-pre-wrap leading-relaxed min-h-[220px]">
                  {record.prescription || 'Medicamentos indicados por el profesional en la consulta.'}
                </div>
              </div>

              {/* Pie de Firma y QR */}
              <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                {qrCodeUrl && (
                  <div className="flex items-center gap-2">
                    <img src={qrCodeUrl} alt="QR Récipe" className="h-16 w-16 border rounded p-0.5 bg-white shrink-0" />
                    <div className="text-[9px] text-slate-500 leading-tight">
                      <span className="font-bold text-slate-700 block">Escanea para verificar</span>
                      {recipeCode}
                    </div>
                  </div>
                )}

                <div className="text-right flex flex-col items-end">
                  {doc.signature_url ? (
                    <div className="h-12 w-32 flex items-center justify-end mb-1">
                      <img src={doc.signature_url} alt="Firma Médica" className="max-h-full max-w-full object-contain" />
                    </div>
                  ) : (
                    <div className="h-8 w-28 border-b border-dashed border-slate-400 mb-1" />
                  )}
                  <p className="font-bold text-xs text-slate-900">Dr(a). {doc.name}</p>
                  <p className="text-[10px] text-slate-500">{doc.specialty}</p>
                </div>
              </div>
            </div>

            {/* LADO DERECHO: INDICACIONES Y TRATAMIENTO */}
            <div className="p-5 sm:p-6 bg-gradient-to-b from-blue-50/10 via-white to-white flex flex-col justify-between min-h-[380px]">
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-slate-800 text-white px-3 py-1.5 rounded-lg shadow-xs">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <ClipboardList className="h-4 w-4 text-teal-400" />
                    <span>INDICACIONES Y TRATAMIENTO</span>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider font-semibold bg-slate-700 px-2 py-0.5 rounded text-slate-200">
                    Uso del Paciente
                  </span>
                </div>

                <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 font-sans text-sm whitespace-pre-wrap leading-relaxed min-h-[220px]">
                  {record.treatmentPlan || record.prescription || 'Cumplir el tratamiento indicado de forma estricta.'}
                </div>

                {record.requestedStudies && (
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-950">
                    <span className="font-bold block uppercase text-[10px] text-amber-800">Estudios y Exámenes Solicitados:</span>
                    {record.requestedStudies}
                  </div>
                )}
              </div>

              {/* Pie de Sello */}
              <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                <div className="text-[10px] text-slate-500">
                  <span className="font-semibold text-slate-700 block">SUMA Salud Digital</span>
                  Firma autorizada del profesional
                </div>

                <div className="text-right flex flex-col items-end">
                  {doc.signature_url ? (
                    <div className="h-12 w-32 flex items-center justify-end mb-1">
                      <img src={doc.signature_url} alt="Firma Médica" className="max-h-full max-w-full object-contain" />
                    </div>
                  ) : (
                    <div className="h-8 w-28 border-b border-dashed border-slate-400 mb-1" />
                  )}
                  <p className="font-bold text-xs text-slate-900">Dr(a). {doc.name}</p>
                  <p className="text-[10px] text-slate-500">{doc.medical_license ? `MP: ${doc.medical_license}` : ''}</p>
                </div>
              </div>
            </div>

          </div>

          {/* Footer de Seguridad y Leyenda */}
          <div className="bg-slate-900 text-slate-400 px-5 py-3 text-[10px] flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-300">
              <ShieldCheck className="h-4 w-4 text-teal-400" />
              <span>Verificación criptográfica garantizada por <strong>SUMA Salud</strong>.</span>
            </div>
            <span>Código de Validación: <strong className="font-mono text-teal-300">{recipeCode}</strong></span>
          </div>

        </div>

      </div>

      {/* Print Stylesheet */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 6mm;
          }
          body * {
            visibility: hidden;
          }
          #printable-recipe-sheet, #printable-recipe-sheet * {
            visibility: visible;
          }
          #printable-recipe-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100vw;
            height: 100vh;
            border: 2px solid #cbd5e1 !important;
            border-radius: 8px !important;
          }
        }
      `}</style>
    </div>
  );
}
