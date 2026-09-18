import { ProjectRequired } from '../components/ProjectRequired';
import { EquipmentPlacementTable } from '../components/EquipmentPlacementTable';
import { useAuth } from '../contexts/AuthContext';
import { canEditProjects } from '../utils/permissions';
export function LightingPage(){const auth=useAuth();const editable=canEditProjects(auth.profile);return <ProjectRequired><div className="stack-lg"><section className="hero-panel compact"><div><span className="eyebrow">Iluminação</span><h2>Equipamentos por estrutura</h2><p>Adicione os aparelhos e associe cada um à trave, boxtruss, totem ou posição de solo. As estruturas são compartilhadas com o áudio.</p></div></section><section className="panel"><EquipmentPlacementTable area="lighting" categories={['lighting_fixture','lighting_console','other']} editable={editable}/></section></div></ProjectRequired>}
