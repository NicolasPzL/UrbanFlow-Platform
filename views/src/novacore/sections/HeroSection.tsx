import { nc } from "../theme";

export function HeroSection() {
  // Ruta del logo agregado en /public (con espacios y paréntesis URL-encoded)
  const logoSrc = encodeURI('/Imagen de WhatsApp 2025-09-12 a las 18.57.46_6e2abe74 (1).png');

  return (
    <section
      className="border-b"
      style={{
        borderColor: nc.border,
        background: `radial-gradient(80% 80% at 10% 0%, rgba(0,224,255,0.10) 0%, rgba(5,7,11,0) 60%), linear-gradient(180deg, rgba(5,7,11,0.85) 0%, rgba(5,7,11,1) 60%)`,
      }}
    >
      {/* Estilos locales para blobs/halo animado del hero (sutil y eficiente) */}
      <style>{`
        .nc-hero-ambient{position:absolute;inset:0;pointer-events:none;z-index:0;overflow:hidden}
        .nc-blob{position:absolute;border-radius:9999px;filter:blur(48px);opacity:.35;mix-blend: normal;transform:translate3d(0,0,0)}
        .nc-blob-a{background:radial-gradient(circle at 30% 30%, rgba(0,224,255,.75), rgba(0,224,255,0) 60%);width:36vw;height:36vw;right:-6vw;top:-6vw;animation:nc-blob-float-a 22s ease-in-out infinite alternate}
        .nc-blob-b{background:radial-gradient(circle at 70% 70%, rgba(59,130,246,.6), rgba(59,130,246,0) 60%);width:28vw;height:28vw;right:6vw;top:22vw;animation:nc-blob-float-b 18s ease-in-out infinite alternate}
        .nc-blob-c{background:radial-gradient(circle at 50% 50%, rgba(0,224,255,.45), rgba(0,224,255,0) 60%);width:22vw;height:22vw;right:22vw;top:8vw;animation:nc-blob-float-c 24s ease-in-out infinite alternate}
        @keyframes nc-blob-float-a{0%{transform:translate3d(0,0,0) scale(1)}100%{transform:translate3d(-2vw,2vw,0) scale(1.06)}}
        @keyframes nc-blob-float-b{0%{transform:translate3d(0,0,0) scale(1)}100%{transform:translate3d(2vw,-1.5vw,0) scale(1.04)}}
        @keyframes nc-blob-float-c{0%{transform:translate3d(0,0,0) scale(1)}100%{transform:translate3d(-1vw,1vw,0) scale(1.05)}}
        @media (max-width: 768px){
          .nc-blob{filter:blur(36px);opacity:.28}
          .nc-blob-c{display:none}
          .nc-blob-a{width:60vw;height:60vw;right:-20vw;top:-10vw}
          .nc-blob-b{width:48vw;height:48vw;right:-8vw;top:40vw}
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="relative">
          {/* Fondo animado sutil detrás del contenido (lado derecho/área del logo) */}
          <div className="nc-hero-ambient">
            <div className="nc-blob nc-blob-a" />
            <div className="nc-blob nc-blob-b" />
            <div className="nc-blob nc-blob-c" />
          </div>
          <div className="relative z-10 grid md:grid-cols-2 gap-10 md:gap-12 items-center">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-bold" style={{ color: nc.textPrimary }}>
              NOVACORE
            </h1>
            <p className="mt-3 text-2xl md:text-3xl font-medium" style={{ color: nc.cyan }}>
              El núcleo de la innovación digital para tu organización.
            </p>
            <p className="mt-5 text-base md:text-lg leading-relaxed" style={{ color: nc.textSecondary }}>
              Impulsamos tus proyectos con plataformas web seguras, escalables y hechas a tu medida.
              Integramos datos e IA para que tus equipos trabajen mejor, más rápido y con resultados medibles.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#kpis"
                className="inline-flex items-center justify-center px-6 py-3 rounded-md font-semibold transition-colors nc-btn-gradient"
                style={{ backgroundColor: nc.cyan, color: '#001018' }}
              >
                Ver resultados
              </a>
              <a
                href="#services"
                className="inline-flex items-center justify-center px-6 py-3 rounded-md font-semibold transition-colors"
                style={{
                  color: nc.textPrimary,
                  border: `1px solid ${nc.border}`,
                  background:
                    'linear-gradient(90deg, rgba(0,224,255,0) 0%, rgba(59,130,246,0) 100%)',
                }}
              >
                Qué hacemos
              </a>
            </div>
          </div>

          <div className="w-full">
            <div
              className="rounded-2xl p-4 md:p-6 nc-float nc-glow"
              style={{
                backgroundColor: nc.card,
                border: `1px solid ${nc.border}`,
                boxShadow: '0 0 24px rgba(0,224,255,.12)',
              }}
            >
              <img
                src={logoSrc}
                alt="Logo NOVACORE: el núcleo de la innovación digital"
                className="w-full h-auto object-contain"
                style={{ borderRadius: 8, border: `1px solid ${nc.border}` }}
              />
            </div>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}


