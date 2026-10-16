import Link from "next/link";
import { ArrowRight, MailPlus } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";

export default function SignupPage() {
    // El alta de miembros es por invitación; las clínicas nuevas se crean desde /acceso.
    return (
        <AuthShell
            eyebrow="Equipo de la clínica"
            title="El acceso del equipo"
            accent="es por invitación."
            subtitle="Pide a un administrador de tu clínica que te invite desde Configuración. Si quieres registrar una clínica nueva, créala desde el acceso."
            back={{ href: "/acceso", label: "Volver al acceso" }}
        >
            <div className="sf-auth-form">
                <div className="sf-auth-note">
                    <MailPlus size={18} />
                    <span>Recibirás un correo con tus datos de acceso cuando te inviten.</span>
                </div>
                <Link href="/acceso" className="sf-auth-btn">Ir al acceso <ArrowRight size={17} className="arrow" /></Link>
            </div>
        </AuthShell>
    );
}
