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
  sigla: string; nome: string; score: number;
  totalUsuarios: number; mediaConsumo: number; corHex: string;
}

interface Ecoponto {
  place_id: string; name: string; vicinity: string;
  lat: number; lng: number; rating?: number;
  tipos: string[]; distancia?: number; duracao?: string;
}

interface RotaInfo { distancia: string; duracao: string; passos: string[]; }

const MAPA_ESTILO_ESCURO = [
  { elementType: 'geometry',          stylers: [{ color: '#0a0f1a' }] },
  { elementType: 'labels.text.fill',  stylers: [{ color: '#4a5568' }] },
  { elementType: 'labels.text.stroke',stylers: [{ color: '#0a0f1a' }] },
  { featureType: 'administrative',    elementType: 'geometry.stroke', stylers: [{ color: '#1a2535' }] },
  { featureType: 'landscape',         elementType: 'geometry',        stylers: [{ color: '#0d1520' }] },
  { featureType: 'poi',               elementType: 'geometry',        stylers: [{ color: '#0d1520' }] },
  { featureType: 'poi',               elementType: 'labels.text.fill',stylers: [{ color: '#2d7a4f' }] },
  { featureType: 'poi.park',          elementType: 'geometry',        stylers: [{ color: '#0d2318' }] },
  { featureType: 'poi.park',          elementType: 'labels.text.fill',stylers: [{ color: '#1a5c36' }] },
  { featureType: 'road',              elementType: 'geometry',        stylers: [{ color: '#1a2535' }] },
  { featureType: 'road',              elementType: 'geometry.stroke', stylers: [{ color: '#0d1520' }] },
  { featureType: 'road',              elementType: 'labels.text.fill',stylers: [{ color: '#3a4a5c' }] },
  { featureType: 'road.highway',      elementType: 'geometry',        stylers: [{ color: '#1e3a2f' }] },
  { featureType: 'road.highway',      elementType: 'geometry.stroke', stylers: [{ color: '#0d2318' }] },
  { featureType: 'road.highway',      elementType: 'labels.text.fill',stylers: [{ color: '#2d7a4f' }] },
  { featureType: 'transit',           elementType: 'geometry',        stylers: [{ color: '#0d1520' }] },
  { featureType: 'water',             elementType: 'geometry',        stylers: [{ color: '#060d14' }] },
  { featureType: 'water',             elementType: 'labels.text.fill',stylers: [{ color: '#1a3a4a' }] },
];

const TOPOJSON_URL = 'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/json&qualidade=intermediaria&intrarregiao=UF';

const ESTADOS_POR_CODIGO: Record<string, { sigla: string; nome: string }> = {
  '11': { sigla: 'RO', nome: 'Rondonia' },       '12': { sigla: 'AC', nome: 'Acre' },
  '13': { sigla: 'AM', nome: 'Amazonas' },        '14': { sigla: 'RR', nome: 'Roraima' },
  '15': { sigla: 'PA', nome: 'Para' },            '16': { sigla: 'AP', nome: 'Amapa' },
  '17': { sigla: 'TO', nome: 'Tocantins' },       '21': { sigla: 'MA', nome: 'Maranhao' },
  '22': { sigla: 'PI', nome: 'Piaui' },           '23': { sigla: 'CE', nome: 'Ceara' },
  '24': { sigla: 'RN', nome: 'Rio Grande do Norte' }, '25': { sigla: 'PB', nome: 'Paraiba' },
  '26': { sigla: 'PE', nome: 'Pernambuco' },      '27': { sigla: 'AL', nome: 'Alagoas' },
  '28': { sigla: 'SE', nome: 'Sergipe' },         '29': { sigla: 'BA', nome: 'Bahia' },
  '31': { sigla: 'MG', nome: 'Minas Gerais' },    '32': { sigla: 'ES', nome: 'Espirito Santo' },
  '33': { sigla: 'RJ', nome: 'Rio de Janeiro' },  '35': { sigla: 'SP', nome: 'Sao Paulo' },
  '41': { sigla: 'PR', nome: 'Parana' },          '42': { sigla: 'SC', nome: 'Santa Catarina' },
  '43': { sigla: 'RS', nome: 'Rio Grande do Sul' },'50': { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  '51': { sigla: 'MT', nome: 'Mato Grosso' },     '52': { sigla: 'GO', nome: 'Goias' },
  '53': { sigla: 'DF', nome: 'Distrito Federal' },
};

const NOME_POR_SIGLA: Record<string, string> = Object.fromEntries(
  Object.values(ESTADOS_POR_CODIGO).map(({ sigla, nome }) => [sigla, nome])
);

const SCORE_BASE: Record<string, number> = {
  AM: 92, PA: 88, AC: 87, RO: 82, AP: 85, RR: 84, TO: 79,
  MT: 76, MS: 78, GO: 74, DF: 71,
  MA: 68, PI: 67, CE: 70, RN: 69, PB: 68, PE: 66, AL: 64, SE: 67, BA: 72,
  MG: 73, ES: 75, RJ: 65, SP: 68, PR: 77, SC: 80, RS: 78,
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
        window.dispatchEvent(new Event('google-maps-ready'));
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
  if (s >= 85) return '#10b981'; if (s >= 75) return '#22c55e';
  if (s >= 65) return '#84cc16'; if (s >= 55) return '#eab308'; return '#ef4444';
}
function scoreLabel(s: number) {
  if (s >= 85) return 'Excelente'; if (s >= 75) return 'Bom';
  if (s >= 65) return 'Regular';   if (s >= 55) return 'Atencao'; return 'Critico';
}
function scoreColor(s: number) {
  if (s >= 85) return 'text-emerald-400'; if (s >= 75) return 'text-green-400';
  if (s >= 65) return 'text-lime-400';    if (s >= 55) return 'text-yellow-400'; return 'text-red-400';
}
function tipoPonto(tipos: string[]): { label: string; icon: React.ElementType } {
  if (tipos.some(t => t.includes('recycle') || t.includes('recycling') || t.includes('waste'))) return { label: 'Reciclagem', icon: Recycle };
  if (tipos.some(t => t.includes('park') || t.includes('natural')))   return { label: 'Area Verde', icon: TreePine };
  if (tipos.some(t => t.includes('electric') || t.includes('charging'))) return { label: 'Recarga EV', icon: Zap };
  if (tipos.some(t => t.includes('water') || t.includes('spring')))   return { label: "Ponto d'agua", icon: Droplets };
  return { label: 'Ecoponto', icon: Leaf };
}
function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}
function criarIconeEcoponto(ativo = false) {
  const cor = ativo ? '#34d399' : '#10b981', borda = ativo ? '#fff' : '#064e3b';
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"><path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 24 16 24s16-14 16-24C32 7.163 24.837 0 16 0z" fill="${cor}" stroke="${borda}" stroke-width="2"/><circle cx="16" cy="16" r="7" fill="white" opacity="0.9"/><circle cx="16" cy="16" r="4" fill="${cor}"/></svg>`)}`,
    scaledSize: { width: 32, height: 40 }, anchor: { x: 16, y: 40 },
  };
}
function criarIconeUsuario() {
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#3b82f6" stroke="white" stroke-width="2.5"/><circle cx="12" cy="12" r="4" fill="white"/></svg>`)}`,
    scaledSize: { width: 24, height: 24 }, anchor: { x: 12, y: 12 },
  };
}
function useDarkMode() {
  const [dark, setDark] = React.useState(() => document.documentElement.classList.contains('dark'));
  React.useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    obs.observe(document.documentElement, { attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

export const MapPage: React.FC = () => {
  const dark = useDarkMode();

  const mapDivRef       = React.useRef<HTMLDivElement>(null);
  const svgRef          = React.useRef<SVGSVGElement>(null);
  const containerRef    = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef  = React.useRef<any>(null);
  const marcadoresRef   = React.useRef<Map<string, any>>(new Map());
  const marcadorUserRef = React.useRef<any>(null);
  const infoWindowRef   = React.useRef<any>(null);
  const direcaoRef      = React.useRef<any>(null);
  const ecopontosRef    = React.useRef<Ecoponto[]>([]);
  const userPosRef      = React.useRef<{ lat: number; lng: number } | null>(null);

  const [googlePronto,  setGooglePronto]  = React.useState(false);
  const [geoData,       setGeoData]       = React.useState<GeoJSON.FeatureCollection | null>(null);
  const [loadingMapa,   setLoadingMapa]   = React.useState(true);
  const [estadoAtivo,   setEstadoAtivo]   = React.useState<string | null>(null);
  const [tooltip,       setTooltip]       = React.useState<{ x: number; y: number; sigla: string; score: number } | null>(null);
  const [userPos,       setUserPos]       = React.useState<{ lat: number; lng: number } | null>(null);
  const [loadingPos,    setLoadingPos]    = React.useState(false);
  const [ecopontos,     setEcopontos]     = React.useState<Ecoponto[]>([]);
  const [loadingEco,    setLoadingEco]    = React.useState(false);
  const [ecopontoAtivo, setEcopontoAtivo] = React.useState<Ecoponto | null>(null);
  const [rota,          setRota]          = React.useState<RotaInfo | null>(null);
  const [loadingRota,   setLoadingRota]   = React.useState(false);
  const [abaPainel,     setAbaPainel]     = React.useState<'estado' | 'ecopontos' | 'ranking'>('estado');
  const [painelAberto,  setPainelAberto]  = React.useState(true);
  const [meuConsumo,    setMeuConsumo]    = React.useState(0);
  const [meuEstado,     setMeuEstado]     = React.useState('');
  const [nomeCidade,    setNomeCidade]    = React.useState('');
  const [buscaEco,      setBuscaEco]      = React.useState('');

  React.useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setOptions({ styles: dark ? MAPA_ESTILO_ESCURO : [] });
  }, [dark]);

  React.useEffect(() => { ecopontosRef.current = ecopontos; }, [ecopontos]);
  React.useEffect(() => { userPosRef.current = userPos; }, [userPos]);

  const estadosInfo = React.useMemo((): Record<string, EstadoInfo> => {
    const info: Record<string, EstadoInfo> = {};
    Object.values(ESTADOS_POR_CODIGO).forEach(({ sigla, nome }) => {
      const score = SCORE_BASE[sigla] || 65;
      info[sigla] = { sigla, nome, score, totalUsuarios: Math.floor(score * 12 + 80), mediaConsumo: Math.round((110 - score) * 8 + 200), corHex: scoreParaCor(score) };
    });
    return info;
  }, []);

  const rankingEstados = React.useMemo(() => Object.values(estadosInfo).sort((a, b) => b.score - a.score), [estadosInfo]);

  React.useEffect(() => {
    let ativo = true;

    carregarGoogleMaps()
      .then(() => {
        if (ativo) setGooglePronto(true);
      })
      .catch((error) => {
        console.error('[Sustenta] Erro ao carregar Google Maps:', error);
        if (ativo) setGooglePronto(false);
      });

    const h = () => {
      if (ativo) setGooglePronto(true);
    };

    window.addEventListener('google-maps-ready', h);

    return () => {
      ativo = false;
      window.removeEventListener('google-maps-ready', h);
    };
  }, []);

  React.useEffect(() => {
    if (!googlePronto || !mapDivRef.current || mapInstanceRef.current) return;
    mapInstanceRef.current = new window.google.maps.Map(mapDivRef.current, {
      center: { lat: -14.235, lng: -51.925 }, zoom: 4,
      styles: MAPA_ESTILO_ESCURO, disableDefaultUI: true,
      zoomControl: true, zoomControlOptions: { position: window.google.maps.ControlPosition.RIGHT_BOTTOM },
      gestureHandling: 'greedy', backgroundColor: '#0a0f1a',
    });
    infoWindowRef.current = new window.google.maps.InfoWindow();
    direcaoRef.current    = new window.google.maps.DirectionsRenderer({
      suppressMarkers: false,
      polylineOptions: { strokeColor: '#10b981', strokeWeight: 5, strokeOpacity: 0.9 },
    });
  }, [googlePronto]);

  React.useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const snap = await getDocs(query(collection(db, 'registros'), where('uid', '==', user.uid)));
      setMeuConsumo(snap.docs.reduce((s, d) => s + (d.data().valor || 0), 0));
      const uDoc = await getDoc(doc(db, 'usuarios', user.uid));
      if (uDoc.exists()) { setMeuEstado(uDoc.data().estado || ''); setNomeCidade(uDoc.data().cidade || ''); }
    };
    load().catch(console.error);
  }, []);

  React.useEffect(() => {
    fetch(TOPOJSON_URL).then(r => r.json()).then(raw => {
      let features: GeoJSON.Feature[] = [];
      if (raw.type === 'Topology') {
        const topo = raw as Topology; const key = Object.keys(topo.objects)[0];
        features = (topojson.feature(topo, topo.objects[key] as GeometryCollection) as GeoJSON.FeatureCollection).features;
      } else if (raw.type === 'FeatureCollection') features = raw.features;
      const normalized = features.map(f => {
        const p = (f.properties ?? {}) as Record<string, string>;
        const cod = (p.codarea || p.cod || '').replace(/^0+/, '');
        const est = ESTADOS_POR_CODIGO[cod];
        return { ...f, properties: { ...p, sigla: est?.sigla || p.sigla || cod, nome: est?.nome || p.nome || cod } };
      });
      setGeoData({ type: 'FeatureCollection', features: normalized });
      setLoadingMapa(false);
    }).catch(() => setLoadingMapa(false));
  }, []);

  const renderMiniMapa = React.useCallback(() => {
    if (!svgRef.current || !containerRef.current || !geoData) return;
    const svg = d3.select(svgRef.current); svg.selectAll('*').remove();
    const { width } = containerRef.current.getBoundingClientRect(); if (!width) return;
    const height = width * 1.08;
    svg.attr('width', width).attr('height', height);
    const projection = d3.geoMercator().fitSize([width, height], geoData);
    const pathGen    = d3.geoPath().projection(projection);
    const defs = svg.append('defs');
    defs.append('filter').attr('id', 'glow-mini').append('feDropShadow').attr('dx', 0).attr('dy', 0).attr('stdDeviation', 4).attr('flood-color', '#10b981').attr('flood-opacity', 0.9);
    const g = svg.append('g');
    g.selectAll<SVGPathElement, GeoJSON.Feature>('path.estado').data(geoData.features).join('path').attr('class', 'estado')
      .attr('d', d => pathGen(d) ?? '')
      .attr('fill', d => { const { sigla } = d.properties as any; if (sigla === estadoAtivo) return '#10b981'; if (sigla === meuEstado) return '#0d9488'; return estadosInfo[sigla]?.corHex || '#1e293b'; })
      .attr('stroke', '#0a0f1a').attr('stroke-width', 0.7)
      .attr('filter', d => (d.properties as any).sigla === estadoAtivo ? 'url(#glow-mini)' : 'none')
      .style('cursor', 'pointer').style('opacity', 0).transition().duration(600).delay((_, i) => i * 12).style('opacity', 1);
    g.selectAll<SVGPathElement, GeoJSON.Feature>('path.hit').data(geoData.features).join('path').attr('class', 'hit')
      .attr('d', d => pathGen(d) ?? '').attr('fill', 'transparent').attr('stroke', 'none').style('cursor', 'pointer')
      .on('mouseenter', function (_ev, d) {
        const { sigla } = d.properties as any;
        const [cx, cy] = pathGen.centroid(d);
        const svgRect = svgRef.current!.getBoundingClientRect(); const conRect = containerRef.current!.getBoundingClientRect();
        setTooltip({ x: cx * (svgRect.width / width) + (svgRect.left - conRect.left), y: cy * (svgRect.height / height) + (svgRect.top - conRect.top), sigla, score: estadosInfo[sigla]?.score || 0 });
        if (sigla !== estadoAtivo) g.selectAll<SVGPathElement, GeoJSON.Feature>('path.estado').filter(dd => (dd.properties as any).sigla === sigla).attr('fill', '#34d399');
      })
      .on('mouseleave', (_ev, d) => {
        const { sigla } = d.properties as any; setTooltip(null);
        if (sigla !== estadoAtivo) g.selectAll<SVGPathElement, GeoJSON.Feature>('path.estado').filter(dd => (dd.properties as any).sigla === sigla).attr('fill', sigla === meuEstado ? '#0d9488' : estadosInfo[sigla]?.corHex || '#1e293b');
      })
      .on('click', (_ev, d) => { const { sigla } = d.properties as any; setEstadoAtivo(prev => prev === sigla ? null : sigla); setAbaPainel('estado'); setPainelAberto(true); });
    g.selectAll<SVGTextElement, GeoJSON.Feature>('text.lbl').data(geoData.features).join('text').attr('class', 'lbl')
      .attr('x', d => pathGen.centroid(d)[0]).attr('y', d => pathGen.centroid(d)[1])
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central').attr('font-family', 'system-ui, sans-serif')
      .attr('font-size', d => { const a = pathGen.area(d); return a > 8000 ? '10px' : a > 3000 ? '8px' : a > 800 ? '6px' : '5px'; })
      .attr('font-weight', '700').attr('fill', '#fff').style('pointer-events', 'none').style('user-select', 'none').style('opacity', 0)
      .text(d => (d.properties as any).sigla || '').transition().duration(400).delay((_, i) => 450 + i * 10).style('opacity', 0.85);
  }, [geoData, estadoAtivo, meuEstado, estadosInfo]);

  React.useEffect(() => { renderMiniMapa(); }, [renderMiniMapa]);
  React.useEffect(() => { const obs = new ResizeObserver(() => renderMiniMapa()); if (containerRef.current) obs.observe(containerRef.current); return () => obs.disconnect(); }, [renderMiniMapa]);

  const pegarLocalizacao = () => {
    setLoadingPos(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserPos({ lat, lng });
        setLoadingPos(false);
        buscarEcopontos(lat, lng);
        setAbaPainel('ecopontos');
        setPainelAberto(true);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter({ lat, lng });
          mapInstanceRef.current.setZoom(13);
          if (marcadorUserRef.current) marcadorUserRef.current.setMap(null);
          marcadorUserRef.current = new window.google.maps.Marker({
            position: { lat, lng }, map: mapInstanceRef.current,
            icon: criarIconeUsuario(), title: 'Voce esta aqui', zIndex: 999,
          });
        }
      },
      () => { setLoadingPos(false); alert('Nao foi possivel obter sua localizacao.'); },
      { timeout: 10000 }
    );
  };

  const buscarEcopontos = async (lat: number, lng: number) => {
    setLoadingEco(true);
    setEcopontos([]);
    setEcopontoAtivo(null);
    setRota(null);

    marcadoresRef.current.forEach(m => m.setMap(null));
    marcadoresRef.current.clear();
    if (direcaoRef.current) direcaoRef.current.setMap(null);

    if (!window.google?.maps || !mapInstanceRef.current) { setLoadingEco(false); return; }

    let cidade = nomeCidade || '';
    if (!cidade) {
      try {
        const geocoder = new window.google.maps.Geocoder();
        await new Promise<void>(resolve => {
          geocoder.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
            if (status === 'OK' && results?.[0]) {
              const comp = results[0].address_components?.find((c: any) =>
                c.types.includes('administrative_area_level_2') || c.types.includes('locality')
              );
              if (comp) cidade = comp.long_name;
            }
            resolve();
          });
        });
      } catch (_) {}
    }

    const service = new window.google.maps.places.PlacesService(mapInstanceRef.current);
    const center  = new window.google.maps.LatLng(lat, lng);
    const resultados: Ecoponto[] = [];

    const queries = cidade
      ? [`ecoponto ${cidade}`, `reciclagem ${cidade}`, `coleta seletiva ${cidade}`, `ponto coleta ${cidade}`]
      : ['ecoponto', 'ponto de reciclagem', 'coleta seletiva'];

    await Promise.all(queries.map(q =>
      new Promise<void>(resolve => {
        service.textSearch({ query: q, location: center, radius: 30000 }, (results: any[], status: string) => {
          if (status === 'OK' && results) {
            results.slice(0, 8).forEach((p: any) => {
              if (!resultados.find(r => r.place_id === p.place_id)) {
                const pLat = p.geometry.location.lat();
                const pLng = p.geometry.location.lng();
                resultados.push({
                  place_id: p.place_id, name: p.name,
                  vicinity: p.formatted_address || p.vicinity || '',
                  lat: pLat, lng: pLng, rating: p.rating,
                  tipos: p.types || [],
                  distancia: haversine(lat, lng, pLat, pLng),
                });
              }
            });
          }
          resolve();
        });
      })
    ));

    if (resultados.length < 5) {
      await new Promise<void>(resolve => {
        service.nearbySearch({ location: center, radius: 10000, type: 'park' }, (results: any[], status: string) => {
          if (status === 'OK' && results) {
            results.slice(0, 6).forEach((p: any) => {
              if (!resultados.find(r => r.place_id === p.place_id)) {
                const pLat = p.geometry.location.lat();
                const pLng = p.geometry.location.lng();
                resultados.push({
                  place_id: p.place_id, name: p.name,
                  vicinity: p.vicinity || '',
                  lat: pLat, lng: pLng, rating: p.rating,
                  tipos: p.types || [],
                  distancia: haversine(lat, lng, pLat, pLng),
                });
              }
            });
          }
          resolve();
        });
      });
    }

    resultados.sort((a, b) => (a.distancia || 0) - (b.distancia || 0));
    const lista = resultados.slice(0, 20);

    try {
      if (lista.length > 0) {
        const destinos = lista.map(e => new window.google.maps.LatLng(e.lat, e.lng));
        const distMatrix = new window.google.maps.DistanceMatrixService();

        const CHUNK = 25;
        for (let ci = 0; ci < destinos.length; ci += CHUNK) {
          const chunk = destinos.slice(ci, ci + CHUNK);
          await new Promise<void>(resolve => {
            distMatrix.getDistanceMatrix(
              {
                origins: [center],
                destinations: chunk,
                travelMode: window.google.maps.TravelMode.DRIVING,
              },
              (response: any, status: string) => {
                if (status === 'OK' && response?.rows?.[0]) {
                  response.rows[0].elements.forEach((el: any, i: number) => {
                    const idx = ci + i;
                    if (el.status === 'OK' && lista[idx]) {
                      lista[idx].duracao   = el.duration.text;
                      lista[idx].distancia = parseFloat((el.distance.value / 1000).toFixed(1));
                    }
                  });
                }
                resolve();
              }
            );
          });
        }

        lista.sort((a, b) => (a.distancia || 0) - (b.distancia || 0));
      }
    } catch (e) {
      console.warn('[Sustenta] DistanceMatrix falhou (usando haversine):', e);
    }

    setEcopontos(lista);

    lista.forEach(eco => {
      const marker = new window.google.maps.Marker({
        position: { lat: eco.lat, lng: eco.lng },
        map: mapInstanceRef.current, icon: criarIconeEcoponto(false),
        title: eco.name, animation: window.google.maps.Animation.DROP,
      });
      marker.addListener('click', () => abrirEcoponto(eco.place_id));
      marcadoresRef.current.set(eco.place_id, marker);
    });

    setLoadingEco(false);
  };

  const abrirEcoponto = React.useCallback((place_id: string) => {
    const lista = ecopontosRef.current;
    const pos   = userPosRef.current;
    const eco   = lista.find(e => e.place_id === place_id);
    if (!eco || !pos || !mapInstanceRef.current) return;

    marcadoresRef.current.forEach((m, id) => m.setIcon(criarIconeEcoponto(id === place_id)));
    setEcopontoAtivo(eco);
    setLoadingRota(true);
    setRota(null);
    setAbaPainel('ecopontos');
    setPainelAberto(true);

    const marker = marcadoresRef.current.get(place_id);
    if (infoWindowRef.current && marker) {
      infoWindowRef.current.setContent(`
        <div style="background:#0d1520;color:#e2e8f0;padding:10px 14px;border-radius:10px;font-family:system-ui;min-width:160px;border:1px solid rgba(16,185,129,0.3)">
          <p style="font-weight:800;font-size:13px;margin:0 0 4px;color:#34d399">${eco.name}</p>
          <p style="font-size:11px;margin:0;color:#94a3b8">${eco.vicinity}</p>
          <div style="display:flex;gap:8px;margin-top:6px">
            ${eco.distancia != null ? `<span style="font-size:11px;color:#10b981;font-weight:700">📍 ${eco.distancia} km</span>` : ''}
            ${eco.duracao ? `<span style="font-size:11px;color:#10b981;font-weight:700">⏱ ${eco.duracao}</span>` : ''}
          </div>
        </div>
      `);
      infoWindowRef.current.open(mapInstanceRef.current, marker);
    }

    const dirService = new window.google.maps.DirectionsService();
    direcaoRef.current.setMap(mapInstanceRef.current);
    dirService.route(
      {
        origin:      { lat: pos.lat, lng: pos.lng },
        destination: { lat: eco.lat, lng: eco.lng },
        travelMode:  window.google.maps.TravelMode.DRIVING,
      },
      (result: any, status: string) => {
        if (status === 'OK') {
          direcaoRef.current.setDirections(result);
          const leg = result.routes[0].legs[0];
          setRota({
            distancia: leg.distance.text,
            duracao:   leg.duration.text,
            passos:    leg.steps.slice(0, 6).map((s: any) => s.instructions.replace(/<[^>]+>/g, '')),
          });
        }
        setLoadingRota(false);
      }
    );
  }, []);

  const limparRota = () => {
    setEcopontoAtivo(null); setRota(null);
    if (direcaoRef.current) direcaoRef.current.setMap(null);
    if (infoWindowRef.current) infoWindowRef.current.close();
    marcadoresRef.current.forEach(m => m.setIcon(criarIconeEcoponto(false)));
  };

  const estadoAtivoInfo    = estadoAtivo ? estadosInfo[estadoAtivo] : null;
  const ecopontosFiltrados = ecopontos.filter(e =>
    e.name.toLowerCase().includes(buscaEco.toLowerCase()) ||
    e.vicinity.toLowerCase().includes(buscaEco.toLowerCase())
  );

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 120px)', minHeight: 600 }}>

      {!googlePronto && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950 rounded-3xl z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            <p className="text-sm text-emerald-400 font-bold">Carregando mapa...</p>
          </div>
        </div>
      )}

      <div ref={mapDivRef} className="absolute inset-0 rounded-3xl overflow-hidden" style={{ zIndex: 0 }} />

      <div className="absolute top-0 left-0 right-0 h-28 pointer-events-none rounded-t-3xl"
        style={{ background: 'linear-gradient(to bottom, rgba(2,6,23,0.75) 0%, transparent 100%)', zIndex: 1 }} />

      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-4" style={{ zIndex: 2 }}>
        <div>
          <h1 className="text-xl font-black text-white">Mapa Sustentavel</h1>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#34d399' }}>
            {loadingEco ? 'Buscando ecopontos...' :
             userPos && ecopontos.length > 0 ? `${ecopontos.length} ecopontos${nomeCidade ? ` em ${nomeCidade}` : ''}` :
             userPos && !loadingEco ? 'Nenhum ecoponto encontrado - tente atualizar' :
             'Explore o indice de sustentabilidade por estado'}
          </p>
        </div>
        <button onClick={pegarLocalizacao} disabled={loadingPos}
          className="flex items-center gap-2 px-4 py-2.5 font-bold text-sm rounded-xl transition-all active:scale-95 disabled:opacity-60"
          style={{ background: 'rgba(16,185,129,0.9)', color: '#fff', backdropFilter: 'blur(8px)', boxShadow: '0 0 20px rgba(16,185,129,0.35)' }}>
          {loadingPos ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
          {loadingPos ? 'Localizando...' : userPos ? 'Atualizar' : 'Encontrar Ecopontos'}
        </button>
      </div>

      <div className="absolute bottom-6 left-5 rounded-2xl overflow-hidden shadow-2xl"
        style={{ width: 160, zIndex: 2, background: 'rgba(10,15,26,0.88)', border: '1px solid rgba(16,185,129,0.25)', backdropFilter: 'blur(12px)' }}>
        <div className="px-3 py-1.5 border-b" style={{ borderColor: 'rgba(16,185,129,0.15)' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#34d399' }}>Score por Estado</p>
        </div>
        <div ref={containerRef} className="relative p-1">
          {loadingMapa ? <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 text-emerald-500 animate-spin" /></div> : <svg ref={svgRef} className="w-full" />}
          {tooltip && (
            <div className="pointer-events-none absolute z-20 rounded-xl px-3 py-1.5 text-xs shadow-2xl"
              style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -120%)', whiteSpace: 'nowrap', background: 'rgba(2,6,23,0.97)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <p className="font-black text-white">{NOME_POR_SIGLA[tooltip.sigla] || tooltip.sigla}</p>
              <p className={`font-bold ${scoreColor(tooltip.score)}`}>Score {tooltip.score} - {scoreLabel(tooltip.score)}</p>
            </div>
          )}
        </div>
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {[{ cor: '#10b981', label: '>=85' }, { cor: '#22c55e', label: '>=75' }, { cor: '#84cc16', label: '>=65' }, { cor: '#eab308', label: '>=55' }, { cor: '#ef4444', label: '<55' }].map(item => (
            <div key={item.label} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: item.cor }} />
              <span style={{ fontSize: 9, color: '#64748b', fontWeight: 700 }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute top-16 right-5 bottom-6 flex flex-col gap-3" style={{ width: 320, zIndex: 2 }}>

        <div className="flex rounded-2xl p-1 gap-1"
          style={{ background: 'rgba(10,15,26,0.88)', border: '1px solid rgba(16,185,129,0.2)', backdropFilter: 'blur(16px)' }}>
          {([
            { id: 'estado',    label: 'Estado',    icon: MapPin  },
            { id: 'ecopontos', label: 'Ecopontos', icon: Recycle },
            { id: 'ranking',   label: 'Ranking',   icon: Trophy  },
          ] as const).map(aba => (
            <button key={aba.id} onClick={() => { setAbaPainel(aba.id); setPainelAberto(true); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all"
              style={abaPainel === aba.id ? { background: 'rgba(16,185,129,0.9)', color: '#fff' } : { color: '#64748b' }}>
              <aba.icon className="w-3.5 h-3.5" />{aba.label}
            </button>
          ))}
        </div>

        <div className="flex-1 rounded-2xl overflow-hidden flex flex-col"
          style={{ background: 'rgba(10,15,26,0.88)', border: '1px solid rgba(16,185,129,0.2)', backdropFilter: 'blur(16px)' }}>

          <button onClick={() => setPainelAberto(p => !p)}
            className="flex items-center justify-between px-4 py-2.5 border-b transition-colors hover:bg-white/5"
            style={{ borderColor: 'rgba(16,185,129,0.15)' }}>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#34d399' }}>
              {abaPainel === 'estado' ? (estadoAtivoInfo ? estadoAtivoInfo.nome : 'Selecione um estado') :
               abaPainel === 'ecopontos' ? `${ecopontos.length} Ecopontos` : 'Ranking Nacional'}
            </span>
            {painelAberto ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          <AnimatePresence>
            {painelAberto && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden flex-1">
                <AnimatePresence mode="wait">

                  {abaPainel === 'estado' && (
                    <motion.div key="estado" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                      {!estadoAtivoInfo ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                            <MapPin className="w-6 h-6 text-emerald-500" />
                          </div>
                          <p className="text-sm font-bold text-slate-400">Clique em um estado</p>
                          <p className="text-xs text-slate-500 leading-relaxed max-w-[180px]">No mini mapa para ver o score de sustentabilidade.</p>
                          {meuEstado && estadosInfo[meuEstado] && (
                            <button onClick={() => setEstadoAtivo(meuEstado)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
                              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}>
                              <Leaf className="w-3.5 h-3.5" /> Ver meu estado ({meuEstado})
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-black text-white">{estadoAtivoInfo.nome}</h3>
                              <p className="text-xs text-slate-500 mt-0.5">#{rankingEstados.findIndex(e => e.sigla === estadoAtivo) + 1} no ranking</p>
                            </div>
                            <button onClick={() => setEstadoAtivo(null)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: '#64748b' }}><X className="w-4 h-4" /></button>
                          </div>
                          <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2">Score</p>
                            <div className={`text-4xl font-black ${scoreColor(estadoAtivoInfo.score)}`}>{estadoAtivoInfo.score}</div>
                            <p className={`text-sm font-bold mt-1 ${scoreColor(estadoAtivoInfo.score)}`}>{scoreLabel(estadoAtivoInfo.score)}</p>
                            <div className="w-full h-1.5 rounded-full mt-3 overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                              <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${estadoAtivoInfo.score}%` }} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { label: 'Usuarios', value: estadoAtivoInfo.totalUsuarios.toLocaleString('pt-BR') },
                              { label: 'Media/mes', value: `R$ ${estadoAtivoInfo.mediaConsumo}` },
                              { label: 'Seu consumo', value: meuConsumo > 0 ? `R$ ${Math.round(meuConsumo)}` : '' },
                              { label: 'vs. media', value: meuConsumo > 0 ? `${meuConsumo < estadoAtivoInfo.mediaConsumo ? 'v' : '^'} ${Math.abs(Math.round(((meuConsumo - estadoAtivoInfo.mediaConsumo) / estadoAtivoInfo.mediaConsumo) * 100))}%` : '' },
                            ].map(item => (
                              <div key={item.label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{item.label}</p>
                                <p className="text-sm font-black text-white">{item.value || ''}</p>
                              </div>
                            ))}
                          </div>
                          {meuConsumo > 0 && meuConsumo < estadoAtivoInfo.mediaConsumo && (
                            <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                              <TrendingDown className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              <p className="text-xs text-emerald-300 font-medium">Voce consome menos que a media deste estado!</p>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {abaPainel === 'ecopontos' && (
                    <motion.div key="ecopontos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col">
                      {!userPos && !loadingEco ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center gap-3 px-4">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                            <Recycle className="w-6 h-6 text-emerald-500" />
                          </div>
                          <p className="text-sm font-bold text-slate-400">Nenhuma localizacao</p>
                          <p className="text-xs text-slate-500 leading-relaxed max-w-[200px]">Clique em "Encontrar Ecopontos" para buscar pontos na sua cidade.</p>
                        </div>
                      ) : loadingEco ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-3">
                          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                          <p className="text-xs text-slate-400">Buscando ecopontos na cidade...</p>
                        </div>
                      ) : (
                        <>
                          <div className="p-3 border-b" style={{ borderColor: 'rgba(16,185,129,0.15)' }}>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                              <input type="text" value={buscaEco} onChange={e => setBuscaEco(e.target.value)}
                                placeholder={`Buscar nos ${ecopontos.length} ecopontos...`}
                                className="w-full pl-8 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-600"
                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }} />
                            </div>
                          </div>

                          <div className="overflow-y-auto flex-1" style={{ maxHeight: ecopontoAtivo ? 'calc(100vh - 500px)' : 'calc(100vh - 320px)' }}>
                            {ecopontosFiltrados.length === 0 ? (
                              <div className="py-8 text-center">
                                <p className="text-xs text-slate-500">Nenhum ecoponto encontrado.</p>
                                <button onClick={() => userPos && buscarEcopontos(userPos.lat, userPos.lng)}
                                  className="mt-3 text-xs font-bold px-4 py-2 rounded-xl transition-all"
                                  style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}>
                                  Tentar novamente
                                </button>
                              </div>
                            ) : ecopontosFiltrados.map(eco => {
                              const { label, icon: Icon } = tipoPonto(eco.tipos);
                              const ativo = ecopontoAtivo?.place_id === eco.place_id;
                              return (
                                <button key={eco.place_id} onClick={() => abrirEcoponto(eco.place_id)}
                                  className="w-full flex items-start gap-3 p-3.5 text-left transition-all"
                                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: ativo ? 'rgba(16,185,129,0.12)' : 'transparent', borderLeft: ativo ? '2px solid #10b981' : '2px solid transparent' }}>
                                  <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center mt-0.5"
                                    style={{ background: ativo ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(16,185,129,0.25)' }}>
                                    <Icon className="w-4 h-4 text-emerald-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold truncate" style={{ color: ativo ? '#34d399' : '#e2e8f0' }}>{eco.name}</p>
                                    <p className="text-[10px] truncate mt-0.5" style={{ color: '#64748b' }}>{eco.vicinity}</p>
                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}>{label}</span>
                                      {eco.distancia != null && <span className="text-[10px] font-bold" style={{ color: '#10b981' }}>📍 {eco.distancia} km</span>}
                                      {eco.duracao && <span className="flex items-center gap-0.5 text-[10px] font-bold" style={{ color: '#94a3b8' }}><Clock className="w-2.5 h-2.5" /> {eco.duracao}</span>}
                                      {eco.rating && <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-400"><Star className="w-2.5 h-2.5" />{eco.rating}</span>}
                                    </div>
                                  </div>
                                  <Route className="w-4 h-4 shrink-0 mt-1 transition-colors" style={{ color: ativo ? '#10b981' : '#334155' }} />
                                </button>
                              );
                            })}
                          </div>

                          <AnimatePresence>
                            {ecopontoAtivo && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-t" style={{ borderColor: 'rgba(16,185,129,0.2)' }}>
                                <div className="p-4" style={{ background: 'rgba(16,185,129,0.07)' }}>
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Route className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                      <p className="text-xs font-black text-emerald-300 truncate">{ecopontoAtivo.name}</p>
                                    </div>
                                    <button onClick={limparRota} className="ml-2 shrink-0" style={{ color: '#64748b' }}><X className="w-3.5 h-3.5" /></button>
                                  </div>
                                  {loadingRota ? (
                                    <div className="flex items-center gap-2 text-xs text-emerald-400"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Calculando rota...</div>
                                  ) : rota ? (
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-emerald-300 px-2 py-1 rounded-lg" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}>📍 {rota.distancia}</span>
                                        <span className="text-xs font-black text-emerald-300 px-2 py-1 rounded-lg" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}>⏱ {rota.duracao}</span>
                                      </div>
                                      <a href={`https://www.google.com/maps/dir/?api=1&origin=${userPos?.lat},${userPos?.lng}&destination=${ecopontoAtivo.lat},${ecopontoAtivo.lng}&travelmode=driving`}
                                        target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 w-full justify-center py-2 rounded-xl text-xs font-bold"
                                        style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}>
                                        <ExternalLink className="w-3 h-3" /> Abrir no Google Maps
                                      </a>
                                      <div className="space-y-1">
                                        {rota.passos.map((p, i) => (
                                          <div key={i} className="flex items-start gap-1.5 text-[10px] text-emerald-400">
                                            <ChevronRight className="w-3 h-3 shrink-0 mt-0.5" /><span className="leading-relaxed">{p}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-400">Nao foi possivel calcular a rota.</p>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      )}
                    </motion.div>
                  )}

                  {abaPainel === 'ranking' && (
                    <motion.div key="ranking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                        {rankingEstados.map((est, i) => (
                          <button key={est.sigla} onClick={() => { setEstadoAtivo(est.sigla); setAbaPainel('estado'); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: est.sigla === estadoAtivo ? 'rgba(16,185,129,0.1)' : est.sigla === meuEstado ? 'rgba(13,148,136,0.08)' : 'transparent' }}>
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                              style={{ background: i === 0 ? 'rgba(251,191,36,0.15)' : i === 1 ? 'rgba(148,163,184,0.1)' : i === 2 ? 'rgba(251,146,60,0.15)' : 'rgba(255,255,255,0.05)', color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#fb923c' : '#475569' }}>
                              {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                <p className="text-xs font-bold text-slate-200 truncate">{est.nome}</p>
                                {est.sigla === meuEstado && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(13,148,136,0.2)', border: '1px solid rgba(13,148,136,0.3)', color: '#2dd4bf' }}>Voce</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                  <div className="h-full rounded-full" style={{ width: `${est.score}%`, background: est.corHex }} />
                                </div>
                                <span className={`text-[10px] font-black shrink-0 ${scoreColor(est.score)}`}>{est.score}</span>
                              </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: '#334155' }} />
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};