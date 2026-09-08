"use client";

import React from 'react';
import { useAuth } from '@/lib/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Building2, Stethoscope, Landmark, CheckCircle2, ShieldAlert, ArrowRight } from 'lucide-react';
import type { DoctorWorkspace } from '@/lib/types';

export function WorkspaceSelectorModal() {
  const { user, workspaces, activeWorkspace, switchWorkspace, showWorkspaceModal, setShowWorkspaceModal } = useAuth();

  if (!user || user.role !== 'doctor' || workspaces.length <= 1) {
    return null;
  }

  const handleSelectWorkspace = async (workspace: DoctorWorkspace) => {
    await switchWorkspace(workspace.id);
    setShowWorkspaceModal(false);
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
    if (workspace.workspaceType === 'public_hospital') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
          Salud Pública • Atención Institucional
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
              Selección de Perfil
            </span>
          </div>
          <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            ¿En qué espacio vas a atender hoy, {user.name}?
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Puedes cambiar de sede o consultorio en cualquier momento desde la barra superior sin cerrar sesión.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3.5 my-2">
          {workspaces.map((ws) => {
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
                      ? 'Administras tu agenda completa, pacientes particulares, cobros por Mercado Pago / Transferencia y finanzas.'
                      : `Atención de pacientes citados por la institución. Las finanzas y cobros son administrados por ${title}.`}
                  </p>

                  {ws.clinicAddress && (
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      📍 {ws.clinicAddress}
                    </p>
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
            <span>Tus datos médicos se organizan de forma segura según la sede activa.</span>
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
