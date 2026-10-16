import { redirect } from 'next/navigation';

// Los miembros ahora se gestionan dentro de Configuración.
export default function MiembrosPage() {
    redirect('/administracion/settings');
}
