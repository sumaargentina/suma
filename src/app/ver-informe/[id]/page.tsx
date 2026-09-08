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
  FileText, 
  Clock, 
  QrCode, 
  AlertCircle,
  ArrowLeft,
  Loader2,
  MapPin,
  Phone,
  BedDouble,
  Calendar
} from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface VerificationData {
  success: boolean;
  verified: boolean;
  recipeCode: string;
  reportCode: string;
  record: {
    id: string;
    visitDate: string;
    diagnosis?: string;
    prescription?: string;
    treatmentPlan?: string;
    requestedStudies?: string;
    medicalReport?: string;
    requiresRest: boolean;
    restDays: number;
    restStartDate?: string;
    restEndDate?: string;
    restType?: string;
    restJustification?: string;
    evaluation?: string;
    evolution?: string;
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

export default function VerifyReportPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const recordId = resolvedParams.id;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VerificationData | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchReport() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/medical-records/verify?id=${recordId}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || 'No se pudo verificar el informe médico');
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
        console.error('Error verifying report:', err);
        setError(err.message || 'El informe médico no existe o el código es inválido.');
      } finally {
        setLoading(false);
      }
    }

    if (recordId) {
      fetchReport();
    }
  }, [recordId]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast({
        title: 'Enlace copiado',
        description: 'El link de verificación oficial ha sido copiado.',
      });
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    if (!data) return;
    const doc = data.doctor;
    const pat = data.patient;
    const rec = data.record;

    const text = `*INFORME MÉDICO Y CONSTANCIA DE REPOSO - SUMA SALUD*\n` +
      `*Código:* ${data.reportCode}\n` +
      `*Dr(a).* ${doc.name} (${doc.specialty})\n` +
      (doc.medical_license ? `*M.P.:* ${doc.medical_license}\n` : '') +
      `*Paciente:* ${pat.name} (CI: ${pat.cedula})\n` +
      (rec.requiresRest || rec.restDays > 0 ? `\n*🛌 REPOSO MÉDICO:* ${rec.restDays} día(s) (${rec.restType || 'Absoluto'})\n` : '') +
      `*Diagnóstico:* ${rec.diagnosis || 'En tratamiento'}\n` +
      `\n*🔗 Verificación Oficial en Línea para RRHH y Empresas:*\n${typeof window !== 'undefined' ? window.location.href : ''}`;

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
          <div className="h-16 w-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Validando Informe y Reposo</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Consultando firma digital y certificación oficial en SUMA Salud...
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
            <h2 className="text-xl font-bold text-slate-900">Documento No Encontrado</h2>
            <p className="text-sm text-slate-600 mt-2">
              {error || 'El código del informe no coincide con ningún documento registrado en SUMA Salud.'}
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

  const { record, doctor: doc, patient: pat, reportCode } = data;
  const hasRest = Boolean(record.requiresRest || record.restDays > 0);

  let formattedDate = 'Fecha no registrada';
  let shortDate = 'N/A';
  try {
    if (record.visitDate) {
      const parsed = parseISO(record.visitDate);
      formattedDate = format(parsed, "dd 'de' MMMM, yyyy", { locale: es });
      shortDate = format(parsed, "dd/MM/yyyy");
    }
  } catch {
    formattedDate = record.visitDate || 'Fecha no registrada';
  }

  let restStartFormatted = shortDate;
  let restEndFormatted = shortDate;

  try {
    if (record.restStartDate) {
      restStartFormatted = format(parseISO(record.restStartDate), "dd/MM/yyyy");
    }
    if (record.restEndDate) {
      restEndFormatted = format(parseISO(record.restEndDate), "dd/MM/yyyy");
    } else if (record.restStartDate && record.restDays > 0) {
      const endDate = addDays(parseISO(record.restStartDate), Math.max(0, record.restDays - 1));
      restEndFormatted = format(endDate, "dd/MM/yyyy");
    }
  } catch {
    // fallback
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-blue-50/30 py-6 px-3 sm:px-6">
      
      {/* Contenedor Principal */}
      <div className="max-w-3xl mx-auto space-y-4">
        
        {/* Barra Superior de Verificación (Hidden on Print) */}
        <div className="print:hidden bg-white border border-blue-200/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-xs font-semibold px-2.5 py-0.5 shadow-xs flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Informe Médico Auténtico y Verificado
                </Badge>
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {reportCode}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Documento oficial válido para Recursos Humanos (RRHH), empresas e instituciones.
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
              {copied ? <Check className="h-3.5 w-3.5 mr-1 text-blue-600" /> : <Copy className="h-3.5 w-3.5 mr-1 text-slate-500" />}
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
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8.5 rounded-xl shadow-xs"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" /> Imprimir
            </Button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* HOJA DEL INFORME MÉDICO                                                   */}
        {/* ========================================================================= */}
        <div 
          id="printable-report-sheet"
          className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden print:border-0 print:shadow-none print:m-0 print:p-0"
        >
          {/* Header del Documento */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              {/* Datos del Doctor */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center backdrop-blur-xs border border-blue-400/30">
                    <Stethoscope className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight">
                      Dr(a). {doc.name || 'Médico Tratante'}
                    </h1>
                    <p className="text-xs text-blue-300 font-semibold">
                      {doc.specialty || 'Medicina General'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-blue-100/90 pt-1">
                  {doc.medical_license && (
                    <span className="bg-blue-950/60 px-2 py-0.5 rounded border border-blue-700/50 font-mono font-medium">
                      M.P. / C.M.: {doc.medical_license}
                    </span>
                  )}
                  {(doc.phone || doc.whatsapp) && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-blue-400" /> {doc.whatsapp || doc.phone}
                    </span>
                  )}
                  {(doc.address || doc.city) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-blue-400" /> {doc.address ? `${doc.address}, ` : ''}{doc.city}
                    </span>
                  )}
                </div>
              </div>

              {/* Logo SUMA y Código */}
              <div className="text-left sm:text-right shrink-0 bg-blue-950/40 sm:bg-transparent p-3 sm:p-0 rounded-xl border border-blue-700/30 sm:border-0">
                <div className="flex items-center gap-1 sm:justify-end">
                  <Stethoscope className="h-4 w-4 text-blue-400" />
                  <span className="font-headline font-black text-base text-white tracking-tight">SUMA</span>
                  <span className="text-[10px] text-blue-300 uppercase tracking-widest font-bold">SALUD</span>
                </div>
                <p className="text-[10px] text-blue-200 mt-0.5">Certificación Oficial</p>
                <div className="mt-1 font-mono text-xs font-bold text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded inline-block">
                  {reportCode}
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
                <span className="text-slate-500 font-medium block uppercase text-[10px]">Validez Legal:</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Verificado Oficial
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Título de la Certificación */}
            <div className="text-center">
              <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide">
                {hasRest ? 'INFORME MÉDICO Y CONSTANCIA DE REPOSO' : 'INFORME MÉDICO OFICIAL'}
              </h2>
              <p className="text-xs text-slate-500">
                Constancia expedida a petición del interesado para los fines legales y laborales que estime convenientes.
              </p>
            </div>

            {/* Cuadro de Reposo Médico (si existe) */}
            {hasRest && (
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50/50 to-white border-2 border-blue-300 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                    <BedDouble className="h-5 w-5 text-blue-600" />
                    <span>CONSTANCIA DE REPOSO MÉDICO LABORAL</span>
                  </div>
                  <span className="text-xs font-bold text-blue-800 bg-blue-100 border border-blue-300 px-3 py-1 rounded-full uppercase">
                    {record.restDays} Días de Reposo
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-blue-200 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Desde:</span>
                    <span className="font-bold text-slate-900">{restStartFormatted}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Hasta (Reincorporación):</span>
                    <span className="font-bold text-slate-900">{restEndFormatted}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Tipo:</span>
                    <span className="font-bold text-blue-700">{record.restType || 'Absoluto'}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 italic leading-relaxed">
                  "{record.restJustification || 'Por presentar cuadro clínico descrito amerita reposo de salud para su recuperación.'}"
                </p>
              </div>
            )}

            {/* Diagnóstico */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wide block mb-1">
                Diagnóstico Clínico (Dx):
              </span>
              <p className="text-sm font-semibold text-slate-900">
                {record.diagnosis || 'En estudio / control médico'}
              </p>
            </div>

            {/* Resumen Clínico */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                Resumen Clínico y Hallazgos:
              </span>
              <div className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                {record.medicalReport || record.evolution || record.evaluation || 'Paciente acude a evaluación médica profesional presentando cuadro clínico detallado en diagnóstico.'}
              </div>
            </div>

            {/* Plan de Tratamiento */}
            {record.treatmentPlan && (
              <div className="border border-slate-200 rounded-xl p-4 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                  Plan Terapéutico e Indicaciones:
                </span>
                <div className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {record.treatmentPlan}
                </div>
              </div>
            )}

            {/* Pie de Firma y QR */}
            <div className="pt-6 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4">
              
              <div className="flex items-center gap-3">
                {qrCodeUrl && (
                  <img src={qrCodeUrl} alt="QR Verificación" className="h-16 w-16 border rounded-lg p-0.5 bg-white shrink-0" />
                )}
                <div className="text-[9px] text-slate-600 space-y-0.5 leading-tight">
                  <div className="flex items-center gap-1 text-blue-800 font-bold">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> Verificación Criptográfica SUMA
                  </div>
                  <p className="font-mono text-slate-800 font-bold">{reportCode}</p>
                  <p className="text-[8px] text-slate-500">Documento original firmado</p>
                </div>
              </div>

              <div className="flex flex-col items-center text-center min-w-[160px] max-w-[200px]">
                {doc.signature_url ? (
                  <div className="h-14 w-36 flex items-center justify-center mb-1">
                    <img src={doc.signature_url} alt="Firma Médica" className="max-h-full max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="h-10 w-32 border-b border-dashed border-slate-400 mb-1" />
                )}
                <div className="border-t border-slate-800 pt-1 w-full">
                  <p className="font-bold text-xs text-slate-900 leading-tight">Dr(a). {doc.name}</p>
                  <p className="text-[9px] text-slate-600 leading-tight">
                    {doc.specialty} {doc.medical_license ? `• MP: ${doc.medical_license}` : ''}
                  </p>
                </div>
              </div>

            </div>

          </div>

          {/* Footer de Seguridad */}
          <div className="bg-slate-900 text-slate-400 px-5 py-3 text-[10px] flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-300">
              <ShieldCheck className="h-4 w-4 text-blue-400" />
              <span>Verificación de autenticidad garantizada por <strong>SUMA Salud</strong>.</span>
            </div>
            <span>Código de Validación: <strong className="font-mono text-blue-300">{reportCode}</strong></span>
          </div>

        </div>

      </div>

      {/* Print Stylesheet */}
      <style>{`
        @media print {
          @page {
            size: portrait;
            margin: 10mm;
          }
          body * {
            visibility: hidden;
          }
          #printable-report-sheet, #printable-report-sheet * {
            visibility: visible;
          }
          #printable-report-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100vw;
            border: 2px solid #cbd5e1 !important;
            border-radius: 8px !important;
          }
        }
      `}</style>
    </div>
  );
}
