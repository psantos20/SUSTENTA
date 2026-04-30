import React from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin, Leaf, Trophy, Navigation, X, Loader2,
  Recycle, TreePine, Zap, Droplets, Star,
  ChevronRight, TrendingDown, Search, Route,
  ExternalLink, ChevronDown, ChevronUp, Clock
} from 'lucide-react';
import { auth, db } from '../../services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

declare global {
  interface Window {
    google: any;
    _googleMapsReady: boolean;
    initGoogleMaps: () => void;
  }
}

interface EstadoInfo {
  sigla: string;
  nome: string;
  score: number;
  totalUsuarios: number;
  mediaConsumo: number;
  corHex: string;
}

interface Ecoponto {
  place_id: string;
  name: string;
  vicinity: string;
  lat: number;
  lng: number;
  rating?: number;
  tipos: string[];
  distancia?: number;
  duracao?: string;
}

interface RotaInfo {
  distancia: string;
  duracao: string;
  passos: string[];
}

const MAPA_ESTILO_ESCURO = [
  { elementType: 'geometry', stylers: [{ color: '#0a0f1a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4a5568' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0f1a' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#1a2535' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0d1520' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#0d1520' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#2d7a4f' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0d2318' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#1a5c36' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a2535' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0d1520' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#3a4a5c' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1e3a2f' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#0d2318' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#2d7a4f' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#0d1520' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#060d14' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#1a3a4a' }] },
];

const TOPOJSON_URL =
  'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/json&qualidade=intermediaria&intrarregiao=UF';

const ESTADOS_POR_CODIGO: Record<string, { sigla: string; nome: string }> = {
  '11': { sigla: 'RO', nome: 'Rondonia' },
  '12': { sigla: 'AC', nome: 'Acre' },
  '13': { sigla: 'AM', nome: 'Amazonas' },
  '14': { sigla: 'RR', nome: 'Roraima' },
  '15': { sigla: 'PA', nome: 'Para' },
  '16': { sigla: 'AP', nome: 'Amapa' },
  '17': { sigla: 'TO', nome: 'Tocantins' },
  '21': { sigla: 'MA', nome: 'Maranhao' },
  '22': { sigla: 'PI', nome: 'Piaui' },
  '23': { sigla: 'CE', nome: 'Ceara' },
  '24': { sigla: 'RN', nome: 'Rio Grande do Norte' },
  '25': { sigla: 'PB', nome: 'Paraiba' },
  '26': { sigla: 'PE', nome: 'Pernambuco' },
  '27': { sigla: 'AL', nome: 'Alagoas' },
  '28': { sigla: 'SE', nome: 'Sergipe' },
  '29': { sigla: 'BA', nome: 'Bahia' },
  '31': { sigla: 'MG', nome: 'Minas Gerais' },
  '32': { sigla: 'ES', nome: 'Espirito Santo' },
  '33': { sigla: 'RJ', nome: 'Rio de Janeiro' },
  '35': { sigla: 'SP', nome: 'Sao Paulo' },
  '41': { sigla: 'PR', nome: 'Parana' },
  '42': { sigla: 'SC', nome: 'Santa Catarina' },
  '43': { sigla: 'RS', nome: 'Rio Grande do Sul' },
  '50': { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  '51': { sigla: 'MT', nome: 'Mato Grosso' },
  '52': { sigla: 'GO', nome: 'Goias' },
  '53': { sigla: 'DF', nome: 'Distrito Federal' },
};

const NOME_POR_SIGLA: Record<string, string> = Object.fromEntries(
  Object.values(ESTADOS_POR_CODIGO).map(({ sigla, nome }) => [sigla, nome])
);

const SCORE_BASE: Record<string, number> = {
  AM: 92,
  PA: 88,
  AC: 87,
  RO: 82,
  AP: 85,
  RR: 84,
  TO: 79,
  MT: 76,
  MS: 78,
  GO: 74,
  DF: 71,
  MA: 68,
  PI: 67,
  CE: 70,
  RN: 69,
  PB: 68,
  PE: 66,
  AL: 64,
  SE: 67,
  BA: 72,
  MG: 73,
  ES: 75,
  RJ: 65,
  SP: 68,
  PR: 77,
  SC: 80,
  RS: 78,
};

function carregarGoogleMaps(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) {
      window._googleMapsReady = true;
      resolve();
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;

    if (!apiKey) {
      reject(new Error('VITE_GOOGLE_MAPS_KEY não configurada no .env'));
      return;
    }

    const scriptExistente = document.querySelector<HTMLScriptElement>(
      'script[data-google-maps="true"]'
    );

    if (scriptExistente) {
      scriptExistente.addEventListener('load', () => {
        window._googleMapsReady = true;
        resolve();
      });

      scriptExistente.addEventListener('error', () => {
        reject(new Error('Erro ao carregar Google Maps'));
      });

      return;
    }

    window.initGoogleMaps = () => {
      window._googleMapsReady = true;
      window.dispatchEvent(new Event('google-maps-ready'));
      resolve();
    };

    const script = document.createElement('script');
    script.dataset.googleMaps = 'true';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error('Erro ao carregar Google Maps'));

    document.head.appendChild(script);
  });
}

function scoreParaCor(s: number) {
  if (s >= 85) return '#10b981';
  if (s >= 75) return '#22c55e';
  if (s >= 65) return '#84cc16';
  if (s >= 55) return '#eab308';
  return '#ef4444';
}

function scoreLabel(s: number) {
  if (s >= 85) return 'Excelente';
  if (s >= 75) return 'Bom';
  if (s >= 65) return 'Regular';
  if (s >= 55) return 'Atencao';
  return 'Critico';
}

function scoreColor(s: number) {
  if (s >= 85) return 'text-emerald-400';
  if (s >= 75) return 'text-green-400';
  if (s >= 65) return 'text-lime-400';
  if (s >= 55) return 'text-yellow-400';
  return 'text-red-400';
}

function tipoPonto(tipos: string[]): { label: string; icon: React.ElementType } {
  if (tipos.some(t => t.includes('recycle') || t.includes('recycling') || t.includes('waste'))) {
    return { label: 'Reciclagem', icon: Recycle };
  }

  if (tipos.some(t => t.includes('park') || t.includes('natural'))) {
    return { label: 'Area Verde', icon: TreePine };
  }

  if (tipos.some(t => t.includes('electric') || t.includes('charging'))) {
    return { label: 'Recarga EV', icon: Zap };
  }

  if (tipos.some(t => t.includes('water') || t.includes('spring'))) {
    return { label: "Ponto d'agua", icon: Droplets };
  }

  return { label: 'Ecoponto', icon: Leaf };
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;

  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

function criarIconeEcoponto(ativo = false) {
  const cor = ativo ? '#34d399' : '#10b981';
  const borda = ativo ? '#fff' : '#064e3b';

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"><path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 24 16 24s16-14 16-24C32 7.163 24.837 0 16 0z" fill="${cor}" stroke="${borda}" stroke-width="2"/><circle cx="16" cy="16" r="7" fill="white" opacity="0.9"/><circle cx="16" cy="16" r="4" fill="${cor}"/></svg>`
    )}`,
    scaledSize: { width: 32, height: 40 },
    anchor: { x: 16, y: 40 },
  };
}

function criarIconeUsuario() {
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#3b82f6" stroke="white" stroke-width="2.5"/><circle cx="12" cy="12" r="4" fill="white"/></svg>`
    )}`,
    scaledSize: { width: 24, height: 24 },
    anchor: { x: 12, y: 12 },
  };
}

function useDarkMode() {
  const [dark, setDark] = React.useState(() =>
    document.documentElement.classList.contains('dark')
  );

  React.useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains('dark'))
    );

    obs.observe(document.documentElement, { attributeFilter: ['class'] });

    return () => obs.disconnect();
  }, []);

  return dark;
}
export const MapPage: React.FC = () => {
  const dark = useDarkMode();

  const mapDivRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<any>(null);

  const [googlePronto, setGooglePronto] = React.useState(false);
  const [loadingMapa, setLoadingMapa] = React.useState(true);

  const [userPos, setUserPos] = React.useState<{ lat: number; lng: number } | null>(null);
  const [loadingPos, setLoadingPos] = React.useState(false);

  const [ecopontos, setEcopontos] = React.useState<Ecoponto[]>([]);
  const [loadingEco, setLoadingEco] = React.useState(false);

  // 🔥 CARREGAMENTO CORRIGIDO DO GOOGLE MAPS
  React.useEffect(() => {
    let ativo = true;

    carregarGoogleMaps()
      .then(() => {
        if (ativo) setGooglePronto(true);
      })
      .catch((error) => {
        console.error('Erro Google Maps:', error);
      });

    return () => {
      ativo = false;
    };
  }, []);

  // 🔥 INICIALIZA MAPA
  React.useEffect(() => {
    if (!googlePronto || !mapDivRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = new window.google.maps.Map(mapDivRef.current, {
      center: { lat: -14.235, lng: -51.925 },
      zoom: 4,
      styles: MAPA_ESTILO_ESCURO,
      disableDefaultUI: true,
      zoomControl: true,
    });

    setLoadingMapa(false);
  }, [googlePronto]);

  // 🔥 PEGAR LOCALIZAÇÃO
  const pegarLocalizacao = () => {
    setLoadingPos(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setUserPos({ lat, lng });

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter({ lat, lng });
          mapInstanceRef.current.setZoom(14);

          new window.google.maps.Marker({
            position: { lat, lng },
            map: mapInstanceRef.current,
            icon: criarIconeUsuario(),
          });
        }

        buscarEcopontos(lat, lng);
        setLoadingPos(false);
      },
      () => {
        alert('Erro ao pegar localização');
        setLoadingPos(false);
      }
    );
  };

  // 🔥 BUSCAR ECOPONTOS (VERSÃO SIMPLIFICADA E FUNCIONAL)
  const buscarEcopontos = (lat: number, lng: number) => {
    if (!mapInstanceRef.current) return;

    setLoadingEco(true);

    const service = new window.google.maps.places.PlacesService(mapInstanceRef.current);

    service.nearbySearch(
      {
        location: { lat, lng },
        radius: 5000,
        keyword: 'reciclagem',
      },
      (results: any[], status: string) => {
        if (status === 'OK' && results) {
          const lista = results.map((p) => ({
            place_id: p.place_id,
            name: p.name,
            vicinity: p.vicinity,
            lat: p.geometry.location.lat(),
            lng: p.geometry.location.lng(),
            rating: p.rating,
            tipos: p.types || [],
          }));

          setEcopontos(lista);

          lista.forEach((eco) => {
            new window.google.maps.Marker({
              position: { lat: eco.lat, lng: eco.lng },
              map: mapInstanceRef.current,
              icon: criarIconeEcoponto(),
            });
          });
        }

        setLoadingEco(false);
      }
    );
  };

  return (
    <div className="w-full h-full relative">

      {!googlePronto && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
        </div>
      )}

      <div ref={mapDivRef} className="w-full h-full rounded-2xl" />

      {/* BOTÃO LOCALIZAÇÃO */}
      <button
        onClick={pegarLocalizacao}
        className="absolute top-5 right-5 bg-green-600 text-white px-4 py-2 rounded-xl font-bold"
      >
        {loadingPos ? 'Buscando...' : 'Encontrar Ecopontos'}
      </button>

      {/* LISTA ECOPONTOS */}
      {ecopontos.length > 0 && (
        <div className="absolute bottom-5 left-5 bg-slate-900 p-4 rounded-xl w-72 max-h-80 overflow-y-auto">
          <h3 className="text-white font-bold mb-2">Ecopontos</h3>

          {ecopontos.map((eco) => (
            <div key={eco.place_id} className="mb-2 border-b border-slate-700 pb-2">
              <p className="text-white text-sm font-semibold">{eco.name}</p>
              <p className="text-slate-400 text-xs">{eco.vicinity}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};