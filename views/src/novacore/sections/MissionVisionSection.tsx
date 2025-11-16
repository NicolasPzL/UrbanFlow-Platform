import { nc } from "../theme";

export function MissionVisionSection() {
  return (
    <section className="py-16 md:py-24 border-b" style={{ borderColor: nc.border }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl md:text-3xl font-semibold mb-8" style={{ color: nc.textPrimary }}>
          Misión, Visión y Valores
        </h2>
        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          <div
            className="rounded-2xl p-8 md:p-10 nc-card nc-card-hover"
            style={{ backgroundColor: nc.card, border: `1px solid ${nc.border}` }}
          >
            <h3 className="text-xl md:text-2xl font-semibold mb-3" style={{ color: nc.textPrimary }}>
              Misión
            </h3>
            <p className="text-base leading-relaxed" style={{ color: nc.textSecondary }}>
              Diseñar y desarrollar plataformas digitales que impulsen la transformación tecnológica de tu organización, con foco en impacto, seguridad y escalabilidad.
            </p>
          </div>
          <div
            className="rounded-2xl p-8 md:p-10 nc-card nc-card-hover"
            style={{ backgroundColor: nc.card, border: `1px solid ${nc.border}` }}
          >
            <h3 className="text-xl md:text-2xl font-semibold mb-3" style={{ color: nc.textPrimary }}>
              Visión
            </h3>
            <p className="text-base leading-relaxed" style={{ color: nc.textSecondary }}>
              Ser el socio tecnológico preferido por su calidad, creatividad e innovación, llevando tus productos a un siguiente nivel en el mercado.
            </p>
          </div>
          <div
            className="rounded-2xl p-8 md:p-10 nc-card nc-card-hover"
            style={{ backgroundColor: nc.card, border: `1px solid ${nc.border}` }}
          >
            <h3 className="text-xl md:text-2xl font-semibold mb-3" style={{ color: nc.textPrimary }}>
              Valores
            </h3>
            <ul className="space-y-2 text-sm md:text-base" style={{ color: nc.textSecondary }}>
              <li>• Innovación con propósito: soluciones útiles, no solo “nuevas”.</li>
              <li>• Calidad verificable: métricas y pruebas en cada entrega.</li>
              <li>• Confianza y transparencia: comunicación clara y continua.</li>
              <li>• Aprendizaje continuo: mejoras constantes para tu producto.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}


