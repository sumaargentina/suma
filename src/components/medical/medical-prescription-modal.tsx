"use client";

import React, { useRef, useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Printer, 
  Share2, 
  Stethoscope, 
  Pill, 
  ClipboardList, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  QrCode, 
  Copy, 
  Check, 
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Doctor, MedicalRecord } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface MedicalPrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: MedicalRecord | any | null;
  doctor?: Doctor | any | null;
  patientName?: string;
  patientCedula?: string;
  patientAge?: number | string | null;
}

export function MedicalPrescriptionModal({
  isOpen,
  onClose,
  record,
  doctor,
  patientName,
  patientCedula,
  patientAge,
}: MedicalPrescriptionModalProps) {
  const printableRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate Unique Code
  const recipeCode = record?.recipe_code || `SUMA-REC-${(record?.id || '00000000').slice(0, 8).toUpperCase()}`;

  // Verification URL
  const verificationUrl = typeof window !== 'undefined' && record?.id 
    ? `${window.location.origin}/ver-recipe/${record.id}` 
    : '';

  useEffect(() => {
    async function generateQR() {
      if (!record?.id) return;
      try {
        const url = typeof window !== 'undefined' 
          ? `${window.location.origin}/ver-recipe/${record.id}` 
          : `https://sumasalud.com/ver-recipe/${record.id}`;

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
        console.error('Error generating prescription QR:', e);
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
  let visitDate = format(new Date(), "dd/MM/yyyy");
  try {
    if (record.visit_date) {
      visitDate = format(parseISO(record.visit_date), "dd/MM/yyyy");
    }
  } catch (e) {
    visitDate = format(new Date(), "dd/MM/yyyy");
  }

  // Text contents
  const prescriptionText = record.prescription || (record.treatment_plan ? record.treatment_plan : "Medicamentos indicados por el profesional.");
  const indicationsText = record.treatment_plan || record.prescription || "Cumplir indicaciones según pauta médica.";

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    if (verificationUrl) {
      navigator.clipboard.writeText(verificationUrl);
      setCopied(true);
      toast({
        title: 'Enlace copiado',
        description: 'El link oficial de verificación para la farmacia fue copiado al portapapeles.',
      });
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const text = `*RÉCIPE MÉDICO OFICIAL - SUMA SALUD*\n` +
      `*Código Único:* ${recipeCode}\n` +
      `*Dr(a).* ${docName} (${docSpecialty})\n` +
      (docLicense ? `*M.P.:* ${docLicense}\n` : '') +
      `*Paciente:* ${patientName || 'Paciente'}\n` +
      `*Fecha:* ${visitDate}\n\n` +
      (record.diagnosis ? `*Diagnóstico (Dx):* ${record.diagnosis}\n\n` : '') +
      `*℞ RÉCIPE (FARMACIA):*\n${prescriptionText}\n\n` +
      `*📋 INDICACIONES:*\n${indicationsText}\n\n` +
      `*🔗 Verificación Oficial en Línea para Farmacias:*\n${verificationUrl}\n\n` +
      `_Emitido y verificado digitalmente a través de SUMA Salud_`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Sub-component: Membrete del Médico (para ambos cuerpos)
  const renderHeader = (isRecipeBody: boolean) => (
    <div className="pb-3 border-b border-teal-600/60 flex items-start justify-between gap-2">
      <div className="space-y-0.5 min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="h-6 w-6 rounded-md bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
            <Stethoscope className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight truncate leading-tight">
            Dr(a). {docName}
          </h3>
        </div>
        <p className="text-xs font-semibold text-teal-700 leading-tight">
          {docSpecialty}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-600 pt-0.5">
          {docLicense && (
            <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded font-mono">
              M.P. / C.M.: {docLicense}
            </span>
          )}
          {docPhone && (
            <span className="flex items-center gap-0.5">
              <Phone className="h-2.5 w-2.5 text-slate-400" /> {docPhone}
            </span>
          )}
          {(docAddress || docCity) && (
            <span className="flex items-center gap-0.5 truncate max-w-[200px]">
              <MapPin className="h-2.5 w-2.5 text-slate-400 shrink-0" />
              {docAddress ? `${docAddress}, ` : ''}{docCity}
            </span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="flex items-center gap-1 justify-end">
          <Stethoscope className="h-3 w-3 text-teal-600" />
          <span className="font-headline font-black text-xs text-slate-800 tracking-tight">SUMA</span>
          <span className="text-[8px] text-teal-700 font-bold uppercase">SALUD</span>
        </div>
        <span className="text-[8px] font-semibold text-slate-600 block uppercase">
          {isRecipeBody ? 'Copia Farmacia' : 'Copia Paciente'}
        </span>
        <span className="font-mono text-[8px] text-teal-800 bg-teal-50 px-1 rounded border border-teal-200 mt-0.5 inline-block">
          {recipeCode}
        </span>
      </div>
    </div>
  );

  // Sub-component: Datos del Paciente (para ambos cuerpos)
  const renderPatientInfo = () => (
    <div className="bg-slate-50 border border-slate-200/80 rounded-md p-2 grid grid-cols-4 gap-1.5 text-[11px] my-2">
      <div className="col-span-2">
        <span className="text-slate-500 font-medium text-[9px] block uppercase">Paciente:</span>
        <span className="font-bold text-slate-900 truncate block">{patientName || 'Paciente'}</span>
      </div>
      <div>
        <span className="text-slate-500 font-medium text-[9px] block uppercase">Cédula/DNI:</span>
        <span className="font-semibold text-slate-800 block truncate">{patientCedula || 'N/A'}</span>
      </div>
      <div>
        <span className="text-slate-500 font-medium text-[9px] block uppercase">Fecha:</span>
        <span className="font-semibold text-slate-800 block">{visitDate}</span>
      </div>
    </div>
  );

  // Sub-component: Pie de Firma y Sello con QR
  const renderSignatureFooter = (showQr: boolean = true) => (
    <div className="pt-2 border-t border-slate-200 flex items-end justify-between gap-2 mt-auto">
      
      {/* Sección Izquierda: QR y Verificación */}
      <div className="flex items-center gap-2">
        {showQr && qrCodeUrl && (
          <img 
            src={qrCodeUrl} 
            alt="QR Verificación" 
            className="h-12 w-12 border border-slate-300 rounded p-0.5 bg-white shrink-0" 
          />
        )}
        <div className="text-[8px] text-slate-600 space-y-0.5 leading-tight">
          <div className="flex items-center gap-1 text-teal-700 font-bold">
            <ShieldCheck className="h-3 w-3 text-teal-600" /> Validez Digital
          </div>
          <p className="font-mono text-slate-700 font-semibold">{recipeCode}</p>
          <p className="text-[7.5px] text-slate-500">Escanear para verificar</p>
        </div>
      </div>

      {/* Sección Derecha: Firma y Sello del Médico */}
      <div className="flex flex-col items-center text-center min-w-[130px] max-w-[160px]">
        {docSignature ? (
          <div className="h-11 w-32 flex items-center justify-center mb-0.5">
            <img
              src={docSignature}
              alt="Firma del Médico"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : (
          <div className="h-8 w-28 border-b border-dashed border-slate-400 mb-1" />
        )}
        <div className="border-t border-slate-700 pt-0.5 w-full">
          <p className="font-bold text-[10px] text-slate-900 leading-tight">Dr(a). {docName}</p>
          <p className="text-[8px] text-slate-600 leading-tight">
            {docSpecialty} {docLicense ? `• MP: ${docLicense}` : ''}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-4xl lg:max-w-5xl max-h-[95vh] overflow-y-auto p-0 border-0 bg-transparent shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Récipe Médico Oficial (Formato Horizontal Doble)</DialogTitle>
            <DialogDescription>
              Talonario oficial médico con código QR, identificador único y cuerpo doble de Farmacia e Indicaciones.
            </DialogDescription>
          </DialogHeader>

          {/* Outer Card Container */}
          <div className="bg-white text-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-300">
            
            {/* Top Actions Bar (Hidden on Print) */}
            <div className="print:hidden bg-slate-900 text-white px-4 sm:px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
                  <Pill className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm block leading-tight">Récipe Médico Oficial</span>
                    <span className="font-mono text-[10px] bg-teal-950 text-teal-300 px-1.5 py-0.5 rounded border border-teal-800 font-semibold">
                      {recipeCode}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">Talonario Doble Cuerpo con Código QR y Validación</span>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-end flex-wrap">
                {/* Botón QR */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsQrModalOpen(true)}
                  className="bg-slate-800 hover:bg-slate-700 text-teal-300 border-slate-700 h-8 text-xs font-medium"
                >
                  <QrCode className="h-3.5 w-3.5 mr-1 text-teal-400" /> Código QR
                </Button>

                {/* Botón Copiar Link */}
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

                {/* Botón WhatsApp */}
                <Button
                  type="button"
                  size="sm"
                  onClick={handleShareWhatsApp}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 h-8 text-xs font-medium"
                >
                  <Share2 className="h-3.5 w-3.5 mr-1.5" /> WhatsApp
                </Button>

                {/* Botón Imprimir */}
                <Button
                  type="button"
                  size="sm"
                  onClick={handlePrint}
                  className="bg-teal-600 hover:bg-teal-700 text-white h-8 text-xs font-medium shadow-sm"
                >
                  <Printer className="h-3.5 w-3.5 mr-1.5" /> Imprimir / PDF
                </Button>
              </div>
            </div>

            {/* Printable Sheet (Dual Horizontal Layout) */}
            <div
              ref={printableRef}
              id="printable-recipe-sheet"
              className="p-4 sm:p-6 bg-white print:p-0 print:m-0"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-0 border-2 border-slate-300 rounded-xl overflow-hidden bg-white shadow-xs">
                
                {/* ========================================================================= */}
                {/* LADO IZQUIERDO: RÉCIPE MÉDICO / RP (PARA LA FARMACIA)                    */}
                {/* ========================================================================= */}
                <div className="p-4 sm:p-5 flex flex-col justify-between md:border-r-2 md:border-dashed md:border-slate-300 bg-gradient-to-b from-teal-50/20 via-white to-white min-h-[460px]">
                  <div>
                    {renderHeader(true)}
                    {renderPatientInfo()}

                    {/* Header de Sección ℞ */}
                    <div className="flex items-center justify-between bg-teal-700 text-white px-2.5 py-1 rounded mb-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span className="text-base font-serif italic font-black">℞</span>
                        <span>RÉCIPE MÉDICO</span>
                      </div>
                      <span className="text-[9px] uppercase tracking-wider font-semibold bg-teal-800/80 px-1.5 py-0.5 rounded text-teal-100">
                        Despacho Farmacia
                      </span>
                    </div>

                    {/* Diagnóstico (si existe) */}
                    {record.diagnosis && (
                      <p className="text-[10px] text-slate-600 font-medium mb-2">
                        <strong className="text-slate-800">Dx:</strong> {record.diagnosis}
                      </p>
                    )}

                    {/* Listado de Medicamentos */}
                    <div className="text-xs text-slate-900 whitespace-pre-wrap leading-relaxed font-sans py-1 min-h-[140px]">
                      {prescriptionText}
                    </div>
                  </div>

                  {renderSignatureFooter(true)}
                </div>

                {/* ========================================================================= */}
                {/* LADO DERECHO: INDICACIONES Y TRATAMIENTO (PARA EL PACIENTE)              */}
                {/* ========================================================================= */}
                <div className="p-4 sm:p-5 flex flex-col justify-between bg-gradient-to-b from-blue-50/20 via-white to-white min-h-[460px]">
                  <div>
                    {renderHeader(false)}
                    {renderPatientInfo()}

                    {/* Header de Sección 📋 */}
                    <div className="flex items-center justify-between bg-slate-800 text-white px-2.5 py-1 rounded mb-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <ClipboardList className="h-3.5 w-3.5 text-teal-400" />
                        <span>INDICACIONES MÉDICAS</span>
                      </div>
                      <span className="text-[9px] uppercase tracking-wider font-semibold bg-slate-700 px-1.5 py-0.5 rounded text-slate-200">
                        Uso del Paciente
                      </span>
                    </div>

                    {/* Plan de Tratamiento e Instrucciones */}
                    <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans py-1 min-h-[120px]">
                      {indicationsText}
                    </div>

                    {/* Estudios Solicitados (si existen) */}
                    {record.requested_studies && (
                      <div className="mt-2 p-2 bg-amber-50/60 border border-amber-200/70 rounded text-[10px] text-amber-950">
                        <span className="font-bold block uppercase text-[9px] text-amber-800">Estudios Solicitados:</span>
                        {record.requested_studies}
                      </div>
                    )}
                  </div>

                  {renderSignatureFooter(true)}
                </div>

              </div>
            </div>

            {/* Footer Close Button (Hidden on Print) */}
            <div className="print:hidden p-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <span className="text-xs text-slate-500">
                Presiona <strong>Imprimir / PDF</strong> para obtener el formato oficial con QR para farmacia.
              </span>
              <DialogClose asChild>
                <Button type="button" variant="outline" size="sm" className="text-xs">
                  Cerrar
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogContent>

        {/* Global Landscape Print Stylesheet */}
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
              padding: 0 !important;
              margin: 0 !important;
            }
            #printable-recipe-sheet .grid {
              display: grid !important;
              grid-template-columns: 1fr 1fr !important;
              height: 96vh !important;
              border: 2px solid #94a3b8 !important;
            }
            #printable-recipe-sheet .grid > div {
              padding: 18px !important;
              min-height: 90vh !important;
            }
          }
        `}</style>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL EMERGENTE DE CÓDIGO QR PARA MOSTRAR EN FARMACIA                     */}
      {/* ========================================================================= */}
      <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 rounded-3xl p-6 text-center shadow-2xl">
          <DialogHeader>
            <div className="h-12 w-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-2 shadow-xs">
              <QrCode className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Código QR de Validación Médica
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Muestra este código en el mostrador de la farmacia para despachar tus medicamentos o compártelo digitalmente.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 flex flex-col items-center justify-center space-y-3">
            {qrCodeUrl ? (
              <div className="p-4 bg-white border-2 border-slate-200 rounded-2xl shadow-sm inline-block">
                <img src={qrCodeUrl} alt="QR Récipe Médico" className="h-52 w-52 object-contain" />
              </div>
            ) : (
              <div className="h-52 w-52 bg-slate-100 rounded-2xl flex items-center justify-center text-xs text-slate-400">
                Generando QR...
              </div>
            )}

            <div className="space-y-1">
              <span className="font-mono text-sm font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 inline-block">
                {recipeCode}
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

