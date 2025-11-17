import { nc } from "../theme";

type Project = {
  id: string;
  title: string;
  tech: string[];
  desc: string;
  image?: string;
};

const projects: Project[] = [
  { id: 'urbanflow', title: 'UrbanFlow Platform', tech: ['React', 'Node', 'PostgreSQL'], desc: 'Plataforma integral para gestión y analítica en transporte por cable.' },
  { id: 'iot-monitor', title: 'Sistema IoT de monitoreo', tech: ['Python', 'FastAPI', 'MQTT'], desc: 'Ingesta y procesamiento de telemetría en tiempo real.' },
  { id: 'predictive', title: 'Dashboard Predictivo', tech: ['Next Charts (mock)', 'AI'], desc: 'Visualización y predicción de KPIs críticos para negocio.' },
];

export function ProjectsSection() {
  return (
    <section className="py-16 md:py-24 border-b" style={{ borderColor: nc.border }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl md:text-3xl font-semibold mb-8" style={{ color: nc.textPrimary }}>
          Proyectos destacados
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {projects.map((p) => (
            <article
              key={p.id}
              className="rounded-2xl overflow-hidden nc-card nc-card-hover h-full"
              style={{ backgroundColor: nc.card, border: `1px solid ${nc.border}` }}
            >
              <div style={{ background: 'linear-gradient(90deg, rgba(0,224,255,.12), rgba(59,130,246,.12))' }} className="h-28" />
              <div className="p-6">
                <h3 className="text-lg md:text-xl font-semibold" style={{ color: nc.textPrimary }}>{p.title}</h3>
                <p className="mt-2 text-sm md:text-base" style={{ color: nc.textSecondary }}>{p.desc}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.tech.map((t) => (
                    <span key={t} className="text-xs px-2 py-1 rounded-md" style={{ border: `1px solid ${nc.border}`, color: nc.textPrimary }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}


