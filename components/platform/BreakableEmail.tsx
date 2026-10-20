/** Email con punto de corte suave tras «@»: en móvil parte en «usuario@ / dominio», no a mitad de palabra. */
export function BreakableEmail({ email }: { email: string }) {
    const at = (email || '').indexOf('@');
    if (at < 0) return <>{email}</>;
    return (
        <>
            {email.slice(0, at + 1)}
            <wbr />
            {email.slice(at + 1)}
        </>
    );
}
