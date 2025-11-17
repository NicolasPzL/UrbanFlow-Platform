import { nc } from "../theme";

type Service = {
  id: string;
  title: string;
  description: string;
};

const services: Service[] = [
  {
    id: 'custom-web',
    title: 'Plataformas web a medida',
    description: 'Construimos soluciones orientadas a tus procesos para acelerar la operación y reducir costos.',
  },
  {
    id: 'data-ai',
    title: 'Integración de datos e IA',
    description: 'Conecta tus fuentes de datos y aplica analítica/IA para decisiones con evidencia.',
  },
  {
    id: 'devops-scale',
    title: 'Arquitecturas y DevOps',
    description: 'Escalabilidad, seguridad y despliegues automatizados para alta disponibilidad.',
  },
  {
    id: 'support',
    title: 'Acompañamiento y soporte',
    description: 'Trabajamos contigo más allá del lanzamiento, con mejoras continuas y monitoreo.',
  },
];

export function ServicesSection() {
  return (
    <section id="services" className="py-16 md:py-24 border-b" style={{ borderColor: nc.border }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl md:text-3xl font-semibold mb-8" style={{ color: nc.textPrimary }}>
          Qué hacemos
        </h2>
        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {services.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl p-6 md:p-8 h-full nc-card nc-card-hover"
              style={{ backgroundColor: nc.card, border: `1px solid ${nc.border}` }}
            >
              <h3 className="text-lg md:text-xl font-semibold" style={{ color: nc.textPrimary }}>
                {s.title}
              </h3>
              <p className="mt-3 text-sm md:text-base leading-relaxed" style={{ color: nc.textSecondary }}>
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


