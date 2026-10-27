"use client";

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { updateDoctorWorkspace } from '@/lib/supabaseService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Building2, Stethoscope, Landmark, ChevronDown, Check, PlusCircle, BellRing, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { WorkspaceType, DoctorWorkspace } from '@/lib/types';

export function WorkspaceSwitcherHeader() {
  const { user, workspaces, activeWorkspace, switchWorkspace, refreshWorkspaces, setShowWorkspaceModal } = useAuth();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (!user || user.role !== 'doctor') {
    return null;
  }

  const activeWorkspaces = workspaces.filter(w => w.status === 'active');
  const pendingInvitations = workspaces.filter(w => w.status === 'pending_invitation');

  const getWorkspaceIcon = (type: WorkspaceType, className = "w-4 h-4") => {
    switch (type) {
      case 'private':
        return <Stethoscope className={`${className} text-emerald-600`} />;
      case 'clinic':
        return <Building2 className={`${className} text-blue-600`} />;
      case 'public_hospital':
        return <Landmark className={`${className} text-sky-600`} />;
      default:
        return <Building2 className={`${className} text-gray-600`} />;
    }
  };

  const handleRespondInvitation = async (e: React.MouseEvent, ws: DoctorWorkspace, accept: boolean) => {
    e.preventDefault();
    e.stopPropagation();
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
          title: '¡Espacio de trabajo validado!',
          description: `Te has integrado exitosamente al equipo de ${instName}. Ya puedes seleccionarlo cuando atiendas allí.`,
        });
      } else {
        toast({
          title: 'Invitación rechazada',
          description: `Has rechazado la integración con ${instName}.`,
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Ocurrió un problema al procesar la solicitud.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const activeName = activeWorkspace?.name || 'Mi Consultorio Privado';
  const activeType = activeWorkspace?.workspaceType || 'private';

  const getSubtitle = (type: WorkspaceType) => {
    if (type === 'private') return 'Consultorio Particular';
    if (type === 'public_hospital') return 'Hospital / Centro Gratuito';
    return 'Clínica Afiliada';
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="relative flex items-center gap-1.5 px-2.5 py-1 h-9 text-xs font-medium bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all rounded-lg"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              {getWorkspaceIcon(activeType, "w-3.5 h-3.5")}
              <div className="flex flex-col items-start text-left truncate max-w-[120px] sm:max-w-[180px]">
                <span className="font-semibold text-gray-900 dark:text-white truncate text-xs leading-tight">
                  {activeName}
                </span>
                <span className="text-[10px] text-gray-500 font-normal leading-none">
                  {getSubtitle(activeType)}
                </span>
              </div>
            </div>
            {pendingInvitations.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded-full animate-pulse">
                {pendingInvitations.length}
              </span>
            )}
            <ChevronDown className="w-3 h-3 text-gray-400 ml-0.5 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-80 p-1.5 shadow-xl rounded-xl">
          <DropdownMenuLabel className="px-2.5 py-1.5 text-xs text-gray-500 font-semibold uppercase tracking-wider">
            Espacios de Trabajo Activos
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1" />

          {activeWorkspaces.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-500">
              Mi Consultorio Privado
            </div>
          ) : (
            activeWorkspaces.map((ws) => {
              const isSelected = activeWorkspace?.id === ws.id;
              const title = ws.customName || ws.clinicName || (ws.workspaceType === 'private' ? 'Mi Consultorio Privado' : 'Clínica Institucional');

              return (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => switchWorkspace(ws.id)}
                  className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer my-0.5 transition-colors ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-md ${
                      ws.workspaceType === 'private'
                        ? 'bg-emerald-50 text-emerald-600'
                        : ws.workspaceType === 'public_hospital'
                        ? 'bg-sky-50 text-sky-600'
                        : 'bg-blue-50 text-blue-600'
                    }`}>
                      {getWorkspaceIcon(ws.workspaceType, "w-3.5 h-3.5")}
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="text-xs truncate font-medium">
                        {title}
                      </span>
                      <span className="text-[10px] text-gray-400 leading-tight">
                        {ws.workspaceType === 'private'
                          ? 'Cobro directo & Finanzas propias'
                          : ws.workspaceType === 'public_hospital'
                          ? 'Hospital / Atención Gratuita'
                          : 'Clínica / Atención Institucional'}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0 ml-2" />
                  )}
                </DropdownMenuItem>
              );
            })
          )}

          {pendingInvitations.length > 0 && (
            <>
              <DropdownMenuSeparator className="my-1.5" />
              <div className="px-2.5 py-1 flex items-center gap-1.5 text-[11px] font-bold text-amber-700 uppercase tracking-wide">
                <BellRing className="w-3.5 h-3.5 text-amber-600" />
                <span>Invitaciones por Validar ({pendingInvitations.length})</span>
              </div>
              {pendingInvitations.map((ws) => {
                const title = ws.customName || ws.clinicName || 'Clínica / Hospital';
                const isProcessing = processingId === ws.id;
                return (
                  <div
                    key={ws.id}
                    className="m-1 p-2.5 rounded-lg bg-amber-50/90 border border-amber-200 text-xs space-y-2"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{title}</p>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        Te está integrando a su espacio de trabajo en SUMA. ¿Deseas validarlo?
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        className="h-7 flex-1 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={isProcessing}
                        onClick={(e) => handleRespondInvitation(e, ws, true)}
                      >
                        {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                        Validar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] border-red-200 text-red-600 hover:bg-red-50"
                        disabled={isProcessing}
                        onClick={(e) => handleRespondInvitation(e, ws, false)}
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Rechazar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem
            onClick={() => setShowWorkspaceModal(true)}
            className="flex items-center gap-2 p-2 text-xs font-medium text-primary hover:bg-primary/5 rounded-lg cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Ver todos los espacios de trabajo</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
