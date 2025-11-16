import { nc } from "../theme";

type Member = {
  name: string;
  role: string;
  description: string;
  photo: string;
};

const members: Member[] = [
  {
    name: 'Juan José Vélez Mejía',
    role: 'Desarrollador Backend & Arquitectura · Project Manager & Full-Stack Developer',
    description:
      'Especializado en diseño de APIs, modelado de datos y construcción de arquitecturas escalables para proyectos de alto impacto.',
    photo: '/assets/novacore/juan-jose.png',
  },
  {
    name: 'Nicolás Páez Lancheros',
    role: 'Desarrollador Frontend & Experiencia de Usuario',
    description:
      'Enfocado en interfaces modernas, accesibles y performantes, integrando diseño y código para ofrecer experiencias fluidas.',
    photo: '/assets/novacore/nicolas-paez.png',
  },
  {
    name: 'Andrea Castro Ruiz',
    role: 'Data & AI Developer',
    description:
      'Orienta los proyectos hacia el uso estratégico de datos, integrando analítica y modelos de inteligencia artificial en las soluciones web.',
    photo: '/assets/novacore/andrea-castro.png',
  },
  {
    name: 'Sebastián Duque Bañol',
    role: 'DevOps & Calidad de Software',
    description:
      'Encargado de la automatización, despliegue y monitoreo continuo, asegurando la confiabilidad y mantenibilidad de las plataformas.',
    photo: '/assets/novacore/sebastian-duque.png',
  },
];

export function TeamSection() {
  return (
    <section className="py-16 md:py-24 border-b" style={{ borderColor: nc.border }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-semibold" style={{ color: nc.textPrimary }}>
            Equipo
          </h2>
          <p className="mt-3 text-sm md:text-base" style={{ color: nc.textSecondary }}>
            Las personas hacen posible que tus proyectos avancen con calidad. Nuestro equipo combina experiencia
            técnica y enfoque en producto para entregar valor de forma continua.
          </p>
        </div>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {members.map((m) => (
            <article
              key={m.name}
              className="rounded-2xl p-6 md:p-8 flex gap-6 items-start h-full nc-card nc-card-hover"
              style={{ backgroundColor: nc.card, border: `1px solid ${nc.border}` }}
            >
              <div className="shrink-0">
                <div
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden nc-glow"
                  style={{ backgroundColor: '#0E131F', border: `2px solid ${nc.cyan}` }}
                >
                  <img
                    src={m.photo}
                    alt={`Foto de ${m.name}, ${m.role}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
                          <rect width="160" height="160" fill="#0E131F"/>
                          <g fill="#00CFFF">
                            <circle cx="80" cy="60" r="28"/>
                            <rect x="40" y="100" width="80" height="30" rx="8"/>
                          </g>
                        </svg>
                      `);
                    }}
                  />
                </div>
              </div>
              <div className="flex-1 flex flex-col">
                <h3 className="text-lg md:text-xl font-semibold" style={{ color: nc.textPrimary }}>
                  {m.name}
                </h3>
                <p className="text-sm md:text-base mt-1" style={{ color: nc.cyanAlt }}>
                  {m.role}
                </p>
                <p className="text-sm md:text-base mt-3 leading-relaxed" style={{ color: nc.textSecondary }}>
                  {m.description}
                </p>
                <div className="mt-4 flex items-center gap-3 text-xs">
                  <a
                    href="#"
                    aria-label="GitHub"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-md"
                    style={{ border: `1px solid ${nc.border}`, color: nc.textPrimary }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.41-1.35-1.78-1.35-1.78-1.1-.76.08-.75.08-.75 1.22.09 1.86 1.25 1.86 1.25 1.08 1.86 2.83 1.33 3.52 1.02.11-.78.42-1.33.76-1.64-2.66-.3-5.47-1.33-5.47-5.9 0-1.3.47-2.36 1.24-3.2-.12-.3-.54-1.52.12-3.16 0 0 1-.32 3.29 1.22a11.4 11.4 0 0 1 5.99 0c2.29-1.54 3.29-1.22 3.29-1.22.66 1.64.24 2.86.12 3.16.77.84 1.24 1.9 1.24 3.2 0 4.58-2.81 5.6-5.49 5.9.43.37.81 1.1.81 2.23v3.3c0 .32.21.69.82.58A12 12 0 0 0 12 .5z"/>
                    </svg>
                  </a>
                  <a
                    href="#"
                    aria-label="LinkedIn"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-md"
                    style={{ border: `1px solid ${nc.border}`, color: nc.textPrimary }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.14c-.96 0-1.75-.79-1.75-1.76s.79-1.76 1.75-1.76 1.75.79 1.75 1.76-.79 1.76-1.75 1.76zm13.5 11.14h-3v-5.6c0-1.34-.03-3.06-1.87-3.06-1.87 0-2.16 1.46-2.16 2.96v5.7h-3v-10h2.88v1.37h.04c.4-.76 1.38-1.56 2.85-1.56 3.05 0 3.62 2.01 3.62 4.63v5.56z"/>
                    </svg>
                  </a>
                </div>
                <div className="mt-auto" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}


