"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageSquare, Clock, User, Loader2, Search } from "lucide-react";
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/lib/auth';
import { DoctorPatientChat } from "@/components/chat/DoctorPatientChat";

interface Conversation {
  doctorId: string;
  patientId: string;
  patientName: string;
  patientImage?: string;
  lastMessage: string;
  lastMessageAt: string;
  lastMessageSender: string;
  unreadCount: number;
}

interface ChatTabProps {
  doctorId?: string;
}

export function ChatTab({ doctorId }: ChatTabProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const effectiveDoctorId = doctorId || user?.id;

  // Filter conversations based on search term
  const filteredConversations = conversations.filter(conversation =>
    conversation.patientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!effectiveDoctorId) return;

    try {
      const response = await fetch(`/api/chat/conversations?doctorId=${effectiveDoctorId}`);
      if (!response.ok) throw new Error('Error fetching conversations');

      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveDoctorId]);

  useEffect(() => {
    fetchConversations();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const handleOpenChat = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setIsChatOpen(true);
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
    setSelectedConversation(null);
    // Refresh conversations to update unread counts
    fetchConversations();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chat con Pacientes</CardTitle>
          <CardDescription>Cargando conversaciones...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Chat con Pacientes ({conversations.length})
                </CardTitle>
                <CardDescription>
                  Conversaciones continuas con tus pacientes
                </CardDescription>
              </div>

              {conversations.length > 0 && (
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar paciente..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {conversations.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No hay conversaciones activas.</p>
                <p className="text-sm mt-2">Los chats aparecerán aquí cuando los pacientes envíen mensajes.</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No se encontraron pacientes con ese nombre.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredConversations.map((conversation) => (
                  <div
                    key={`${conversation.doctorId}-${conversation.patientId}`}
                    className="flex items-center justify-between gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer overflow-hidden"
                    onClick={() => handleOpenChat(conversation)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        {conversation.patientImage ? (
                          <AvatarImage src={conversation.patientImage} />
                        ) : (
                          <AvatarFallback>
                            <User className="h-5 w-5" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">
                            {conversation.patientName}
                          </h4>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs flex-shrink-0">
                              {conversation.unreadCount} nuevo{conversation.unreadCount > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-1 max-w-full">
                          <span className="font-medium">
                            {conversation.lastMessageSender === 'doctor' ? 'Tú' : conversation.patientName}:
                          </span>{' '}
                          {conversation.lastMessage}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(parseISO(conversation.lastMessageAt), {
                          locale: es,
                          addSuffix: true
                        })}
                      </div>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenChat(conversation);
                        }}
                        className="whitespace-nowrap"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {conversation.unreadCount > 0 ? 'Ver mensajes' : 'Abrir chat'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chat Dialog */}
      <Dialog open={isChatOpen} onOpenChange={(open) => !open && handleCloseChat()}>
        <DialogContent className="sm:max-w-[500px] h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                {selectedConversation?.patientImage ? (
                  <AvatarImage src={selectedConversation.patientImage} />
                ) : (
                  <AvatarFallback>
                    {selectedConversation?.patientName?.charAt(0) || '?'}
                  </AvatarFallback>
                )}
              </Avatar>
              <span>Chat con {selectedConversation?.patientName}</span>
            </DialogTitle>
          </DialogHeader>

          {selectedConversation && effectiveDoctorId && (
            <DoctorPatientChat
              doctorId={effectiveDoctorId}
              patientId={selectedConversation.patientId}
              currentUserType="doctor"
              otherPartyName={selectedConversation.patientName}
              otherPartyImage={selectedConversation.patientImage}
              currentUserName={user?.name || 'Doctor'}
              currentUserImage={undefined}
              className="flex-1"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
