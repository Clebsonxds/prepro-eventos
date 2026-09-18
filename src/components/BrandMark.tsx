export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-mark" aria-label="Projeto Técnico de Eventos">
      <svg viewBox="0 0 72 72" aria-hidden="true">
        <path d="M17 8 31 16v16L17 40 3 32V16L17 8Z" />
        <path d="M45 8 59 16v16L45 40 31 32V16L45 8Z" className="fill" />
        <path d="M31 32 45 40v16L31 64 17 56V40l14-8Z" />
      </svg>
      {!compact && (
        <div>
          <strong>{import.meta.env.VITE_APP_NAME || 'Projeto Técnico de Eventos'}</strong>
          <span>Pré-produção · Engenharia · Operação</span>
        </div>
      )}
    </div>
  );
}
