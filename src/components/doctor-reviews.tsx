"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Star, MessageCircle, CheckCircle, User, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import * as supabaseService from '@/lib/supabaseService';
import type { DoctorReview, Doctor } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DoctorReviewsProps {
  doctor: Doctor;
  onReviewAdded?: () => void;
}

export function DoctorReviews({ doctor, onReviewAdded }: DoctorReviewsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [reviews, setReviews] = useState<DoctorReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddReviewOpen, setIsAddReviewOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentReview, setCurrentReview] = useState<DoctorReview | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const isPatient = user?.role === 'patient';
  const hasReviewed = reviews.some(review => review.patientId === user?.id);

  const fetchReviews = useCallback(async () => {
    if (!doctor?.id) return;
    setIsLoading(true);
    try {
      const reviewsData = await supabaseService.getDoctorReviews(doctor.id);
      setReviews(reviewsData);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setIsLoading(false);
    }
  }, [doctor?.id]);

  useEffect(() => {
    fetchReviews();
  }, [doctor.id, fetchReviews]);

  const handleAddReview = () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Inicia Sesión',
        description: 'Debes iniciar sesión para valorar al médico.',
      });
      return;
    }

    if (user.role !== 'patient') {
      toast({
        variant: 'destructive',
        title: 'Acceso Denegado',
        description: 'Solo los pacientes pueden valorar a los médicos.',
      });
      return;
    }

    // Verificar si ya valoró
    const existingReview = reviews.find(review => review.patientId === user.id);
    if (existingReview) {
      setCurrentReview(existingReview);
      setRating(existingReview.rating);
      setComment(existingReview.comment);
      setIsEditing(true);
    }

    setIsAddReviewOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!user || user.role !== 'patient') return;

    if (comment.trim().length < 10) {
      toast({
        variant: 'destructive',
        title: 'Comentario Muy Corto',
        description: 'El comentario debe tener al menos 10 caracteres.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const reviewData: Omit<DoctorReview, 'id'> = {
        doctorId: doctor.id,
        patientId: user.id,
        patientName: user.name,
        patientProfileImage: user.profileImage || null,
        rating,
        comment: comment.trim(),
        date: new Date().toISOString(),
        isVerified: false,
      };

      if (isEditing && currentReview) {
        await supabaseService.updateDoctorReview(currentReview.id, {
          rating,
          comment: comment.trim(),
          date: new Date().toISOString(),
        });
        toast({
          title: 'Valoración Actualizada',
          description: 'Tu valoración ha sido actualizada exitosamente.',
        });
      } else {
        await supabaseService.addDoctorReview(reviewData);
        toast({
          title: 'Valoración Enviada',
          description: 'Gracias por tu valoración. Ha sido enviada exitosamente.',
        });
      }

      setIsAddReviewOpen(false);
      setRating(5);
      setComment('');
      setCurrentReview(null);
      setIsEditing(false);
      
      await fetchReviews();
      
      if (onReviewAdded) {
        onReviewAdded();
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo enviar la valoración. Inténtalo de nuevo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await supabaseService.deleteDoctorReview(reviewId);
      toast({
        title: 'Valoración Eliminada',
        description: 'Tu valoración ha sido eliminada exitosamente.',
      });
      await fetchReviews();
      if (onReviewAdded) {
        onReviewAdded();
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo eliminar la valoración.',
      });
    }
  };

  const renderStars = (rating: number, interactive = false, onStarClick?: (star: number) => void) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && onStarClick?.(star)}
            disabled={!interactive}
            className={`transition-colors ${
              interactive ? 'hover:scale-110 cursor-pointer' : 'cursor-default'
            }`}
          >
            <Star
              className={`h-4 w-4 ${
                star <= rating
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1: return 'Muy Malo';
      case 2: return 'Malo';
      case 3: return 'Regular';
      case 4: return 'Bueno';
      case 5: return 'Excelente';
      default: return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header compacto */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-400" />
            <span className="font-semibold text-lg">{doctor.rating}</span>
            <span className="text-muted-foreground">/5</span>
          </div>
          <div className="flex items-center gap-1">
            {renderStars(doctor.rating)}
            <span className="text-sm text-muted-foreground ml-2">
              ({doctor.reviewCount} reseña{doctor.reviewCount !== 1 ? 's' : ''})
            </span>
          </div>
        </div>
        
        {isPatient && (
          <Button 
            onClick={handleAddReview}
            size="sm"
            variant={hasReviewed ? "outline" : "default"}
            className="flex items-center gap-2"
          >
            {hasReviewed ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {hasReviewed ? 'Editar' : 'Valorar'}
          </Button>
        )}
      </div>

      <Separator />

      {/* Lista de valoraciones compacta */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Cargando valoraciones...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-sm font-medium mb-1">Sin valoraciones aún</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Sé el primero en valorar a este médico
            </p>
            {isPatient && (
              <Button onClick={handleAddReview} size="sm">
                Valorar Médico
              </Button>
            )}
          </div>
        ) : (
          (showAll ? reviews : reviews.slice(0, 3)).map((review) => (
            <div key={review.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={review.patientProfileImage || undefined} />
                <AvatarFallback className="text-xs">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium truncate">{review.patientName}</h4>
                    {review.isVerified && (
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verificado
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(review.date), 'dd/MM/yyyy', { locale: es })}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  {renderStars(review.rating)}
                  <span className="text-xs text-muted-foreground">
                    {getRatingText(review.rating)}
                  </span>
                </div>
                
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                  {review.comment}
                </p>
                
                {/* Botones de acción compactos */}
                {user?.id === review.patientId && (
                  <div className="flex gap-1 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        setCurrentReview(review);
                        setRating(review.rating);
                        setComment(review.comment);
                        setIsEditing(true);
                        setIsAddReviewOpen(true);
                      }}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleDeleteReview(review.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        {reviews.length > 3 && !showAll && (
          <div className="text-center pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowAll(true)}>
              Ver más valoraciones
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              Mostrando 3 de {reviews.length} valoraciones
            </p>
          </div>
        )}
        {reviews.length > 3 && showAll && (
          <div className="text-center pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAll(false)}>
              Ver menos
            </Button>
          </div>
        )}
      </div>

      {/* Diálogo para agregar/editar valoración */}
      <Dialog open={isAddReviewOpen} onOpenChange={setIsAddReviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Editar Valoración' : 'Valorar Médico'}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Modifica tu valoración del Dr. ' + doctor.name
                : 'Comparte tu experiencia con el Dr. ' + doctor.name
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Calificación</label>
              <div className="flex items-center gap-2">
                {renderStars(rating, true, setRating)}
                <span className="text-sm text-muted-foreground ml-2">
                  {getRatingText(rating)}
                </span>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">
                Comentario (mínimo 10 caracteres)
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Comparte tu experiencia con este médico..."
                rows={4}
                maxLength={500}
              />
              <div className="text-xs text-muted-foreground mt-1 text-right">
                {comment.length}/500
              </div>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddReviewOpen(false);
                  setRating(5);
                  setComment('');
                  setCurrentReview(null);
                  setIsEditing(false);
                }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitReview}
                disabled={isSubmitting || comment.trim().length < 10}
                className="flex-1"
              >
                {isSubmitting ? 'Enviando...' : (isEditing ? 'Actualizar' : 'Enviar Valoración')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 