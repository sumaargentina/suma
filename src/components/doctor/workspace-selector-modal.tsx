"use client";

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { updateDoctorWorkspace, unlinkClinicDoctor } from '@/lib/supabaseService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Building2, Stethoscope, Landmark, CheckCircle2, ShieldAlert, ArrowRight, BellRing, XCircle, Loader2, UserMinus } from 'lucide-react';
import type { DoctorWorkspace } from '@/lib/types';

export function WorkspaceSelectorModal() {
  const { user, workspaces, activeWorkspace, switchWorkspace, refreshWorkspaces, showWorkspaceModal, setShowWorkspaceModal } = useAuth();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmingLeaveId, setConfirmingLeaveId] = useState<string | null>(null);

  if (!user || user.role !== 'doctor') {
    return null;
  }

  const activeWorkspaces = workspaces.filter(w => w.status === 'active');
  const pendingInvitations = workspaces.filter(w => w.status === 'pending_invitation');

  const handleSelectWorkspace = async (workspace: DoctorWorkspace) => {
    if (workspace.status !== 'active') return;
    await switchWorkspace(workspace.id);
    setShowWorkspaceModal(false);
  };

  const handleRespondInvitation = async (ws: DoctorWorkspace, accept: boolean) => {
    setProcessingId(ws.id);
    try {
      const ok = await updateDoctorWorkspace(ws.id, {
        status: accept ? 'active' : 'inactive',
      });
      if (!ok) throw new Error('No se pudo actualizar la invitación');

      await refreshWorkspaces();
      const instName = ws.customName || ws.clinicName || 'la institución';

      if (accept) {
        toast({
          title: '¡Integración validada!',
          description: `Has validado tu incorporación a ${instName}. Ya puedes seleccionar este espacio de trabajo.`,
        });
      } else {
        toast({
          title: 'Invitación rechazada',
          description: `Has rechazado la invitación de ${instName}.`,
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'No se pudo procesar la solicitud.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleLeaveWorkspace = async (e: React.MouseEvent, ws: DoctorWorkspace) => {
    e.stopPropagation();
    setProcessingId(ws.id);
    try {
      const instName = ws.customName || ws.clinicName || 'la institución';
      if (ws.clinicId) {
        await unlinkClinicDoctor(ws.clinicId, user.id);
      } else {
        await updateDoctorWorkspace(ws.id, { status: 'inactive', isDefault: false });
      }
      setConfirmingLeaveId(null);
      await refreshWorkspaces();

      // Si estaba activo ese espacio, cambiar automáticamente a su consultorio privado
      if (activeWorkspace?.id === ws.id) {
        const privateWs = workspaces.find(w => w.workspaceType === 'private' && w.status === 'active');
        if (privateWs) {
          await switchWorkspace(privateWs.id);
        }
      }

      toast({
        title: 'Te has desvinculado de la institución',
        description: `Ya no formas parte activa de ${instName}. Tu consultorio privado e historial médico siguen intactos.`,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'No se pudo completar la desvinculación.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getWorkspaceIcon = (type: string) => {
    switch (type) {
      case 'private':
        return <Stethoscope className="w-6 h-6 text-primary" />;
      case 'clinic':
        return <Building2 className="w-6 h-6 text-blue-600" />;
      case 'public_hospital':
        return <Landmark className="w-6 h-6 text-emerald-600" />;
      default:
        return <Building2 className="w-6 h-6 text-primary" />;
    }
  };

  const getWorkspaceBadge = (workspace: DoctorWorkspace) => {
    if (workspace.workspaceType === 'private') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Consultorio Particular • Finanzas Propias
        </span>
      );
    }
    if (workspace.workspaceType === 'public_hospital' || workspace.clinicPlan === 'hospital_gratuito') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
          Salud Pública / Hospital • Atención Gratuita
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        Clínica / Sanatorio • Citas Asignadas
      </span>
    );
  };

  return (
    <Dialog open={showWorkspaceModal} onOpenChange={setShowWorkspaceModal}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8">
        <DialogHeader className="text-center sm:text-left mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-primary/10 text-primary uppercase tracking-wide">
              Espacios de Trabajo
            </span>
          </div>
          <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            ¿En qué espacio vas a atender hoy, {user.name}?
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Puedes cambiar entre tu consultorio independiente y las clínicas u hospitales afiliados en cualquier momento desde la barra superior.
          </DialogDescription>
        </DialogHeader>

        {/* INVITACIONES PENDIENTES DE VALIDACIÓN */}
        {pendingInvitations.length > 0 && (
          <div className="mb-4 p-4 rounded-xl bg-amber-50 border-2 border-amber-200 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <BellRing className="w-5 h-5 text-amber-600 animate-bounce" />
              <span>Solicitudes de Integración Pendientes de tu Validación ({pendingInvitations.length})</span>
            </div>
            <div className="space-y-2.5">
              {pendingInvitations.map((ws) => {
                const title = ws.customName || ws.clinicName || 'Clínica / Hospital';
                const isHospital = ws.workspaceType === 'public_hospital' || ws.clinicPlan === 'hospital_gratuito';
                const isProcessing = processingId === ws.id;

                return (
                  <div key={ws.id} className="bg-white p-3.5 rounded-lg border border-amber-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{title}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                          {isHospital ? '🏥 Hospital / Centro Gratuito' : '🏢 Clínica en SUMA'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Esta institución te ha registrado en su plantel médico. Valida tu integración para habilitar este espacio de trabajo en tu cuenta.
                      </p>
                      {ws.clinicAddress && (
                        <p className="text-[11px] text-slate-500">📍 {ws.clinicAddress}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                        disabled={isProcessing}
                        onClick={() => handleRespondInvitation(ws, true)}
                      >
                        {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                        Validar e Integrarme
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 text-xs"
                        disabled={isProcessing}
                        onClick={() => handleRespondInvitation(ws, false)}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        Rechazar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LISTA DE ESPACIOS ACTIVOS */}
        <div className="grid gap-3.5 my-2">
          {activeWorkspaces.map((ws) => {
            const isSelected = activeWorkspace?.id === ws.id;
            const title = ws.customName || ws.clinicName || (ws.workspaceType === 'private' ? 'Mi Consultorio Privado' : 'Clínica Institucional');

            return (
              <div
                key={ws.id}
                onClick={() => handleSelectWorkspace(ws)}
                className={`relative group flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                    : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50/80 dark:border-gray-800 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className={`p-3 rounded-xl flex-shrink-0 ${
                  ws.workspaceType === 'private' ? 'bg-primary/10' : ws.workspaceType === 'public_hospital' ? 'bg-emerald-50' : 'bg-blue-50'
                }`}>
                  {getWorkspaceIcon(ws.workspaceType)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                      {title}
                    </h4>
                    {getWorkspaceBadge(ws)}
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {ws.workspaceType === 'private'
                      ? 'Administras tu agenda completa, pacientes particulares, cobros directos a tus cuentas y finanzas.'
                      : ws.workspaceType === 'public_hospital' || ws.clinicPlan === 'hospital_gratuito'
                      ? `Atención gratuita de pacientes en ${title}. Sin costos de consulta ni mensualidad.`
                      : `Atención de pacientes citados por la institución. Las finanzas y cobros son administrados por ${title}.`}
                  </p>

                  {ws.clinicAddress && (
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      📍 {ws.clinicAddress}
                    </p>
                  )}

                  {ws.workspaceType !== 'private' && (
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      {confirmingLeaveId === ws.id ? (
                        <div className="flex items-center gap-2 flex-wrap text-xs bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 w-full justify-between">
                          <span className="text-red-800 font-medium">
                            ¿Confirmas que ya no trabajas en {title}?
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 px-2.5 text-[11px]"
                              disabled={processingId === ws.id}
                              onClick={(e) => handleLeaveWorkspace(e, ws)}
                            >
                              {processingId === ws.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                              Sí, desvincularme
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-[11px]"
                              disabled={processingId === ws.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmingLeaveId(null);
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmingLeaveId(ws.id);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-red-600 hover:text-red-700 font-medium hover:underline"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          Ya no trabajo en esta institución (Desvincularme)
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center self-center pl-2">
                  {isSelected ? (
                    <div className="flex items-center gap-1 text-xs font-bold text-primary bg-white dark:bg-gray-900 px-3 py-1.5 rounded-full border border-primary/30 shadow-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Activo</span>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="group-hover:translate-x-0.5 transition-transform text-xs font-medium"
                    >
                      Ingresar <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>Tus datos médicos se organizan de forma segura según el espacio de trabajo activo.</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowWorkspaceModal(false)}
            className="text-xs"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
