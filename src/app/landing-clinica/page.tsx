"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Building2, Users, Calendar, BarChart3, ShieldCheck, Zap } from "lucide-react";

export default function ClinicLandingPage() {
    // 1, 3, 6, 12 months
    const [months, setMonths] = useState(1);
    const baseMonthlyPrice = 29000;

    // Calculate total and discount
    const calculateTotal = (m: number) => {
        let total = baseMonthlyPrice * m;
        let discount = 0;

        if (m === 3) discount = 0.05;
        if (m === 6) discount = 0.08;
        if (m === 12) discount = 0.15;

        total = total * (1 - discount);

        return {
            total,
            discount,
            pricePerMonth: total / m
        };
    };

    const { total, discount, pricePerMonth } = calculateTotal(months);

    return (
        <div className="flex flex-col min-h-screen">
            {/* Hero Section */}
            <section className="bg-slate-900 text-white py-24">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
                        Transforma la Gestión de tu <span className="text-green-500">Clínica</span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10">
                        Centraliza operaciones, optimiza la agenda y mejora la experiencia de tus pacientes con nuestra plataforma todo en uno.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Link href="#planes">
                            <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 text-lg h-14">
                                Ver Planes
                            </Button>
                        </Link>
                        <Link href="/demo">
                            <Button size="lg" variant="outline" className="text-white border-slate-600 hover:bg-slate-800 px-8 text-lg h-14">
                                Solicitar Demo
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4 text-slate-900">Todo lo que necesitas para crecer</h2>
                        <p className="text-slate-600 max-w-2xl mx-auto">
                            Herramientas diseñadas específicamente para el sector salud, pensadas para ahorrar tiempo y aumentar ingresos.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<Calendar className="h-10 w-10 text-blue-500" />}
                            title="Agenda Inteligente"
                            description="Evita huecos y solapamientos. Gestión de turnos con recordatorios automáticos."
                        />
                        <FeatureCard
                            icon={<Users className="h-10 w-10 text-green-500" />}
                            title="Portal de Pacientes"
                            description="Permite que tus pacientes agenden, paguen y vean sus resultados online 24/7."
                        />
                        <FeatureCard
                            icon={<BarChart3 className="h-10 w-10 text-purple-500" />}
                            title="Analítica Financiera"
                            description="Control total de ingresos, honorarios médicos y liquidaciones automáticas."
                        />
                        <FeatureCard
                            icon={<ShieldCheck className="h-10 w-10 text-indigo-500" />}
                            title="Historia Clínica Segura"
                            description="Datos encriptados y accesibles desde cualquier lugar. Cumple con normativas."
                        />
                        <FeatureCard
                            icon={<Building2 className="h-10 w-10 text-orange-500" />}
                            title="Gestión Multisede"
                            description="Administra múltiples ubicaciones y especialidades desde un único panel."
                        />
                        <FeatureCard
                            icon={<Zap className="h-10 w-10 text-yellow-500" />}
                            title="Automatización"
                            description="Reduce el ausentismo con confirmaciones automáticas por WhatsApp."
                        />
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="planes" className="py-24 bg-slate-50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4 text-slate-900">Elige tu Ciclo de Pago</h2>
                        <p className="text-slate-600 max-w-2xl mx-auto mb-8">
                            Flexibilidad total. Elige cuántos meses quieres pagar por adelantado.
                        </p>

                        {/* Selector de Meses */}
                        <div className="flex flex-wrap justify-center gap-2 bg-slate-100 p-2 rounded-xl w-fit mx-auto">
                            {[1, 3, 6, 12].map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setMonths(m)}
                                    className={`px-6 py-3 rounded-lg text-sm font-bold transition-all relative ${months === m
                                            ? 'bg-slate-900 text-white shadow-lg scale-105'
                                            : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                                        }`}
                                >
                                    {m === 1 ? '1 Mes' : `${m} Meses`}
                                    {m === 3 && (
                                        <span className="absolute -top-3 -right-2 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                                            -5%
                                        </span>
                                    )}
                                    {m === 6 && (
                                        <span className="absolute -top-3 -right-2 bg-purple-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                                            -8%
                                        </span>
                                    )}
                                    {m === 12 && (
                                        <span className="absolute -top-3 -right-2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                                            -15%
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="max-w-lg mx-auto">
                        <Card className={`border-2 shadow-2xl relative overflow-hidden transition-colors ${discount > 0 ? 'border-green-500' : 'border-slate-200'}`}>
                            {discount > 0 && (
                                <div className="absolute top-0 right-0 bg-green-500 text-white px-4 py-1 text-xs font-bold uppercase rounded-bl-lg z-10">
                                    Descuento Aplicado
                                </div>
                            )}

                            <CardHeader className="text-center pb-2">
                                <CardTitle className="text-3xl font-bold">Plan Integral</CardTitle>
                                <CardDescription className="text-lg mt-2">Todo incluido, sin límites.</CardDescription>
                            </CardHeader>

                            <CardContent className="pt-6">
                                <div className="text-center mb-8">
                                    <div className="flex items-center justify-center gap-1">
                                        <span className="text-5xl font-extrabold text-slate-900">
                                            ${total.toLocaleString('es-AR')}
                                        </span>
                                        <span className="text-lg text-muted-foreground self-end mb-2">
                                            / {months === 1 ? 'mes' : `${months} meses`}
                                        </span>
                                    </div>

                                    {months > 1 && (
                                        <div className="mt-2 text-sm text-slate-500">
                                            Equivale a <span className="font-semibold text-slate-900">${pricePerMonth.toLocaleString('es-AR')}/mes</span>
                                            {discount > 0 && <span className="text-green-600 font-bold ml-1">(-{Math.round(discount * 100)}% OFF)</span>}
                                        </div>
                                    )}
                                </div>

                                <ul className="space-y-4 mb-8">
                                    {[
                                        {
                                            title: "Todo tu equipo organizado",
                                            desc: "Coordina horarios y pagos de todos tus médicos sin complicaciones."
                                        },
                                        {
                                            title: "Historias Clínicas Compartidas",
                                            desc: "Un único historial por paciente, accesible para todos tus especialistas."
                                        },
                                        {
                                            title: "Control Total de tu Dinero",
                                            desc: "Mira cuánto ingresa y cuánto gastas en tiempo real. Sin cuentas difíciles."
                                        },
                                        {
                                            title: "Turnos Automáticos 24/7",
                                            desc: "Tus pacientes reservan solos por Web o WhatsApp, incluso mientras duermes."
                                        },
                                        {
                                            title: "Estudios y Laboratorio",
                                            desc: "Gestiona también las órdenes de estudios y entregas de resultados."
                                        },
                                        {
                                            title: "Llena tus Consultorios",
                                            desc: "Lanza descuentos y promociones para atraer pacientes en días tranquilos."
                                        },
                                        {
                                            title: "Tus Datos Seguros",
                                            desc: "Información protegida y disponible solo para quien tú autorices."
                                        }
                                    ].map((feature, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <div className="bg-green-100 rounded-full p-1 mt-0.5 shrink-0">
                                                <Check className="h-4 w-4 text-green-600 font-bold" />
                                            </div>
                                            <div className="text-left">
                                                <span className="text-slate-900 font-bold block">{feature.title}</span>
                                                <span className="text-slate-600 text-sm leading-tight">{feature.desc}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>

                                <Link href={`/auth/register-clinic?months=${months}`} className="w-full block">
                                    <Button size="lg" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12 text-lg shadow-lg hover:shadow-green-500/25 transition-all">
                                        Comenzar con {months === 1 ? '1 Mes' : `${months} Meses`}
                                    </Button>
                                </Link>
                                <p className="text-center text-xs text-muted-foreground mt-4">
                                    Prueba gratuita de 14 días. Garantía de devolución.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>
        </div>
    );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
                <div className="mb-4 bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center">
                    {icon}
                </div>
                <CardTitle className="text-xl">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );
}
