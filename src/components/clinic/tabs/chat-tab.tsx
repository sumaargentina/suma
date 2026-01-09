"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { getClinicChatConversations, getClinicChatMessages, sendClinicChatMessage, markClinicChatAsRead, getClinicPatients } from '@/lib/supabaseService';
import { ClinicChatConversation, ClinicPatientMessage, Patient } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, Loader2, Search, ArrowLeft, Users } from 'lucide-react';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function ChatTab() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [conversations, setConversations] = useState<ClinicChatConversation[]>([]);
    const [allPatients, setAllPatients] = useState<Patient[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<ClinicChatConversation | null>(null);
    const [messages, setMessages] = useState<ClinicPatientMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user?.id) {
            loadConversations();
            loadAllPatients();
        }
    }, [user?.id]);

    useEffect(() => {
        if (selectedConversation && user?.id) {
            loadMessages();
        }
    }, [selectedConversation?.patient.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Polling for new messages
    useEffect(() => {
        if (!selectedConversation || !user?.id) return;

        const interval = setInterval(() => {
            loadMessages(true);
        }, 5000); // Poll every 5 seconds

        return () => clearInterval(interval);
    }, [selectedConversation?.patient.id, user?.id]);

    const loadConversations = async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            const data = await getClinicChatConversations(user.id);
            setConversations(data);
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadAllPatients = async () => {
        if (!user?.id) return;
        try {
            const data = await getClinicPatients(user.id);
            setAllPatients(data);
        } catch (error) {
            console.error('Error loading patients:', error);
        }
    };

    const loadMessages = async (silent = false) => {
        if (!user?.id || !selectedConversation) return;
        try {
            if (!silent) setLoadingMessages(true);
            const data = await getClinicChatMessages(user.id, selectedConversation.patient.id);
            setMessages(data);

            // Mark as read
            await markClinicChatAsRead(user.id, selectedConversation.patient.id, 'clinic');

            // Update unread count in conversations
            setConversations(prev => prev.map(conv =>
                conv.patient.id === selectedConversation.patient.id
                    ? { ...conv, unreadCount: 0 }
                    : conv
            ));
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !user?.id || !selectedConversation) return;

        try {
            setSending(true);
            const sent = await sendClinicChatMessage(
                user.id,
                selectedConversation.patient.id,
                'clinic',
                newMessage.trim()
            );

            setMessages(prev => [...prev, sent]);
            setNewMessage('');

            // Update conversations list
            setConversations(prev => {
                const exists = prev.some(c => c.patient.id === selectedConversation.patient.id);
                if (exists) {
                    return prev.map(c =>
                        c.patient.id === selectedConversation.patient.id
                            ? { ...c, lastMessage: sent }
                            : c
                    ).sort((a, b) => {
                        if (!a.lastMessage) return 1;
                        if (!b.lastMessage) return -1;
                        return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
                    });
                } else {
                    return [{ patient: selectedConversation.patient, lastMessage: sent, unreadCount: 0 }, ...prev];
                }
            });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar el mensaje.' });
        } finally {
            setSending(false);
        }
    };

    const startNewConversation = (patient: Patient) => {
        const existing = conversations.find(c => c.patient.id === patient.id);
        if (existing) {
            setSelectedConversation(existing);
        } else {
            setSelectedConversation({
                patient,
                unreadCount: 0
            });
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const getInitials = (name: string) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'P';
    };

    const formatMessageTime = (dateStr: string) => {
        const date = parseISO(dateStr);
        if (isToday(date)) return format(date, 'HH:mm');
        if (isYesterday(date)) return 'Ayer ' + format(date, 'HH:mm');
        return format(date, 'dd/MM HH:mm');
    };

    const formatConversationTime = (dateStr: string) => {
        const date = parseISO(dateStr);
        if (isToday(date)) return format(date, 'HH:mm');
        if (isYesterday(date)) return 'Ayer';
        return format(date, 'dd/MM');
    };

    // Filter patients for new conversations
    const availablePatients = allPatients.filter(p =>
        !conversations.some(c => c.patient.id === p.id) &&
        (p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Chat con Pacientes</h2>
                <p className="text-muted-foreground">Comunicación directa con tus pacientes.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
                {/* Conversations List */}
                <Card className="md:col-span-1">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Conversaciones</CardTitle>
                        <div className="relative mt-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar paciente..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[480px]">
                            {/* Existing conversations */}
                            {conversations.filter(c =>
                                !searchTerm || c.patient.name?.toLowerCase().includes(searchTerm.toLowerCase())
                            ).map((conv) => (
                                <div
                                    key={conv.patient.id}
                                    onClick={() => setSelectedConversation(conv)}
                                    className={cn(
                                        "flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 border-b",
                                        selectedConversation?.patient.id === conv.patient.id && "bg-muted"
                                    )}
                                >
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={conv.patient.profileImage || undefined} />
                                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                            {getInitials(conv.patient.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="font-medium truncate">{conv.patient.name}</p>
                                            {conv.lastMessage && (
                                                <span className="text-xs text-muted-foreground">
                                                    {formatConversationTime(conv.lastMessage.createdAt)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-muted-foreground truncate max-w-[150px]">
                                                {conv.lastMessage?.message || 'Sin mensajes'}
                                            </p>
                                            {conv.unreadCount > 0 && (
                                                <Badge className="bg-primary text-xs">{conv.unreadCount}</Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* New conversation options */}
                            {searchTerm && availablePatients.length > 0 && (
                                <>
                                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/30">
                                        Iniciar nueva conversación
                                    </div>
                                    {availablePatients.slice(0, 5).map((patient) => (
                                        <div
                                            key={patient.id}
                                            onClick={() => startNewConversation(patient)}
                                            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 border-b"
                                        >
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={patient.profileImage || undefined} />
                                                <AvatarFallback className="bg-green-100 text-green-700 text-sm">
                                                    {getInitials(patient.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <p className="font-medium">{patient.name}</p>
                                                <p className="text-xs text-muted-foreground">{patient.email}</p>
                                            </div>
                                            <Badge variant="outline" className="text-green-600 border-green-500">Nuevo</Badge>
                                        </div>
                                    ))}
                                </>
                            )}

                            {conversations.length === 0 && !searchTerm && (
                                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                                    <MessageCircle className="h-8 w-8 mb-2 opacity-50" />
                                    <p className="text-sm">No hay conversaciones</p>
                                    <p className="text-xs">Busca un paciente para iniciar</p>
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Chat Area */}
                <Card className="md:col-span-2">
                    {selectedConversation ? (
                        <div className="flex flex-col h-full">
                            {/* Chat Header */}
                            <div className="flex items-center gap-3 p-4 border-b">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="md:hidden"
                                    onClick={() => setSelectedConversation(null)}
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={selectedConversation.patient.profileImage || undefined} />
                                    <AvatarFallback className="bg-primary/10 text-primary">
                                        {getInitials(selectedConversation.patient.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium">{selectedConversation.patient.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {selectedConversation.patient.email || selectedConversation.patient.phone || 'Paciente'}
                                    </p>
                                </div>
                            </div>

                            {/* Messages */}
                            <ScrollArea className="flex-1 p-4">
                                {loadingMessages ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                                        <MessageCircle className="h-8 w-8 mb-2 opacity-50" />
                                        <p className="text-sm">Inicia la conversación</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {messages.map((msg) => (
                                            <div
                                                key={msg.id}
                                                className={cn(
                                                    "flex",
                                                    msg.senderType === 'clinic' ? "justify-end" : "justify-start"
                                                )}
                                            >
                                                <div
                                                    className={cn(
                                                        "max-w-[70%] rounded-lg px-4 py-2",
                                                        msg.senderType === 'clinic'
                                                            ? "bg-primary text-primary-foreground"
                                                            : "bg-muted"
                                                    )}
                                                >
                                                    <p className="text-sm">{msg.message}</p>
                                                    <p className={cn(
                                                        "text-xs mt-1",
                                                        msg.senderType === 'clinic' ? "text-primary-foreground/70" : "text-muted-foreground"
                                                    )}>
                                                        {formatMessageTime(msg.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={messagesEndRef} />
                                    </div>
                                )}
                            </ScrollArea>

                            {/* Input */}
                            <div className="p-4 border-t">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Escribe un mensaje..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                        disabled={sending}
                                    />
                                    <Button onClick={handleSendMessage} disabled={!newMessage.trim() || sending}>
                                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <Users className="h-16 w-16 mb-4 opacity-30" />
                            <p className="text-lg font-medium">Selecciona una conversación</p>
                            <p className="text-sm">o busca un paciente para iniciar un chat</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
