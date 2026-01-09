
"use client";
import { useState, useCallback, useEffect } from 'react';
import type { MarketingMaterial as MarketingMaterialType } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import * as supabaseService from '@/lib/supabaseService';
import { PlusCircle, ShoppingBag, ImageIcon, Video, FileText, Link as LinkIcon, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { MarketingMaterialCard } from './marketing-card';
import { } from '@/lib/utils';

const MarketingMaterialSchema = z.object({
  title: z.string().min(3, "El título es requerido."),
  description: z.string().min(10, "La descripción es requerida."),
  type: z.enum(['image', 'video', 'file', 'url']),
  url: z.string().min(1, "Se requiere una URL o un archivo."),
  thumbnailUrl: z.string().min(1, "Se requiere una URL de miniatura o un archivo."),
});

const fileToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
  });
};

export function MarketingTab() {
  const { toast } = useToast();
  
  const [marketingMaterials, setMarketingMaterials] = useState<MarketingMaterialType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isMarketingDialogOpen, setIsMarketingDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MarketingMaterialType | null>(null);
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [isSavingMaterial, setIsSavingMaterial] = useState(false);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MarketingMaterialType | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
        const materials = await supabaseService.getMarketingMaterials();
        setMarketingMaterials(materials);
    } catch {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los materiales de marketing.' });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openDeleteDialog = (material: MarketingMaterialType) => {
    setItemToDelete(material);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      await supabaseService.deleteMarketingMaterial(itemToDelete.id);
      toast({ title: "Material Eliminado" });
      fetchData();
    } catch {
      toast({ variant: 'destructive', title: 'Error al eliminar', description: 'No se pudo completar la operación.' });
    } finally {
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };


  const handleSaveMaterial = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsSavingMaterial(true);
      const formData = new FormData(e.currentTarget);

      let finalUrl = formData.get('url') as string;
      let finalThumbnailUrl = formData.get('thumbnailUrl') as string;

      try {
          if (materialFile) { finalUrl = await fileToDataUri(materialFile); }
          if (thumbnailFile) { finalThumbnailUrl = await fileToDataUri(thumbnailFile); }
          
          const dataToValidate = {
              title: formData.get('title') as string,
              description: formData.get('description') as string,
              type: formData.get('type') as MarketingMaterialType['type'],
              url: finalUrl,
              thumbnailUrl: finalThumbnailUrl || (finalUrl.startsWith('data:image') ? finalUrl : 'https://placehold.co/600x400.png'),
          };

          const result = MarketingMaterialSchema.safeParse(dataToValidate);
          if (!result.success) {
              toast({ variant: 'destructive', title: 'Errores de Validación', description: result.error.errors.map(err => err.message).join(' ') });
              setIsSavingMaterial(false);
              return;
          }
          
          if (editingMaterial) {
              await supabaseService.updateMarketingMaterial(editingMaterial.id, result.data);
              toast({ title: "Material Actualizado" });
          } else {
              await supabaseService.addMarketingMaterial(result.data);
              toast({ title: "Material Agregado" });
          }
          
          fetchData();
          setIsMarketingDialogOpen(false);
          setEditingMaterial(null);
      } catch {
          toast({ variant: 'destructive', title: 'Error al procesar archivo', description: 'No se pudo leer el archivo seleccionado.' });
      } finally {
          setIsSavingMaterial(false);
      }
  };

  const openDialog = (material: MarketingMaterialType | null) => {
    setEditingMaterial(material);
    setMaterialFile(null);
    setThumbnailFile(null);
    setIsMarketingDialogOpen(true);
  };
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <CardTitle className="flex items-center gap-2"><ShoppingBag/> Material de Marketing</CardTitle>
                <CardDescription>Gestiona los recursos que las vendedoras usan para promocionar SUMA.</CardDescription>
            </div>
            <Button onClick={() => openDialog(null)}>
                <PlusCircle className="mr-2"/> Añadir Material
            </Button>
        </CardHeader>
        <CardContent>
            {marketingMaterials.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {marketingMaterials.map((material) => (
                        <MarketingMaterialCard 
                            key={material.id} 
                            material={material} 
                            onEdit={() => openDialog(material)}
                            onDelete={() => openDeleteDialog(material)}
                        />
                    ))}
                </div>
            ) : (<p className="text-center text-muted-foreground py-12">No hay materiales de marketing cargados.</p>)}
        </CardContent>
      </Card>
      
      <Dialog open={isMarketingDialogOpen} onOpenChange={setIsMarketingDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[625px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMaterial ? "Editar Material" : "Añadir Nuevo Material"}</DialogTitle>
            <DialogDescription>Completa la información del recurso de marketing.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveMaterial}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input id="title" name="title" defaultValue={editingMaterial?.title} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción Detallada</Label>
                <Textarea id="description" name="description" defaultValue={editingMaterial?.description} rows={4} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Material</Label>
                <Select name="type" defaultValue={editingMaterial?.type || 'image'}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image"><div className="flex items-center gap-2"><ImageIcon/> Imagen</div></SelectItem>
                    <SelectItem value="video"><div className="flex items-center gap-2"><Video/> Video</div></SelectItem>
                    <SelectItem value="file"><div className="flex items-center gap-2"><FileText/> Archivo (PDF, etc.)</div></SelectItem>
                    <SelectItem value="url"><div className="flex items-center gap-2"><LinkIcon/> Enlace</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">URL del Recurso</Label>
                <Input id="url" name="url" defaultValue={editingMaterial?.url} placeholder="https://..."/>
                <p className="text-xs text-center text-muted-foreground">O</p>
                <Label htmlFor="materialFile" className="text-sm">Subir Archivo de Recurso</Label>
                <Input id="materialFile" type="file" onChange={(e) => setMaterialFile(e.target.files?.[0] || null)}/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="thumbnailUrl">URL de la Miniatura</Label>
                <Input id="thumbnailUrl" name="thumbnailUrl" defaultValue={editingMaterial?.thumbnailUrl} placeholder="https://..."/>
                 <p className="text-xs text-center text-muted-foreground">O</p>
                <Label htmlFor="thumbnailFile" className="text-sm">Subir Archivo de Miniatura</Label>
                <Input id="thumbnailFile" type="file" onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}/>
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="w-full sm:w-auto">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={isSavingMaterial} className="w-full sm:w-auto">
                {isSavingMaterial && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro que deseas eliminar?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Esta acción es permanente y no se puede deshacer. Se eliminará &quot;{itemToDelete?.title}&quot; del sistema.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Sí, Eliminar
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
