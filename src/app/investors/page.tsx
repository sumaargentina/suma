"use client";

import { HeaderWrapper } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    ArrowRight,
    Bot,
    Building2,
    Rocket,
    Globe2,
    HeartPulse,
    LineChart,
    Lock,
    Smartphone,
    Stethoscope,
    Users,
    Zap,
    Clock,
    TrendingUp,
    CreditCard,
    ShieldCheck,
    Megaphone,
    FileText,
    BrainCircuit,
    CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function InvestorsPage() {
    const { toast } = useToast();
    const [name, setName] = useState("");
    const [company, setCompany] = useState("");

    const handleWhatsAppContact = (e: React.FormEvent) => {
        e.preventDefault();
        const message = `Hola Salvatore, soy ${name}${company ? ` de ${company}` : ''}. Estoy interesado en conocer más sobre la oportunidad de inversión en SUMA.`;
        const url = `https://wa.me/584127128465?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <HeaderWrapper />

            {/* HERO SECTION */}
            <section className="relative pt-24 pb-32 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-primary to-purple-900 opacity-95"></div>
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>

                <div className="container relative z-10 mx-auto px-4 text-center">
                    <Badge className="mb-6 bg-white/10 text-white hover:bg-white/20 border-white/20 px-4 py-1 text-sm backdrop-blur-sm animate-fade-in">
                        Oportunidad Pre-Seed 🚀
                    </Badge>
                    <h1 className="text-4xl md:text-7xl font-bold text-white tracking-tight mb-6 leading-tight">
                        Listo para transformar la <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-cyan-200">Salud Digital en LatAm</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto mb-10 font-light leading-relaxed">
                        Hemos construido la infraestructura. Tenemos la tecnología IA. <br />
                        <strong>Solo nos faltas tú para el despegue.</strong>
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button
                            size="lg"
                            className="bg-white text-primary hover:bg-blue-50 text-lg px-8 h-14 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
                            onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                            Contactar a Salvatore (Founder)
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-5xl mx-auto">
                        {[
                            { label: "Mercado Potencial", value: "$4.2B", desc: "Digital Health TAM LatAm" },
                            { label: "Estado", value: "MVP Listo", desc: "Tecnología Finalizada" },
                            { label: "Tecnología", value: "Proprietary AI", desc: "Asistente Propio" },
                            { label: "Escalabilidad", value: "LatAm Ready", desc: "Argentina, Venezuela y más" },
                        ].map((stat, i) => (
                            <div key={i} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:bg-white/15 transition-colors">
                                <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                                <p className="text-sm font-semibold text-blue-200 uppercase tracking-wider mb-2">{stat.label}</p>
                                <p className="text-xs text-blue-300/80 leading-tight">{stat.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* THE PROBLEM & SOLUTION */}
            <section className="py-24 bg-white">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row gap-16 items-center">
                        <div className="md:w-1/2">
                            <div className="inline-block p-2 px-4 bg-red-100 text-red-700 rounded-full text-sm font-bold mb-6">
                                La Oportunidad
                            </div>
                            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                                El sistema actual está roto. <br />
                                <span className="text-primary">SUMA está listo para arreglarlo.</span>
                            </h2>
                            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                                Hoy día, la experiencia médica es frustrante y desconectada. Hemos desarrollado el <strong>Sistema Operativo</strong> que unificará clínicas, médicos y pacientes desde el primer día de lanzamiento.
                            </p>

                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <Zap className="text-yellow-500 fill-yellow-500" /> Nuestra Propuesta de Valor
                                </h4>
                                <p className="text-slate-700">
                                    No venimos con diapositivas vacías. Tenemos una <strong>plataforma funcional</strong> con pagos integrados, historia clínica digital y un asistente de IA capaz de realizar triaje médico real.
                                </p>
                            </div>
                        </div>

                        <div className="md:w-1/2 relative">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-4 translate-y-8">
                                    <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 text-center hover:scale-105 transition-transform">
                                        <Smartphone className="h-10 w-10 text-primary mx-auto mb-3" />
                                        <h3 className="font-bold">App Paciente</h3>
                                        <p className="text-xs text-slate-500">Lista para lanzamiento</p>
                                    </div>
                                    <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl text-center hover:scale-105 transition-transform">
                                        <Bot className="h-10 w-10 text-cyan-400 mx-auto mb-3" />
                                        <h3 className="font-bold">SUMA AI Core</h3>
                                        <p className="text-xs text-slate-400">Motor Desarrollado</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 text-center hover:scale-105 transition-transform">
                                        <Building2 className="h-10 w-10 text-indigo-600 mx-auto mb-3" />
                                        <h3 className="font-bold">SaaS Clínicas</h3>
                                        <p className="text-xs text-slate-500">Infraestructura Lista</p>
                                    </div>
                                    <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 text-center hover:scale-105 transition-transform">
                                        <Stethoscope className="h-10 w-10 text-emerald-600 mx-auto mb-3" />
                                        <h3 className="font-bold">Portal Médico</h3>
                                        <p className="text-xs text-slate-500">Gestión Completa</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FEATURE SHOWCASE - WHAT MAKES US UNIQUE */}
            <section className="py-24 bg-slate-900 text-white overflow-hidden">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-20">
                        <Badge className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 mb-4 border border-cyan-500/20">Tecnología Real</Badge>
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">Más que una Agenda. <br />Un Ecosistema Completo.</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">
                            A diferencia de la competencia que solo ofrece turnos, SUMA gestiona el ciclo de vida completo de la salud.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            {
                                icon: CreditCard,
                                color: "text-green-400",
                                title: "Fintech Integrada",
                                desc: "Pasarela de pagos nativa. MercadoPago, transferencias y control de caja automático para médicos."
                            },
                            {
                                icon: ShieldCheck,
                                color: "text-blue-400",
                                title: "Seguridad Bancaria",
                                desc: "Infraestructura RLS (Row Level Security). Auditoría de acciones y encriptación de datos sensibles."
                            },
                            {
                                icon: BrainCircuit,
                                color: "text-purple-400",
                                title: "IA Contextual",
                                desc: "Asistente que entiende síntomas, voz y dialectos locales. No es un chatbot, es un agente inteligente."
                            },
                            {
                                icon: Megaphone,
                                color: "text-pink-400",
                                title: "Marketing Suite",
                                desc: "Herramientas para que clínicas y doctores atraigan pacientes: cupones, campañas y perfil público SEO."
                            }
                        ].map((feature, i) => (
                            <div key={i} className="bg-white/5 backdrop-blur-sm p-8 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors group">
                                <div className={`h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${feature.color}`}>
                                    <feature.icon className="h-7 w-7" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed border-t border-white/10 pt-4">
                                    {feature.desc}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* AI DEEP DIVE */}
                    <div className="mt-24 p-8 md:p-12 bg-gradient-to-r from-blue-900/50 to-indigo-900/50 rounded-3xl border border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-cyan-500/20 rounded-full blur-[100px]"></div>
                        <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
                            <div className="md:w-1/2">
                                <div className="inline-flex items-center gap-2 text-cyan-400 font-bold mb-4">
                                    <Bot className="h-5 w-5" /> SUMA AI CORE
                                </div>
                                <h3 className="text-3xl font-bold mb-4">El primer Asistente Médico que realmente "entiende"</h3>
                                <p className="text-slate-300 mb-6 leading-relaxed">
                                    Logramos lo que otros no: un asistente que escucha notas de voz, identifica urgencias médicas (Triaje) y busca el especialista correcto comparando precios en tiempo real.
                                </p>
                                <ul className="space-y-3">
                                    {[
                                        "Reconocimiento de voz natural en español.",
                                        "Triaje médico: detecta urgencias vs consultas.",
                                        "Agenda citas directamente en la base de datos.",
                                        "Listo para integración con WhatsApp Business."
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                                            <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="md:w-1/2 bg-slate-950 rounded-xl p-6 border border-slate-800 shadow-2xl w-full max-w-md mx-auto">
                                {/* Fake Chat UI */}
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-xs">👤</div>
                                        <div className="bg-slate-800 rounded-2xl rounded-tl-none p-3 text-sm text-slate-300">
                                            Tengo un dolor fuerte en el pecho y me cuesta respirar...
                                        </div>
                                    </div>
                                    <div className="flex gap-3 flex-row-reverse">
                                        <div className="h-8 w-8 rounded-full bg-cyan-600 flex items-center justify-center text-xs">🤖</div>
                                        <div className="bg-cyan-900/30 border border-cyan-800 rounded-2xl rounded-tr-none p-3 text-sm text-cyan-100">
                                            ⚠️ <strong>Detección de Urgencia</strong><br />
                                            Estos síntomas podrían indicar una emergencia cardíaca. Te recomiendo acudir a la guardia más cercana ahora mismo.<br /><br />
                                            <em>Clínica Santa Fe (a 2km) - Guardia 24hs</em>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* PROJECTED IMPACT */}
            <section className="py-24 bg-slate-50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20 mb-4">Visión de Mercado</Badge>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900">El impacto que generaremos</h2>
                        <p className="text-slate-500 mt-2 max-w-2xl mx-auto">Nuestro modelo está diseñado para mejorar radicalmente la eficiencia del sector salud.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Case 1: The Patient */}
                        <Card className="border-none shadow-lg overflow-hidden group hover:shadow-2xl transition-all">
                            <div className="h-2 bg-emerald-500 w-full"></div>
                            <CardHeader>
                                <div className="h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                                    <Users className="h-6 w-6" />
                                </div>
                                <CardTitle>Para el Paciente</CardTitle>
                                <CardDescription>Acceso Inmediato</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-600 text-sm mb-4">
                                    Proyectamos reducir el tiempo de agendamiento de días a segundos mediante nuestra IA. El paciente tendrá control total de su salud en su bolsillo.
                                </p>
                                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 p-2 rounded-lg">
                                    <Clock className="h-4 w-4" /> Objetivo: -90% tiempo de espera
                                </div>
                            </CardContent>
                        </Card>

                        {/* Case 2: The Doctor */}
                        <Card className="border-none shadow-lg overflow-hidden group hover:shadow-2xl transition-all">
                            <div className="h-2 bg-blue-500 w-full"></div>
                            <CardHeader>
                                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                                    <Stethoscope className="h-6 w-6" />
                                </div>
                                <CardTitle>Para el Médico</CardTitle>
                                <CardDescription>Libertad Operativa</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-600 text-sm mb-4">
                                    Nuestra solución elimina la carga administrativa. Permitiremos que los doctores se enfoquen en curar, no en cobrar o gestionar papeles.
                                </p>
                                <div className="flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 p-2 rounded-lg">
                                    <TrendingUp className="h-4 w-4" /> Objetivo: +30% rentabilidad
                                </div>
                            </CardContent>
                        </Card>

                        {/* Case 3: The Clinic */}
                        <Card className="border-none shadow-lg overflow-hidden group hover:shadow-2xl transition-all">
                            <div className="h-2 bg-indigo-500 w-full"></div>
                            <CardHeader>
                                <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                                    <Building2 className="h-6 w-6" />
                                </div>
                                <CardTitle>Para la Clínica</CardTitle>
                                <CardDescription>Control Total</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-600 text-sm mb-4">
                                    Proveemos un dashboard unificado para centralizar la gestión de staff y finanzas, reduciendo costos operativos y minimizando el ausentismo de pacientes.
                                </p>
                                <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-50 p-2 rounded-lg">
                                    <LineChart className="h-4 w-4" /> Objetivo: Optimización operativa
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* INVESTMENT OPPORTUNITY */}
            <section id="contact-form" className="py-24 bg-white relative">
                <div className="container mx-auto px-4 max-w-5xl">
                    <div className="bg-slate-900 rounded-[2.5rem] p-1 md:p-16 shadow-2xl overflow-hidden relative">
                        {/* Background effects */}
                        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-primary/20 rounded-full blur-[100px]"></div>
                        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]"></div>

                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-16">
                            <div className="md:w-1/2 text-white">
                                <h3 className="text-3xl md:text-4xl font-bold mb-6">Buscamos "Smart Capital"</h3>
                                <ul className="space-y-6">
                                    <li className="flex gap-4">
                                        <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                            <Rocket className="h-5 w-5 text-cyan-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-lg">Tecnología Lista</h4>
                                            <p className="text-slate-400 text-sm">El MVP funcional está construido. Buscamos gasolina para el marketing y lanzamiento.</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-4">
                                        <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                            <Globe2 className="h-5 w-5 text-purple-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-lg">Mercado Desatendido</h4>
                                            <p className="text-slate-400 text-sm">El "timing" es perfecto. La digitalización en salud LatAm apenas comienza.</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-4">
                                        <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                            <Users className="h-5 w-5 text-emerald-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-lg">Liderazgo Claro</h4>
                                            <p className="text-slate-400 text-sm">Founder Salvatore Perozzi: Visión técnica y de negocio unificadas.</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>

                            <Card className="md:w-1/2 bg-white text-slate-900 border-none shadow-2xl rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="text-2xl">¿Te interesa el proyecto?</CardTitle>
                                    <CardDescription>Hablemos sobre la hoja de ruta para el lanzamiento.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleWhatsAppContact} className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tu Nombre</label>
                                            <Input
                                                placeholder="Ej. Martín Varsavsky"
                                                required
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="bg-slate-50 border-slate-200"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Empresa / VC (Opcional)</label>
                                            <Input
                                                placeholder="Ej. Angel Investor"
                                                value={company}
                                                onChange={(e) => setCompany(e.target.value)}
                                                className="bg-slate-50 border-slate-200"
                                            />
                                        </div>

                                        <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-lg font-medium shadow-lg hover:shadow-green-600/20">
                                            <Smartphone className="mr-2 h-5 w-5" /> Hablar con Salvatore
                                        </Button>
                                        <p className="text-xs text-center text-slate-400 mt-4">
                                            Contacto directo vía WhatsApp.
                                        </p>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="bg-white py-12 border-t">
                <div className="container mx-auto px-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-2xl font-bold text-slate-900 mb-4">
                        <HeartPulse className="h-8 w-8 text-primary" />
                        SUMA
                    </div>
                    <p className="text-slate-500 text-sm mb-8 font-medium">
                        Tecnología desarrollada por <span className="text-slate-900">Salvatore Perozzi</span> & Antigravity AI.
                    </p>
                    <div className="flex justify-center gap-6 text-sm text-slate-500">
                        <Link href="/" className="hover:text-primary transition-colors">Plataforma</Link>
                    </div>
                    <p className="mt-8 text-xs text-slate-400">© 2026 SUMA Health Technologies. Todos los derechos reservados.</p>
                </div>
            </footer>
        </div>
    );
}
