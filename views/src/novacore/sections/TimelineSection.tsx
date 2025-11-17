import { nc } from "../theme";

type Item = {
  year: string;
  title: string;
  desc: string;
};

const items: Item[] = [
  { year: "2022", title: "Inicio de NOVACORE", desc: "Nace el equipo y primer stack base." },
  { year: "2023", title: "Primeros proyectos", desc: "Entregas para clientes externos." },
  { year: "2024", title: "IA y microservicios", desc: "Expansión hacia analítica e IA." },
  { year: "2025", title: "Consolidación", desc: "Proveedor multiproyecto confiable." },
];

export function TimelineSection() {
  const timelineIllustration = encodeURI('/9872a29b-c59f-44ff-9a90-96a8e00a5630.png');
  return (
    <section className="py-16 md:py-24 border-b" style={{ borderColor: nc.border }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl md:text-3xl font-semibold mb-8" style={{ color: nc.textPrimary }}>
          Nuestra evolución
        </h2>
        <style>{`
          .timeline-section-grid{
            display:grid;
            grid-template-columns: 1fr 1.15fr;
            gap: 2.5rem;
            align-items: center;
          }
          .timeline-illustration-wrapper{position:relative;width:100%;max-width:640px;margin:0 auto}
          .timeline-illustration-image{width:100%;height:auto;border-radius:20px;object-fit:cover;box-shadow:0 24px 60px rgba(0,224,255,.20);transition:transform .25s ease, box-shadow .25s ease}
          .timeline-illustration-image:hover{transform:translateY(-4px) scale(1.01);box-shadow:0 28px 70px rgba(0,224,255,.28)}
          @media (max-width:768px){
            .timeline-section-grid{grid-template-columns:1fr;gap:1.75rem}
            .timeline-illustration-wrapper{max-width:100%}
          }
        `}</style>
        <div className="timeline-section-grid">
          <div className="relative">
            <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px" style={{ background: nc.border }} />
            <div className="space-y-10">
              {items.map((it, idx) => (
                <div key={it.year} className={`grid md:grid-cols-2 gap-8 items-center`}>
                  <div className={`${idx % 2 === 0 ? 'md:order-1' : 'md:order-2'}`}>
                    <div className="flex items-center gap-3">
                      <span className="inline-block w-3 h-3 rounded-full animate-pulse" style={{ background: nc.cyan }} />
                      <span className="text-sm font-semibold" style={{ color: nc.cyan }}>{it.year}</span>
                    </div>
                    <h3 className="mt-2 text-lg md:text-xl font-semibold" style={{ color: nc.textPrimary }}>{it.title}</h3>
                    <p className="mt-1 text-sm md:text-base" style={{ color: nc.textSecondary }}>{it.desc}</p>
                  </div>
                  <div className={`${idx % 2 === 0 ? 'md:order-2' : 'md:order-1'} hidden md:block`} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="timeline-illustration-wrapper">
              <img
                src={timelineIllustration}
                alt="Ilustración tecnológica NOVACORE, código y datos en movimiento"
                className="timeline-illustration-image"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


