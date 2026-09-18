import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { PendingApproval } from './components/PendingApproval';
import { useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { PresenceProvider } from './contexts/PresenceContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { EventPage } from './pages/EventPage';
import { AudioPage } from './pages/AudioPage';
import { LightingPage } from './pages/LightingPage';
import { VideoPage } from './pages/VideoPage';
import { StructurePage } from './pages/StructurePage';
import { ElectricalPage } from './pages/ElectricalPage';
import { DossierPage } from './pages/DossierPage';
import { CatalogPage } from './pages/CatalogPage';
import { AdminPage } from './pages/AdminPage';

export function App(){const auth=useAuth();if(!auth.ready)return <div className="boot-screen"><div className="boot-spinner"/><span>Carregando ambiente seguro…</span></div>;if(!auth.authenticated)return <LoginPage/>;if(!auth.approved)return <PendingApproval/>;return <DataProvider><PresenceProvider><AppShell><Routes><Route path="/" element={<DashboardPage/>}/><Route path="/evento" element={<EventPage/>}/><Route path="/audio" element={<AudioPage/>}/><Route path="/iluminacao" element={<LightingPage/>}/><Route path="/video" element={<VideoPage/>}/><Route path="/estrutura" element={<StructurePage/>}/><Route path="/eletrica" element={<ElectricalPage/>}/><Route path="/dossie" element={<DossierPage/>}/><Route path="/catalogo" element={<CatalogPage/>}/><Route path="/admin" element={<AdminPage/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></AppShell></PresenceProvider></DataProvider>}
