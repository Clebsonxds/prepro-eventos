import { GroupAreaPage } from '../components/GroupAreaPage';
export function LightingPage() {
  return <GroupAreaPage area="lighting" eyebrow="Iluminação" title="Mapa de instalação" description="Crie quantas varas, boxtruss, totens e grupos de solo forem necessários. Cada grupo mantém sua carga individual." groupExamples="Ex.: Vara 01, Fundo, Totem esquerdo" allowedCategories={['lighting_fixture','lighting_console','structure','other']} />;
}
