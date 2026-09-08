"use client";

import React from 'react';
import { useAuth } from '@/lib/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Building2, Stethoscope, Landmark, ChevronDown, Check, PlusCircle } from 'lucide-react';
import type { WorkspaceType } from '@/lib/types';

export function WorkspaceSwitcherHeader() {
  const { user, workspaces, activeWorkspace, switchWorkspace, setShowWorkspaceModal } = useAuth();

  if (!user || user.role !== 'doctor') {
    return null;
  }

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

  const activeName = activeWorkspace?.name || 'Mi Consultorio Privado';
  const isPrivate = activeWorkspace?.workspaceType === 'private' || !activeWorkspace;

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center gap-1.5 px-2.5 py-1 h-9 text-xs font-medium bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all rounded-lg"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              {getWorkspaceIcon(activeWorkspace?.workspaceType || 'private', "w-3.5 h-3.5")}
              <div className="flex flex-col items-start text-left truncate max-w-[120px] sm:max-w-[170px]">
                <span className="font-semibold text-gray-900 dark:text-white truncate text-xs leading-tight">
                  {activeName}
                </span>
                <span className="text-[10px] text-gray-500 font-normal leading-none">
                  {isPrivate ? 'Consultorio Particular' : 'Atención Institucional'}
                </span>
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-gray-400 ml-0.5 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-72 p-1.5 shadow-xl rounded-xl">
          <DropdownMenuLabel className="px-2.5 py-1.5 text-xs text-gray-500 font-semibold uppercase tracking-wider">
            Sedes y Espacios de Atención
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1" />

          {workspaces.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-500">
              Consultorio Privado Principal
            </div>
          ) : (
            workspaces.map((ws) => {
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
                      ws.workspaceType === 'private' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {getWorkspaceIcon(ws.workspaceType, "w-3.5 h-3.5")}
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="text-xs truncate font-medium">
                        {title}
                      </span>
                      <span className="text-[10px] text-gray-400 leading-tight">
                        {ws.workspaceType === 'private' ? 'Cobro directo & Finanzas' : 'Atención clínica'}
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

          {workspaces.length > 1 && (
            <>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={() => setShowWorkspaceModal(true)}
                className="flex items-center gap-2 p-2 text-xs font-medium text-primary hover:bg-primary/5 rounded-lg cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Ver todos los perfiles de atención</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
