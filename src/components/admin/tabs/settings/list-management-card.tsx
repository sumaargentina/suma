"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PlusCircle, Pencil, Trash2, Search, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';

type Item = {
    id: string;
    [key: string]: unknown;
};

interface ColumnDefinition {
    header: string;
    key: string;
    isCurrency?: boolean;
}

interface ItemSchema {
    [key: string]: {
        label: string;
        type: 'text' | 'number';
        placeholder?: string;
        required?: boolean;
    }
}

interface ListManagementCardProps {
    title: string;
    description: string;
    listName: string;
    items: Item[];
    onAddItem: (item: Record<string, unknown>) => Promise<void>;
    onUpdateItem: (id: string, item: Record<string, unknown>) => Promise<void>;
    onDeleteItem: (id: string) => Promise<void>;
    columns: ColumnDefinition[];
    itemSchema: ItemSchema;
    itemNameSingular: string;
}

export function ListManagementCard({ title, description, items, onAddItem, onUpdateItem, onDeleteItem, columns, itemSchema, itemNameSingular }: ListManagementCardProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const openDialog = (item: Item | null) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (item: Item) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);

    const formData = new FormData(e.currentTarget);
    const newItemData: { [key: string]: unknown } = {};

    for (const key in itemSchema) {
      const value = formData.get(key) as string;
      newItemData[key] = itemSchema[key].type === 'number' ? Number(value) : value;
    }

    try {
      if (editingItem) {
        await onUpdateItem(editingItem.id, newItemData);
        toast({ title: `${itemNameSingular} actualizado(a)`, description: 'Los cambios han sido guardados exitosamente.' });
      } else {
        await onAddItem(newItemData);
        toast({ title: `${itemNameSingular} añadido(a)`, description: 'El elemento ha sido creado exitosamente.' });
      }
      setIsDialogOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error al guardar:', error);
      toast({ variant: 'destructive', title: 'Error', description: `No se pudo guardar el/la ${itemNameSingular.toLowerCase()}.` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    
    try {
        await onDeleteItem(itemToDelete.id);
        toast({ title: `${itemNameSingular} eliminado(a)`, description: 'El elemento ha sido eliminado exitosamente.' });
        setIsDeleteDialogOpen(false);
        setItemToDelete(null);
    } catch {
        toast({ variant: 'destructive', title: 'Error', description: `No se pudo eliminar el/la ${itemNameSingular.toLowerCase()}.` });
    } finally {
        setIsDeleting(false);
    }
  };

  // Filtrar elementos por término de búsqueda
  const filteredItems = items.filter(item => 
    Object.values(item).some(value => 
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <>
      <Card className="border-primary/10">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl">{title}</CardTitle>
              <CardDescription className="text-base">{description}</CardDescription>
            </div>
            <Button onClick={() => openDialog(null)} className="shrink-0 w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4"/>
              Añadir {itemNameSingular}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Barra de búsqueda y estadísticas mejorada */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Buscar ${itemNameSingular.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{filteredItems.length} de {items.length}</Badge>
              <span>{itemNameSingular.toLowerCase()}{filteredItems.length !== 1 ? 'es' : ''}</span>
            </div>
          </div>

          <Separator />

          {/* Vista móvil mejorada */}
          <div className="md:hidden space-y-3">
            {filteredItems.map(item => (
              <div key={item.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    {columns.map(col => (
                      <div key={col.key} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">{col.header}:</span>
                        <span className="text-sm font-medium truncate ml-2">
                          {col.isCurrency ? (
                            <span className="font-mono">${Number(item[col.key]).toFixed(2)}</span>
                          ) : (
                            String(item[col.key] ?? "")
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openDialog(item)}
                    className="h-8 px-3"
                  >
                    <Pencil className="h-3 w-3 mr-1"/>
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openDeleteDialog(item)}
                    className="h-8 px-3 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-1"/>
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
            
            {filteredItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No se encontraron {itemNameSingular.toLowerCase()}s</p>
                {searchTerm && (
                  <p className="text-sm">Intenta con otros términos de búsqueda</p>
                )}
              </div>
            )}
          </div>

          {/* Tabla responsiva para desktop */}
          <div className="hidden md:block rounded-md border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map(col => (
                      <TableHead key={col.key} className={cn(
                        col.isCurrency ? 'text-right' : '',
                        'whitespace-nowrap'
                      )}>
                        {col.header}
                      </TableHead>
                    ))}
                    <TableHead className="w-24 text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map(item => (
                    <TableRow key={item.id} className="hover:bg-muted/50">
                      {columns.map(col => (
                        <TableCell key={col.key} className={cn(
                          col.isCurrency ? 'text-right font-medium' : '',
                          'whitespace-nowrap'
                        )}>
                          {col.isCurrency ? (
                            <span className="font-mono">${Number(item[col.key]).toFixed(2)}</span>
                          ) : (
                            String(item[col.key] ?? "")
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => openDialog(item)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-3 w-3"/>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => openDeleteDialog(item)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3"/>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {filteredItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No se encontraron {itemNameSingular.toLowerCase()}s</p>
                {searchTerm && (
                  <p className="text-sm">Intenta con otros términos de búsqueda</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de edición/creación mejorado */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? `Editar ${itemNameSingular}` : `Añadir ${itemNameSingular}`}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSave} className="space-y-4">
            {Object.entries(itemSchema).map(([key, field]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key} className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <Input
                  id={key}
                  name={key}
                  type={field.type}
                  placeholder={field.placeholder || field.label}
                  defaultValue={
                    editingItem && typeof editingItem[key] !== 'object'
                      ? String(editingItem[key] ?? "")
                      : ""
                  }
                  required={field.required}
                  className="h-10"
                />
              </div>
            ))}
            
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="w-full sm:w-auto">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación de eliminación mejorado */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar este/a {itemNameSingular.toLowerCase()}? 
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="w-full sm:w-auto bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
