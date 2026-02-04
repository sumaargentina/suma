"use client";

import { useState, useEffect, useCallback } from "react";
import { HeaderWrapper } from "@/components/header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { MessageSquare, Clock, Stethoscope, Loader2, ArrowLeft } from "lucide-react";
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/lib/auth';
import { DoctorPatientChat } from "@/components/chat/DoctorPatientChat";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Conversation {
    doctorId: string;
    patientId: string;
    doctorName: string;
    doctorSpecialty?: string;
    doctorImage?: string;
    lastMessage: string;
    lastMessageAt: string;
    lastMessageSender: string;
    unreadCount: number;
}

export default function PatientChatsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);

    // Fetch conversations
    const fetchConversations = useCallback(async () => {
        if (!user?.id) return;

        try {
            const response = await fetch(`/api/chat/conversations?patientId=${user.id}`);
            if (!response.ok) throw new Error('Error fetching conversations');

            const data = await response.json();
            setConversations(data);
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (!loading && user) {
            if (user.role !== 'patient') {
                router.push('/');
                return;
            }
            fetchConversations();

            // Poll for updates every 30 seconds
            const interval = setInterval(fetchConversations, 30000);
            return () => clearInterval(interval);
        }
    }, [loading, user, router, fetchConversations]);

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

    if (loading || isLoading) {
        return (
            <div className="flex flex-col min-h-screen bg-background">
                <HeaderWrapper />
                <main className="flex-1 bg-muted/40 flex items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                </main>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <HeaderWrapper />
            <main className="flex-1 bg-muted/40">
                <div className="container py-6 md:py-12 px-4 md:px-0">
                    {/* Back button */}
                    <Link href="/patient" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver al panel
                    </Link>

                    <div className="flex items-center gap-3 mb-6">
                        <MessageSquare className="h-8 w-8 text-primary" />
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold">Mis Mensajes</h1>
                            <p className="text-muted-foreground">
                                Conversaciones con tus médicos
                                {totalUnread > 0 && (
                                    <Badge variant="destructive" className="ml-2">
                                        {totalUnread} sin leer
                                    </Badge>
                                )}
                            </p>
                        </div>
                    </div>

                    {conversations.length === 0 ? (
                        <Card>
                            <CardContent className="text-center text-muted-foreground py-16">
                                <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                                <p className="text-lg font-medium mb-2">No hay conversaciones</p>
                                <p className="text-sm">
                                    Las conversaciones con tus médicos aparecerán aquí.<br />
                                    Puedes iniciar un chat desde los detalles de cualquier cita.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {conversations.map((conversation) => (
                                <Card
                                    key={`${conversation.doctorId}-${conversation.patientId}`}
                                    className="hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => handleOpenChat(conversation)}
                                >
                                    <CardContent className="p-4 overflow-hidden">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-4 flex-1 min-w-0 overflow-hidden">
                                                <Avatar className="h-12 w-12 flex-shrink-0">
                                                    {conversation.doctorImage ? (
                                                        <AvatarImage src={conversation.doctorImage} />
                                                    ) : (
                                                        <AvatarFallback className="bg-primary/10 text-primary">
                                                            <Stethoscope className="h-6 w-6" />
                                                        </AvatarFallback>
                                                    )}
                                                </Avatar>
                                                <div className="flex-1 min-w-0 overflow-hidden">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="font-semibold text-lg truncate">
                                                            Dr. {conversation.doctorName}
                                                        </h3>
                                                        {conversation.unreadCount > 0 && (
                                                            <Badge variant="destructive" className="text-xs flex-shrink-0">
                                                                {conversation.unreadCount} nuevo{conversation.unreadCount > 1 ? 's' : ''}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {conversation.doctorSpecialty && (
                                                        <p className="text-sm text-muted-foreground">
                                                            {conversation.doctorSpecialty}
                                                        </p>
                                                    )}
                                                    <p className="text-sm text-muted-foreground truncate mt-1 max-w-full">
                                                        <span className="font-medium">
                                                            {conversation.lastMessageSender === 'patient' ? 'Tú' : `Dr. ${conversation.doctorName}`}:
                                                        </span>{' '}
                                                        {conversation.lastMessage}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2 ml-4">
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
                                                >
                                                    <MessageSquare className="h-4 w-4 mr-2" />
                                                    Abrir Chat
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Chat Dialog */}
            <Dialog open={isChatOpen} onOpenChange={(open) => !open && handleCloseChat()}>
                <DialogContent className="sm:max-w-[500px] h-[80vh] flex flex-col p-0">
                    <DialogHeader className="p-4 border-b">
                        <DialogTitle className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                                {selectedConversation?.doctorImage ? (
                                    <AvatarImage src={selectedConversation.doctorImage} />
                                ) : (
                                    <AvatarFallback className="bg-primary/10 text-primary">
                                        <Stethoscope className="h-4 w-4" />
                                    </AvatarFallback>
                                )}
                            </Avatar>
                            <div>
                                <span>Dr. {selectedConversation?.doctorName}</span>
                                {selectedConversation?.doctorSpecialty && (
                                    <p className="text-xs font-normal text-muted-foreground">
                                        {selectedConversation.doctorSpecialty}
                                    </p>
                                )}
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    {selectedConversation && user?.id && (
                        <DoctorPatientChat
                            doctorId={selectedConversation.doctorId}
                            patientId={user.id}
                            currentUserType="patient"
                            otherPartyName={selectedConversation.doctorName}
                            otherPartyImage={selectedConversation.doctorImage}
                            currentUserName={user.name || 'Paciente'}
                            currentUserImage={undefined}
                            className="flex-1"
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
