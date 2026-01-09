import { AuthForm } from "@/components/auth/auth-form";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LoginPage() {
    return (
        <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
            <Link
                href="/"
                className="absolute right-4 top-4 md:right-8 md:top-8 flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors z-20"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al inicio
            </Link>

            {/* Lado Izquierdo - Imagen Decorativa */}
            <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
                <div className="absolute inset-0 bg-blue-900" />
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-indigo-900 opacity-90" />

                {/* Imagen de fondo sutil (opcional) */}
                <div className="absolute inset-0 z-0 opacity-20">
                    <Image
                        src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80"
                        alt="Healthcare Background"
                        fill
                        className="object-cover"
                        priority
                    />
                </div>

                <div className="relative z-20 flex items-center text-lg font-medium">
                    <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm mr-2">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-6 w-6"
                        >
                            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
                        </svg>
                    </div>
                    SUMA - Sistema Unificado de Medicina Avanzada
                </div>
                <div className="relative z-20 mt-auto">
                    <blockquote className="space-y-2">
                        <p className="text-lg">
                            &ldquo;La salud digital no es el futuro, es el presente. SUMA conecta médicos y pacientes de la forma más segura y eficiente.&rdquo;
                        </p>
                        <footer className="text-sm opacity-80">Dr. Alejandro V., Director Médico</footer>
                    </blockquote>
                </div>
            </div>

            {/* Lado Derecho - Formulario */}
            <div className="lg:p-8 relative flex items-center justify-center h-full">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                    <AuthForm defaultView="login" />

                    <p className="px-8 text-center text-sm text-muted-foreground">
                        Al hacer clic en continuar, aceptas nuestros{" "}
                        <Link href="/terms" className="underline underline-offset-4 hover:text-primary">
                            Términos de Servicio
                        </Link>{" "}
                        y{" "}
                        <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">
                            Política de Privacidad
                        </Link>
                        .
                    </p>
                </div>
            </div>
        </div>
    );
}
