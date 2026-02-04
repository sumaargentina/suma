"use client";

import { useState, useRef, useEffect } from "react";
import { HeaderWrapper, BottomNav } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, Loader2, Send, User as UserIcon, Sparkles, Heart, Mic, MicOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { AiChatBackground } from "@/components/AiChatBackground";

type Message = {
  sender: "user" | "assistant";
  text: string;
};

export default function AiAssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Función para renderizar texto con links markdown como elementos clickeables
  const renderMessageWithLinks = (text: string) => {
    // Regex para encontrar links en formato [texto](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      // Agregar texto antes del link
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      // Agregar el link como componente
      const linkText = match[1];
      const linkUrl = match[2];
      parts.push(
        <Link
          key={match.index}
          href={linkUrl}
          className="inline-flex items-center gap-1 px-2 py-1 my-1 bg-primary/10 text-primary font-medium rounded-lg hover:bg-primary/20 transition-colors"
        >
          📅 {linkText}
        </Link>
      );

      lastIndex = match.index + match[0].length;
    }

    // Agregar texto restante después del último link
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Mensaje de bienvenida automático
  useEffect(() => {
    if (!hasStarted && messages.length === 0) {
      const welcomeMessage = user?.name
        ? `¡Hola ${user.name.split(' ')[0]}! 👋 Soy SUMA, tu asistente de salud. ¿En qué puedo ayudarte hoy? 😊`
        : "¡Hola! 👋 Soy SUMA, tu asistente de salud. ¿Cómo te llamas?";

      setMessages([{ sender: "assistant", text: welcomeMessage }]);
      setHasStarted(true);
    }
  }, [hasStarted, messages.length, user?.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { sender: "user", text: input };

    const historyForApi = messages.map(msg => ({
      sender: msg.sender,
      text: msg.text,
    }));

    setMessages((prev) => [...prev, userMessage]);
    const currentQuery = input;
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: currentQuery,
          history: historyForApi,
          userName: user?.name || null,
          isLoggedIn: !!user,
          userId: user?.id || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en el asistente');
      }

      const data = await response.json();
      const assistantMessage: Message = {
        sender: "assistant",
        text: data.response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error:', error);
      const errorMessage: Message = {
        sender: 'assistant',
        text: "Lo siento, tuve un problemita técnico. 😅 ¿Puedes intentar de nuevo?"
      };
      setMessages(prev => [...prev, errorMessage]);
      toast({
        variant: "destructive",
        title: "Error de conexión",
        description: error.message || "No se pudo conectar con el asistente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "No soportado",
        description: "Tu navegador no soporta reconocimiento de voz. Intenta con Chrome.",
        variant: "destructive",
      });
      return;
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'es-ES';

    recognitionRef.current.onstart = () => {
      setIsListening(true);
    };

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
      setIsListening(false);
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);

      if (event.error === 'not-allowed') {
        toast({
          title: "Acceso denegado al micrófono",
          description: "Por favor, permite el acceso al micrófono en la barra de direcciones de tu navegador para usar esta función.",
          variant: "destructive",
        });
      } else if (event.error === 'no-speech') {
        // No se detectó voz, no es necesario mostrar error intrusivo
      } else {
        toast({
          title: "Error de reconocimiento",
          description: "Ocurrió un problema con el reconocimiento de voz. Intenta de nuevo.",
          variant: "destructive",
        });
      }
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current.start();
  };

  const quickActions = [
    { icon: "🩺", text: "Buscar especialista" },
    { icon: "📅", text: "Agendar cita" },
    { icon: "💊", text: "Tengo síntomas" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <HeaderWrapper />
      <main className="flex-1 flex items-center justify-center py-4 md:py-12 md:pb-12 pb-24">
        <div className="container max-w-2xl h-[75vh] md:h-[80vh] px-2 md:px-0">
          <Card className="h-full flex flex-col shadow-xl border-0 overflow-hidden">
            {/* Header con gradiente */}
            <CardHeader className="bg-gradient-to-r from-primary to-blue-600 text-white pb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-12 w-12 border-2 border-white/30">
                    <AvatarImage src="/suma-assistant.png" />
                    <AvatarFallback className="bg-white/20 text-white">
                      <Bot className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-400 rounded-full border-2 border-white"></span>
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl font-bold">
                    Asistente SUMA
                    <Sparkles className="h-4 w-4 text-yellow-300" />
                  </CardTitle>
                  <CardDescription className="text-white/80 text-xs md:text-sm">
                    Tu guía de salud personal • En línea
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-0 flex flex-col bg-[#f8fbfc] relative">
              <AiChatBackground />
              {/* Área de mensajes */}
              <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 relative z-10">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-end gap-2",
                      message.sender === "user" && "justify-end"
                    )}
                  >
                    {message.sender === "assistant" && (
                      <Avatar className="h-8 w-8 shadow-sm">
                        <AvatarFallback className="bg-primary text-white">
                          <Heart className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        "py-3 px-4 rounded-2xl max-w-[85%] md:max-w-md shadow-sm whitespace-pre-wrap",
                        message.sender === "user"
                          ? "bg-primary text-white rounded-br-md"
                          : "bg-white border rounded-bl-md"
                      )}
                    >
                      <p className="text-sm leading-relaxed">
                        {message.sender === "assistant"
                          ? renderMessageWithLinks(message.text)
                          : message.text
                        }
                      </p>
                    </div>
                    {message.sender === "user" && (
                      <Avatar className="h-8 w-8 shadow-sm">
                        <AvatarImage src={user?.profileImage || undefined} />
                        <AvatarFallback className="bg-gray-200">
                          {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-end gap-2">
                    <Avatar className="h-8 w-8 shadow-sm">
                      <AvatarFallback className="bg-primary text-white">
                        <Heart className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="py-3 px-4 rounded-2xl rounded-bl-md bg-white border shadow-sm">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Acciones rápidas (solo si hay pocos mensajes) */}
              {messages.length <= 2 && !isLoading && (
                <div className="px-3 pb-2 flex gap-2 overflow-x-auto">
                  {quickActions.map((action, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="whitespace-nowrap text-xs rounded-full border-primary/30 hover:bg-primary/5"
                      onClick={() => setInput(action.text)}
                    >
                      <span className="mr-1">{action.icon}</span> {action.text}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>

            {/* Input de mensaje */}
            <div className="border-t bg-white p-3 md:p-4">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant={isListening ? "destructive" : "outline"}
                  className={cn(
                    "rounded-full h-10 w-10 shrink-0",
                    isListening && "animate-pulse ring-2 ring-red-400"
                  )}
                  onClick={toggleListening}
                  title="Dictar por voz"
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isListening ? "Escuchando..." : "Escribe tu mensaje..."}
                  disabled={isLoading}
                  className="flex-1 rounded-full border-gray-200 focus:border-primary"
                  autoComplete="off"
                />
                <Button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  size="icon"
                  className="rounded-full h-10 w-10 shadow-md"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
