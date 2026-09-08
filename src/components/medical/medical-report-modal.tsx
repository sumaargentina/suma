"use client";

import React, { useRef, useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Printer, 
  Share2, 
  Stethoscope, 
  FileText, 
  Clock, 
  Calendar, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  QrCode, 
  Copy, 
  Check, 
  AlertCircle,
  CheckCircle2,
  BedDouble
} from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Doctor, MedicalRecord } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface MedicalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: MedicalRecord | any | null;
  doctor?: Doctor | any | null;
  patientName?: string;
  patientCedula?: string;
  patientAge?: number | string | null;
}

export function MedicalReportModal({
  isOpen,
  onClose,
  record,
  doctor,
  patientName,
  patientCedula,
  patientAge,
}: MedicalReportModalProps) {
  const printableRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate Unique Code for Report
  const reportCode = `SUMA-INF-${(record?.id || '00000000').slice(0, 8).toUpperCase()}`;

  // Verification URL
  const verificationUrl = typeof window !== 'undefined' && record?.id 
    ? `${window.location.origin}/ver-informe/${record.id}` 
    : '';

  useEffect(() => {
    async function generateQR() {
      if (!record?.id) return;
      try {
        const url = typeof window !== 'undefined' 
          ? `${window.location.origin}/ver-informe/${record.id}` 
          : `https://sumasalud.com/ver-informe/${record.id}`;

        const qr = await QRCode.toDataURL(url, {
          width: 220,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          }
        });
        setQrCodeUrl(qr);
      } catch (e) {
        console.error('Error generating report QR:', e);
      }
    }

    if (isOpen && record) {
      generateQR();
    }
  }, [isOpen, record]);

  if (!record) return null;

  // Resolve Doctor data with fallbacks
  const doc = doctor || record.doctors || {};
  const docName = doc.name || 'Médico Tratante';
  const docSpecialty = doc.specialty || 'Medicina General';
  const docLicense = doc.medical_license || doc.medicalLicense || '';
  const docPhone = doc.whatsapp || doc.phone || '';
  const docAddress = doc.address || '';
  const docCity = doc.city || '';
  const docSignature = doc.signature_url || doc.signatureUrl || null;

  // Resolve Dates
  let visitDateFormatted = format(new Date(), "dd 'de' MMMM, yyyy", { locale: es });
  let visitDateShort = format(new Date(), "dd/MM/yyyy");
  try {
    if (record.visit_date) {
      const parsed = parseISO(record.visit_date);
      visitDateFormatted = format(parsed, "dd 'de' MMMM, yyyy", { locale: es });
      visitDateShort = format(parsed, "dd/MM/yyyy");
    }
  } catch (e) {
    visitDateFormatted = format(new Date(), "dd 'de' MMMM, yyyy", { locale: es });
  }

  // Rest details
  const hasRest = Boolean(record.requires_rest || (record.rest_days && record.rest_days > 0));
  const restDays = record.rest_days || 0;
  const restType = record.rest_type || 'Absoluto';
  const restJustification = record.rest_justification || 'Por presentar cuadro clínico descrito amerita reposo de salud para su recuperación y reincorporación.';

  let restStartFormatted = visitDateShort;
  let restEndFormatted = visitDateShort;

  try {
    if (record.rest_start_date) {
      restStartFormatted = format(parseISO(record.rest_start_date), "dd/MM/yyyy");
    }
    if (record.rest_end_date) {
      restEndFormatted = format(parseISO(record.rest_end_date), "dd/MM/yyyy");
    } else if (record.rest_start_date && restDays > 0) {
      const endDate = addDays(parseISO(record.rest_start_date), Math.max(0, restDays - 1));
      restEndFormatted = format(endDate, "dd/MM/yyyy");
    }
  } catch (e) {
    // fallback
  }

  // Clinical contents
  const reportText = record.medical_report || record.evolution || record.evaluation || 'Paciente acude a evaluación médica profesional presentando cuadro clínico detallado en diagnóstico.';
  const diagnosisText = record.diagnosis || 'Cuadro clínico en estudio y tratamiento.';
  const treatmentPlanText = record.treatment_plan || record.prescription || 'Cumplir indicaciones médicas y terapéuticas según esquema establecido.';

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    if (verificationUrl) {
      navigator.clipboard.writeText(verificationUrl);
      setCopied(true);
      toast({
        title: 'Enlace copiado',
        description: 'El link oficial de validación del informe/reposo fue copiado al portapapeles.',
      });
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const text = `*INFORME MÉDICO Y CONSTANCIA DE REPOSO - SUMA SALUD*\n` +
      `*Código Único:* ${reportCode}\n` +
      `*Dr(a).* ${docName} (${docSpecialty})\n` +
      (docLicense ? `*M.P.:* ${docLicense}\n` : '') +
      `*Paciente:* ${patientName || 'Paciente'}\n` +
      `*Fecha de Emisión:* ${visitDateShort}\n\n` +
      `*Diagnóstico (Dx):* ${diagnosisText}\n` +
      (hasRest ? `\n*🛌 CONSTANCIA DE REPOSO MÉDICO:*\n- *Días:* ${restDays} día(s)\n- *Periodo:* Del ${restStartFormatted} al ${restEndFormatted}\n- *Tipo:* ${restType}\n` : '') +
      `\n*🔗 Verificación Oficial en Línea para Empresas y RRHH:*\n${verificationUrl}\n\n` +
      `_Documento médico oficial verificado y firmado digitalmente en SUMA Salud_`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-3xl lg:max-w-4xl max-h-[95vh] overflow-y-auto p-0 border-0 bg-transparent shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Informe Médico Oficial y Constancia de Reposo</DialogTitle>
            <DialogDescription>
              Documento médico oficial legal con código QR, identificador único y constancia de reposo laboral.
            </DialogDescription>
          </DialogHeader>

          {/* Outer Card Container */}
          <div className="bg-white text-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-300">
            
            {/* Top Actions Bar (Hidden on Print) */}
            <div className="print:hidden bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8.5 w-8.5 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm block leading-tight">Informe Médico y Constancia de Reposo</span>
                    <span className="font-mono text-[10px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded border border-blue-800 font-semibold">
                      {reportCode}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">Documento oficial con validez legal y verificación QR</span>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-end flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsQrModalOpen(true)}
                  className="bg-slate-800 hover:bg-slate-700 text-blue-300 border-slate-700 h-8 text-xs font-medium"
                >
                  <QrCode className="h-3.5 w-3.5 mr-1 text-blue-400" /> Código QR
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="bg-slate-800 hover:bg-slate-700 text-white border-slate-700 h-8 text-xs font-medium"
                >
                  {copied ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 mr-1 text-slate-400" />}
                  {copied ? 'Copiado' : 'Link'}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleShareWhatsApp}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 h-8 text-xs font-medium"
                >
                  <Share2 className="h-3.5 w-3.5 mr-1.5" /> WhatsApp
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handlePrint}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs font-medium shadow-sm"
                >
                  <Printer className="h-3.5 w-3.5 mr-1.5" /> Imprimir / PDF
                </Button>
              </div>
            </div>

            {/* Printable Sheet: Formato Vertical Estándar A4 / Carta */}
            <div
              ref={printableRef}
              id="printable-report-sheet"
              className="p-6 sm:p-10 bg-white print:p-0 print:m-0 space-y-6"
            >
              
              {/* Membrete Oficial del Profesional / SUMA */}
              <div className="pb-4 border-b-2 border-blue-900/40 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-blue-700 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
                        Dr(a). {docName}
                      </h2>
                      <p className="text-xs font-bold text-blue-800 leading-tight">
                        {docSpecialty}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-600 pt-1">
                    {docLicense && (
                      <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded font-mono border border-slate-200">
                        M.P. / C.M.: {docLicense}
                      </span>
                    )}
                    {docPhone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" /> {docPhone}
                      </span>
                    )}
                    {(docAddress || docCity) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {docAddress ? `${docAddress}, ` : ''}{docCity}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 justify-end">
                    <Stethoscope className="h-4 w-4 text-blue-700" />
                    <span className="font-headline font-black text-sm text-slate-900 tracking-tight">SUMA</span>
                    <span className="text-[9px] text-blue-700 font-bold uppercase">SALUD</span>
                  </div>
                  <span className="text-[9px] font-semibold text-slate-500 block uppercase mt-0.5">
                    Certificación Médica Digital
                  </span>
                  <span className="font-mono text-[9px] text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 mt-1 inline-block font-bold">
                    {reportCode}
                  </span>
                </div>
              </div>

              {/* Título del Documento */}
              <div className="text-center py-1">
                <h1 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide">
                  {hasRest ? 'INFORME MÉDICO Y CONSTANCIA DE REPOSO' : 'INFORME MÉDICO OFICIAL'}
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Documento emitido para fines asistenciales, laborales y legales pertinentes.
                </p>
              </div>

              {/* Cuadro de Identificación del Paciente */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="col-span-2">
                  <span className="text-slate-500 font-semibold text-[10px] block uppercase">Paciente:</span>
                  <span className="font-bold text-slate-900 text-sm">{patientName || 'Paciente'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold text-[10px] block uppercase">Cédula / DNI:</span>
                  <span className="font-bold text-slate-800">{patientCedula || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold text-[10px] block uppercase">Fecha de Emisión:</span>
                  <span className="font-semibold text-slate-800">{visitDateShort}</span>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* CUADRO DESTACADO DE REPOSO MÉDICO (SI APLICA)                             */}
              {/* ========================================================================= */}
              {hasRest && (
                <div className="bg-gradient-to-r from-blue-50 via-indigo-50/50 to-white border-2 border-blue-300 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                      <BedDouble className="h-5 w-5 text-blue-600" />
                      <span>CONSTANCIA DE REPOSO MÉDICO</span>
                    </div>
                    <span className="text-xs font-bold text-blue-800 bg-blue-100/90 border border-blue-300 px-3 py-1 rounded-full uppercase">
                      {restDays} Días de Reposo
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/80 p-3 rounded-xl border border-blue-200 text-xs">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold block">Fecha Inicio:</span>
                      <span className="font-bold text-slate-900">{restStartFormatted}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold block">Fecha Reincorporación:</span>
                      <span className="font-bold text-slate-900">{restEndFormatted}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold block">Tipo de Reposo:</span>
                      <span className="font-bold text-blue-700">{restType}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 italic leading-relaxed">
                    "{restJustification}"
                  </p>
                </div>
              )}

              {/* ========================================================================= */}
              {/* DETALLE CLÍNICO DEL INFORME                                               */}
              {/* ========================================================================= */}
              <div className="space-y-4">
                {/* Diagnóstico Clínico */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white">
                  <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wide block mb-1">
                    Diagnóstico Clínico (Dx):
                  </span>
                  <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                    {diagnosisText}
                  </p>
                </div>

                {/* Resumen Clínico / Evolución */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                    Resumen Clínico y Hallazgos:
                  </span>
                  <div className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {reportText}
                  </div>
                </div>

                {/* Plan Terapéutico */}
                {treatmentPlanText && (
                  <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                      Plan Terapéutico y Recomendaciones:
                    </span>
                    <div className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {treatmentPlanText}
                    </div>
                  </div>
                )}
              </div>

              {/* ========================================================================= */}
              {/* PIE DE FIRMA, SELLO DIGITAL Y CÓDIGO QR                                  */}
              {/* ========================================================================= */}
              <div className="pt-6 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4">
                
                {/* QR y Verificación */}
                <div className="flex items-center gap-3">
                  {qrCodeUrl && (
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Validación" 
                      className="h-16 w-16 border border-slate-300 rounded-lg p-0.5 bg-white shrink-0 shadow-2xs" 
                    />
                  )}
                  <div className="text-[9px] text-slate-600 space-y-0.5 leading-tight text-left">
                    <div className="flex items-center gap-1 text-blue-800 font-bold text-[10px]">
                      <ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> Validez Digital SUMA
                    </div>
                    <p className="font-mono text-slate-800 font-bold">{reportCode}</p>
                    <p className="text-[8px] text-slate-500">Escanea para verificar autenticidad</p>
                  </div>
                </div>

                {/* Firma y Sello del Médico */}
                <div className="flex flex-col items-center text-center min-w-[160px] max-w-[200px]">
                  {docSignature ? (
                    <div className="h-14 w-36 flex items-center justify-center mb-1">
                      <img
                        src={docSignature}
                        alt="Firma del Médico"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-10 w-32 border-b border-dashed border-slate-400 mb-1" />
                  )}
                  <div className="border-t border-slate-800 pt-1 w-full">
                    <p className="font-bold text-xs text-slate-900 leading-tight">Dr(a). {docName}</p>
                    <p className="text-[9px] text-slate-600 leading-tight">
                      {docSpecialty} {docLicense ? `• MP: ${docLicense}` : ''}
                    </p>
                  </div>
                </div>

              </div>

            </div>

            {/* Footer Close Button (Hidden on Print) */}
            <div className="print:hidden p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <span className="text-xs text-slate-500">
                Presiona <strong>Imprimir / PDF</strong> para descargar en formato vertical oficial.
              </span>
              <DialogClose asChild>
                <Button type="button" variant="outline" size="sm" className="text-xs">
                  Cerrar
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogContent>

        {/* Global Portrait Print Stylesheet */}
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
              min-height: 100vh;
              padding: 0 !important;
              margin: 0 !important;
            }
          }
        `}</style>
      </Dialog>

      {/* QR Code Large Viewer Modal */}
      <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 rounded-3xl p-6 text-center shadow-2xl">
          <DialogHeader>
            <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2 shadow-xs">
              <QrCode className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Código QR de Validación Oficial
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Muestra este código a Recursos Humanos (RRHH), empresas o aseguradoras para verificar la autenticidad del reposo o informe.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 flex flex-col items-center justify-center space-y-3">
            {qrCodeUrl ? (
              <div className="p-4 bg-white border-2 border-slate-200 rounded-2xl shadow-sm inline-block">
                <img src={qrCodeUrl} alt="QR Validación Informe" className="h-52 w-52 object-contain" />
              </div>
            ) : (
              <div className="h-52 w-52 bg-slate-100 rounded-2xl flex items-center justify-center text-xs text-slate-400">
                Generando QR...
              </div>
            )}

            <div className="space-y-1">
              <span className="font-mono text-sm font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 inline-block">
                {reportCode}
              </span>
              <p className="text-[11px] text-slate-500">
                Dr(a). {docName} • {patientName || 'Paciente'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="text-xs h-9"
            >
              {copied ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              {copied ? 'Copiado' : 'Copiar Link'}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleShareWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 shadow-xs"
            >
              <Share2 className="h-3.5 w-3.5 mr-1" /> WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
