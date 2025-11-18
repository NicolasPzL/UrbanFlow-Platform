import { nc } from "../theme";
import { useState } from "react";
import { KpiModal } from "../components/KpiModal";

type KPI = {
  id: string;
  value: string;
  title: string; // qué es
  subtitle: string; // por qué importa para el cliente
};

const kpis: KPI[] = [
  { id: 'projects', value: '+15', title: 'Proyectos completados', subtitle: 'Entregas de principio a fin, sin fricción' },
  { id: 'clients', value: '+10', title: 'Clientes atendidos', subtitle: 'Sectores público y privado, distintos tamaños' },
  { id: 'uptime', value: '99.5%', title: 'Disponibilidad promedio', subtitle: 'Tu plataforma siempre lista para operar' },
  { id: 'stack', value: '+8', title: 'Tecnologías clave', subtitle: 'React, Node, Python, PostgreSQL, Docker…' },
];

export function KPISection() {
  const [openId, setOpenId] = useState<string | null>(null);

  const ChartProjects = () => (
    <svg viewBox="0 0 320 140" className="w-full h-auto">
      <defs>
        <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#00E0FF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#00E0FF" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <polyline fill="url(#g1)" stroke="#00E0FF" strokeWidth="2"
        points="0,120 40,110 80,105 120,90 160,75 200,60 240,45 280,30 320,25 320,140 0,140" />
      <g fill={nc.textSecondary} fontSize="10">
        <text x="0" y="135">2020</text><text x="60" y="135">2021</text><text x="120" y="135">2022</text>
        <text x="180" y="135">2023</text><text x="240" y="135">2024</text><text x="300" y="135">2025</text>
      </g>
    </svg>
  );

  const ChartClients = () => (
    <svg viewBox="0 0 320 140" className="w-full h-auto">
      <g fill="#00CFFF">
        <rect x="20" y="80" width="50" height="60" rx="4"/>{/* Público */}
        <rect x="100" y="60" width="50" height="80" rx="4"/>{/* Educación */}
        <rect x="180" y="40" width="50" height="100" rx="4"/>{/* Salud */}
        <rect x="260" y="50" width="50" height="90" rx="4"/>{/* Privado */}
      </g>
      <g fill={nc.textSecondary} fontSize="10">
        <text x="25" y="75">Público</text>
        <text x="98" y="55">Educación</text>
        <text x="190" y="35">Salud</text>
        <text x="265" y="45">Privado</text>
      </g>
    </svg>
  );

  const ChartUptime = () => (
    <svg viewBox="0 0 320 140" className="w-full h-auto">
      <path d="M0,90 C60,85 120,92 180,88 C240,84 300,86 320,83" stroke="#00E0FF" strokeWidth="2" fill="none"/>
      <rect x="0" y="95" width="320" height="1" fill={nc.border}/>
      <text x="10" y="110" fontSize="10" fill={nc.textSecondary}>99.0%</text>
      <text x="260" y="78" fontSize="10" fill={nc.textSecondary}>99.5%</text>
    </svg>
  );

  const ChartTech = () => (
    <svg viewBox="0 0 320 140" className="w-full h-auto">
      <g fill="#3B82F6">
        <rect x="20" y="40" width="40" height="100" rx="4"/>{/* React */}
        <rect x="80" y="60" width="40" height="80" rx="4"/>{/* Node */}
        <rect x="140" y="70" width="40" height="70" rx="4"/>{/* Python */}
        <rect x="200" y="90" width="40" height="50" rx="4"/>{/* Postgres */}
        <rect x="260" y="80" width="40" height="60" rx="4"/>{/* Docker */}
      </g>
      <g fill={nc.textSecondary} fontSize="10">
        <text x="22" y="35">React</text><text x="82" y="55">Node</text><text x="138" y="65">Python</text>
        <text x="196" y="85">PG</text><text x="260" y="75">Docker</text>
      </g>
    </svg>
  );

  const getModalContent = (id: string) => {
    switch (id) {
      case 'projects': return <ChartProjects />;
      case 'clients': return <ChartClients />;
      case 'uptime': return <ChartUptime />;
      case 'stack': return <ChartTech />;
      default: return null;
    }
  };

  return (
    <section id="kpis" className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl md:text-3xl font-semibold mb-8" style={{ color: nc.textPrimary }}>
          Confianza y resultados
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {kpis.map((k) => (
            <div
              key={k.id}
              className="rounded-2xl p-6 md:p-8 h-full nc-card nc-card-hover cursor-pointer"
              style={{ backgroundColor: nc.card, border: `1px solid ${nc.border}` }}
              onClick={() => setOpenId(k.id)}
            >
              <div className="text-3xl md:text-4xl font-bold" style={{ color: nc.cyan }}>
                {k.value}
              </div>
              <div className="mt-2 text-sm md:text-base font-medium" style={{ color: nc.textPrimary }}>
                {k.title}
              </div>
              <div className="mt-1 text-xs md:text-sm" style={{ color: nc.textSecondary }}>
                {k.subtitle}
              </div>
            </div>
          ))}
        </div>
      </div>

      <KpiModal
        open={openId !== null}
        title={kpis.find(k => k.id === openId)?.title || ''}
        onClose={() => setOpenId(null)}
      >
        {openId ? getModalContent(openId) : null}
      </KpiModal>
    </section>
  );
}


