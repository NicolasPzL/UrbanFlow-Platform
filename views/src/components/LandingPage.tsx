import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { ArrowRight, Zap, Shield, Leaf, MapPin, Users, Clock } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { AppView } from "../types";

interface LandingPageProps {
  onViewChange: (view: AppView) => void;
}

export function LandingPage({ onViewChange }: LandingPageProps) {
  const [stationCount, setStationCount] = useState<number | null>(null);

  const benefits = [
    {
      icon: Zap,
      title: "Rapidez",
      description: "Transporte eficiente que evita el tráfico urbano, reduciendo los tiempos de viaje hasta en un 60%"
    },
    {
      icon: Shield,
      title: "Seguridad",
      description: "Sistema de monitoreo IoT en tiempo real con sensores de vibración y controles automatizados"
    },
    {
      icon: Leaf,
      title: "Sostenibilidad",
      description: "Transporte eléctrico libre de emisiones que contribuye a un futuro urbano más limpio"
    }
  ];

  const howItWorks = [
    {
      step: "1",
      title: "Accede al Geoportal",
      description: "Consulta el estado en tiempo real de todas las cabinas y estaciones"
    },
    {
      step: "2",
      title: "Planifica tu Viaje",
      description: "Visualiza tiempos estimados y ocupación de las cabinas"
    },
    {
      step: "3",
      title: "Viaja Cómodamente",
      description: "Disfruta de un transporte seguro, rápido y sostenible"
    }
  ];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/map/public');
        if (!response.ok) throw new Error(`Error ${response.status}`);
        const json = await response.json();
        const count = Array.isArray(json?.data?.stations) ? json.data.stations.length : null;
        if (!cancelled) {
          setStationCount(count);
        }
      } catch (_err) {
        if (!cancelled) {
          setStationCount(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  El Futuro del
                  <span className="text-blue-600 block">Transporte Urbano</span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Urban Flow revoluciona la movilidad urbana con un sistema de cable aéreo 
                  inteligente, monitoreado en tiempo real para garantizar un transporte 
                  seguro, rápido y sostenible.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-6"
                  onClick={() => onViewChange('geoportal-public')}
                >
                  Usar el Geoportal
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-lg px-8 py-6"
                  onClick={() => onViewChange('novacore')}
                >
                  Conocer Más
                </Button>
              </div>
              
              <div className="flex items-center space-x-8 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <span>
                    {stationCount !== null ? `${stationCount} Estación${stationCount === 1 ? '' : 'es'} Activa${stationCount === 1 ? '' : 's'}` : 'Estaciones en consulta'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span>1,847 Pasajeros/Hora</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span>Disponible 24/7</span>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1747610547112-54f626f4fc4b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWJsZSUyMGNhciUyMGNpdHklMjB0cmFuc3BvcnQlMjBhZXJpYWwlMjB2aWV3fGVufDF8fHx8MTc1NzU5ODEzMHww&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Vista aérea del sistema de cable aéreo Urban Flow"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 bg-white p-4 rounded-xl shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-900">Sistema Operativo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
              ¿Por qué elegir Urban Flow?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Nuestro sistema combina tecnología avanzada con sostenibilidad 
              para ofrecer la mejor experiencia de transporte urbano.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
                      <Icon className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">{benefit.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{benefit.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
              ¿Cómo funciona?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Tres simples pasos para usar nuestro sistema de transporte inteligente.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((step, index) => (
              <div key={index} className="relative">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{step.description}</p>
                </div>
                
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-white">
            Comienza a usar Urban Flow hoy
          </h2>
          <p className="text-xl text-blue-100 leading-relaxed">
            Accede al geoportal público para consultar el estado del sistema en tiempo real 
            y planificar tu próximo viaje.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            className="text-lg px-8 py-6"
            onClick={() => onViewChange('geoportal-public')}
          >
            Explorar Geoportal
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">UF</span>
                </div>
                <span className="text-xl font-semibold">Urban Flow</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Revolucionando el transporte urbano con tecnología sostenible e inteligente.
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold">Contacto</h4>
              <div className="space-y-2 text-gray-400">
                <p>📧 info@urbanflow.com</p>
                <p>📞 +1 (555) 123-4567</p>
                <p>📍 Av. Innovación 123, Ciudad</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold">Soporte</h4>
              <div className="space-y-2 text-gray-400">
                <p>Centro de Ayuda</p>
                <p>Documentación API</p>
                <p>Estado del Sistema</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold">Legal</h4>
              <div className="space-y-2 text-gray-400">
                <p>Términos de Uso</p>
                <p>Política de Privacidad</p>
                <p>Cookies</p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Urban Flow. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}