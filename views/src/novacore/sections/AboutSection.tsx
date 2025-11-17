import { nc } from "../theme";

export function AboutSection() {
  return (
    <section className="py-16 md:py-24 border-b" style={{ borderColor: nc.border }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="rounded-2xl p-8 md:p-12"
          style={{ backgroundColor: nc.card, border: `1px solid ${nc.border}` }}
        >
          <h2 className="text-2xl md:text-3xl font-semibold mb-4" style={{ color: nc.textPrimary }}>
            ¿Quiénes somos?
          </h2>
          <div className="space-y-4 max-w-3xl">
            <p className="text-base md:text-lg leading-relaxed" style={{ color: nc.textSecondary }}>
              NOVACORE nace para resolver un reto concreto: ayudar a las organizaciones a llevar sus ideas a
              plataformas web confiables, rápidas y sostenibles. Entendemos que tus procesos son únicos, por eso
              construimos soluciones a la medida que eliminan fricciones y potencian resultados.
            </p>
            <p className="text-base md:text-lg leading-relaxed" style={{ color: nc.textSecondary }}>
              Nuestro equipo multidisciplinario integra desarrollo, datos e infraestructura para que tus productos
              evolucionen con seguridad y escalabilidad. Trabajamos contigo de principio a fin, desde la concepción
              hasta la operación, con una comunicación clara y métricas de valor.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}


