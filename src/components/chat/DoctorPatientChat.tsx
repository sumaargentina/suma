"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Send, Loader2, ArrowDown, User } from "lucide-react";
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

import { AiChatBackground } from "@/components/AiChatBackground";

interface Message {
    id: string;
    doctor_id: string;
    patient_id: string;
    sender_type: 'doctor' | 'patient';
    message: string;
    is_read: boolean;
    created_at: string;
}

interface DoctorPatientChatProps {
    doctorId: string;
    patientId: string;
    currentUserType: 'doctor' | 'patient';
    otherPartyName: string;
    otherPartyImage?: string;
    currentUserName: string;
    currentUserImage?: string;
    onMessagesLoad?: (messages: Message[]) => void;
    className?: string;
}

export function DoctorPatientChat({
    doctorId,
    patientId,
    currentUserType,
    otherPartyName,
    otherPartyImage,
    currentUserName,
    currentUserImage,
    onMessagesLoad,
    className
}: DoctorPatientChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    // Scroll to bottom
    const scrollToBottom = useCallback(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, []);

    // Fetch messages from API
    const fetchMessages = useCallback(async (isInitial = false) => {
        try {
            const response = await fetch(
                `/api/chat/doctor-patient?doctorId=${doctorId}&patientId=${patientId}`
            );

            if (!response.ok) throw new Error('Error fetching messages');

            const data: Message[] = await response.json();

            setMessages(prevMessages => {
                // Keep any temp messages that haven't been replaced yet
                const tempMessages = prevMessages.filter(m => m.id.startsWith('temp-'));
                const serverIds = new Set(data.map(m => m.id));

                // Filter temp messages that aren't in server response yet
                const pendingTempMessages = tempMessages.filter(temp => {
                    // Check if this temp message was saved (matching content exists)
                    const matchingServerMsg = data.find(
                        d => d.message === temp.message &&
                            d.sender_type === temp.sender_type &&
                            Math.abs(new Date(d.created_at).getTime() - new Date(temp.created_at).getTime()) < 60000
                    );
                    return !matchingServerMsg;
                });

                // Merge server messages with pending temp messages
                return [...data, ...pendingTempMessages];
            });

            onMessagesLoad?.(data);

            // Mark messages as read (async, don't wait)
            if (data.length > 0) {
                fetch('/api/chat/doctor-patient', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        doctorId,
                        patientId,
                        markReadBy: currentUserType
                    })
                }).catch(() => { });
            }

            if (isInitial) {
                setTimeout(scrollToBottom, 100);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            if (isInitial) setIsLoading(false);
        }
    }, [doctorId, patientId, currentUserType, onMessagesLoad, scrollToBottom]);

    // Initial load + Subscribe to Realtime + Polling
    useEffect(() => {
        let isMounted = true;

        // Initial fetch
        fetchMessages(true);

        // Realtime subscription
        const channelName = `chat_${doctorId}_${patientId}`.replace(/-/g, '');
        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'doctor_patient_messages'
                },
                (payload) => {
                    if (!isMounted) return;

                    const newMsg = payload.new as Message;

                    // Only process if for this conversation
                    if (newMsg.doctor_id === doctorId && newMsg.patient_id === patientId) {
                        setMessages(prev => {
                            // Check if already exists
                            if (prev.some(m => m.id === newMsg.id)) {
                                return prev;
                            }

                            // Remove matching temp message if exists
                            const filtered = prev.filter(m => {
                                if (!m.id.startsWith('temp-')) return true;
                                return !(m.message === newMsg.message && m.sender_type === newMsg.sender_type);
                            });

                            return [...filtered, newMsg];
                        });

                        setTimeout(scrollToBottom, 100);

                        // Mark as read if from other party
                        if (newMsg.sender_type !== currentUserType) {
                            fetch('/api/chat/doctor-patient', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    doctorId,
                                    patientId,
                                    markReadBy: currentUserType
                                })
                            }).catch(() => { });
                        }
                    }
                }
            )
            .subscribe();

        // Polling fallback every 2 seconds
        const pollInterval = setInterval(() => {
            if (isMounted) {
                fetchMessages(false);
            }
        }, 2000);

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
            clearInterval(pollInterval);
        };
    }, [doctorId, patientId, currentUserType, fetchMessages, scrollToBottom]);

    // Scroll when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages.length, scrollToBottom]);

    // Send message
    const handleSendMessage = async () => {
        const messageText = newMessage.trim();
        if (!messageText || isSending) return;

        // Clear input and set sending state
        setNewMessage("");
        setIsSending(true);

        // Create temp message
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const tempMessage: Message = {
            id: tempId,
            doctor_id: doctorId,
            patient_id: patientId,
            sender_type: currentUserType,
            message: messageText,
            is_read: false,
            created_at: new Date().toISOString()
        };

        // Add temp message to state IMMEDIATELY
        setMessages(prev => [...prev, tempMessage]);

        // Force scroll after state update
        setTimeout(scrollToBottom, 50);

        try {
            const response = await fetch('/api/chat/doctor-patient', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    doctorId,
                    patientId,
                    senderType: currentUserType,
                    message: messageText
                })
            });

            if (!response.ok) {
                throw new Error('Error sending message');
            }

            const savedMessage: Message = await response.json();

            // Replace temp message with saved message
            setMessages(prev =>
                prev.map(m => m.id === tempId ? savedMessage : m)
            );
        } catch (error) {
            console.error('Error sending message:', error);

            // Remove temp message on error
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setNewMessage(messageText);

            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo enviar el mensaje. Intenta de nuevo.'
            });
        } finally {
            setIsSending(false);
        }
    };

    if (isLoading) {
        return (
            <div className={cn("flex items-center justify-center h-64", className)}>
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* Messages Container */}
            <div className="relative flex-1 bg-muted/30 overflow-hidden">
                <AiChatBackground />
                <div
                    ref={chatContainerRef}
                    className="absolute inset-0 overflow-y-auto p-4 space-y-3 z-10"
                >
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <User className="h-12 w-12 mb-4 opacity-50" />
                            <p className="text-center">
                                No hay mensajes aún.<br />
                                ¡Inicia la conversación!
                            </p>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isCurrentUser = msg.sender_type === currentUserType;
                            const isTemp = msg.id.startsWith('temp-');

                            return (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "flex items-end gap-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-200",
                                        isCurrentUser ? "justify-end" : "justify-start"
                                    )}
                                >
                                    {!isCurrentUser && (
                                        <Avatar className="h-8 w-8 flex-shrink-0">
                                            {otherPartyImage ? (
                                                <AvatarImage src={otherPartyImage} />
                                            ) : (
                                                <AvatarFallback>
                                                    {otherPartyName?.charAt(0)?.toUpperCase() || '?'}
                                                </AvatarFallback>
                                            )}
                                        </Avatar>
                                    )}

                                    <div
                                        className={cn(
                                            "p-3 rounded-lg max-w-[75%] shadow-sm transition-opacity",
                                            isCurrentUser
                                                ? "bg-primary text-primary-foreground rounded-br-none"
                                                : "bg-background rounded-bl-none border",
                                            isTemp && "opacity-70"
                                        )}
                                    >
                                        <p className="text-sm whitespace-pre-wrap break-words">
                                            {msg.message}
                                        </p>
                                        <p className={cn(
                                            "text-xs text-right mt-1",
                                            isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"
                                        )}>
                                            {isTemp ? (
                                                <span className="inline-flex items-center gap-1">
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                    Enviando...
                                                </span>
                                            ) : (
                                                formatDistanceToNow(parseISO(msg.created_at), {
                                                    locale: es,
                                                    addSuffix: true
                                                })
                                            )}
                                        </p>
                                    </div>

                                    {isCurrentUser && (
                                        <Avatar className="h-8 w-8 flex-shrink-0">
                                            {currentUserImage ? (
                                                <AvatarImage src={currentUserImage} />
                                            ) : (
                                                <AvatarFallback>
                                                    {currentUserName?.charAt(0)?.toUpperCase() || '?'}
                                                </AvatarFallback>
                                            )}
                                        </Avatar>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Scroll to bottom button - shown when not at bottom */}
            {messages.length > 3 && (
                <div className="relative">
                    <button
                        type="button"
                        onClick={scrollToBottom}
                        className="absolute -top-12 right-4 bg-primary text-primary-foreground rounded-full p-2 shadow-lg hover:bg-primary/80 focus:outline-none z-10"
                        aria-label="Ir al último mensaje"
                    >
                        <ArrowDown className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Message Input */}
            <form
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="flex items-center gap-2 p-4 border-t bg-background"
            >
                <Input
                    placeholder="Escribe tu mensaje..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={isSending}
                    className="flex-1"
                    autoComplete="off"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                        }
                    }}
                />
                <Button
                    type="submit"
                    disabled={isSending || !newMessage.trim()}
                    size="icon"
                >
                    {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Send className="h-4 w-4" />
                    )}
                </Button>
            </form>
        </div>
    );
}
