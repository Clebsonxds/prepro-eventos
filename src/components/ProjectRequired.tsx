import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';

export function ProjectRequired({ children }: { children: ReactNode }) {
  const data = useData();
  if (data.currentProject) return <>{children}</>;
  return (
    <div className="empty-state panel">
      <h2>Selecione um projeto primeiro</h2>
      <p>As áreas técnicas trabalham sempre dentro de um projeto ativo.</p>
      <Link className="button primary" to="/">Ir para a Central</Link>
    </div>
  );
}
