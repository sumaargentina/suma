
"use client";

import { useState } from 'react';
import type { Schedule } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CheckCircle, Loader2, X, Power } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import * as supabaseService from '@/lib/supabaseService';

interface ScheduleTabProps {
  doctorData: {
    id: string;
    schedule: Schedule;
  };
  onScheduleUpdate: () => void;
}

const dayLabels: Record<keyof Schedule, string> = { monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo' };
const daysOfWeek: (keyof Schedule)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function ScheduleTab({ doctorData, onScheduleUpdate }: ScheduleTabProps) {
  const { toast } = useToast();
  const [tempSchedule, setTempSchedule] = useState<Schedule | null>(doctorData.schedule);
  const [isScheduleSaved, setIsScheduleSaved] = useState(true);

  const handleScheduleChange = (day: keyof Schedule, field: 'active' | 'slot', value: unknown, slotIndex?: number) => {
    if (!tempSchedule) return;
    const newSchedule = { ...tempSchedule };
    if (field === 'active') {
        newSchedule[day].active = Boolean(value);
    } else if (field === 'slot' && slotIndex !== undefined) {
        if (typeof value === 'object' && value !== null) {
          newSchedule[day].slots[slotIndex] = value as { start: string; end: string };
        }
    }
    setTempSchedule(newSchedule);
    setIsScheduleSaved(false);
  };

  const handleAddSlot = (day: keyof Schedule) => {
    if (!tempSchedule) return;
    const newSchedule = { ...tempSchedule };
    newSchedule[day].slots.push({ start: '09:00', end: '10:00' });
    setTempSchedule(newSchedule);
    setIsScheduleSaved(false);
  };

  const handleRemoveSlot = (day: keyof Schedule, slotIndex: number) => {
    if (!tempSchedule) return;
    const newSchedule = { ...tempSchedule };
    newSchedule[day].slots.splice(slotIndex, 1);
    setTempSchedule(newSchedule);
    setIsScheduleSaved(false);
  };
  
  const handleSaveSchedule = async () => {
    if(!doctorData || !tempSchedule) return;
    await supabaseService.updateDoctor(doctorData.id, { schedule: tempSchedule });
    toast({ title: 'Horario Guardado', description: 'Tu disponibilidad ha sido actualizada.' });
    setIsScheduleSaved(true);
    onScheduleUpdate();
  }

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0 py-3 md:py-6">
        <CardTitle className="text-base md:text-2xl">Mi Horario</CardTitle>
        <Button onClick={handleSaveSchedule} disabled={isScheduleSaved} className="w-full md:w-auto mt-2 md:mt-0">
          {isScheduleSaved ? <CheckCircle className="mr-2"/> : <Loader2 className="mr-2 animate-spin"/>}
          {isScheduleSaved ? 'Horario Guardado' : 'Guardar Cambios'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4">
        {tempSchedule && daysOfWeek.map(day => (
          <div key={day} className="border p-3 md:p-4 rounded-lg space-y-2 md:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2 md:mb-4">
              <h3 className="text-sm md:text-lg font-semibold">{dayLabels[day]}</h3>
              {/* Botón toggle en móvil, switch en escritorio */}
              <div className="block md:hidden w-full">
                <Button
                  type="button"
                  onClick={() => handleScheduleChange(day, 'active', !tempSchedule[day].active)}
                  className={`w-full flex items-center justify-center gap-2 text-xs py-2 ${tempSchedule[day].active ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}
                  variant={tempSchedule[day].active ? 'default' : 'outline'}
                >
                  <Power className="h-4 w-4" />
                  {tempSchedule[day].active ? 'Activo' : 'Inactivo'}
                </Button>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <Label htmlFor={`switch-${day}`}>Atiende</Label>
                <Switch 
                  id={`switch-${day}`} 
                  checked={tempSchedule[day].active} 
                  onCheckedChange={(checked) => handleScheduleChange(day, 'active', checked)} 
                />
              </div>
            </div>
            {tempSchedule[day].active && (
              <div className="space-y-2">
                {tempSchedule[day].slots.map((slot, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input type="time" value={slot.start} onChange={(e) => handleScheduleChange(day, 'slot', {...slot, start: e.target.value}, index)} className="h-8 w-24 text-xs md:h-10 md:w-32 md:text-sm" />
                    <Input type="time" value={slot.end} onChange={(e) => handleScheduleChange(day, 'slot', {...slot, end: e.target.value}, index)} className="h-8 w-24 text-xs md:h-10 md:w-32 md:text-sm" />
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveSlot(day, index)} className="h-8 w-8 md:h-10 md:w-10"><X className="h-4 w-4"/></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => handleAddSlot(day)} className="h-8 px-2 text-xs md:h-10 md:px-4 md:text-sm">+ Añadir bloque</Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
