import React, { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface RawProps {
  codarea?: string;
  cod?: string;
  sigla?: string;
  nome?: string;
  SIGLA_UF?: string;
  NM_ESTADO?: string;
  [key: string]: string | undefined;
}

interface EstadoFeature {
  sigla: string;
  nome: string;
  codarea: string;
}

interface TooltipState {
  x: number;
  y: number;
  sigla: string;
  nome: string;
}

interface Cidade {
  id: number;
  nome: string;
}

interface MapaBrasilProps {
  estadoSelecionado?: string;
  cidadeSelecionada?: string;
  onEstadoClick?: (sigla: string) => void;
  onCidadeChange?: (cidade: string) => void;
  className?: string;
}

// ─── Dados estáticos — sigla e nome por código IBGE ──────────────────────────
// Garante funcionamento mesmo se a API não retornar metadados

const ESTADOS_POR_CODIGO: Record<string, { sigla: string; nome: string }> = {
  "11": { sigla: "RO", nome: "Rondônia" },
  "12": { sigla: "AC", nome: "Acre" },
  "13": { sigla: "AM", nome: "Amazonas" },
  "14": { sigla: "RR", nome: "Roraima" },
  "15": { sigla: "PA", nome: "Pará" },
  "16": { sigla: "AP", nome: "Amapá" },
  "17": { sigla: "TO", nome: "Tocantins" },
  "21": { sigla: "MA", nome: "Maranhão" },
  "22": { sigla: "PI", nome: "Piauí" },
  "23": { sigla: "CE", nome: "Ceará" },
  "24": { sigla: "RN", nome: "Rio Grande do Norte" },
  "25": { sigla: "PB", nome: "Paraíba" },
  "26": { sigla: "PE", nome: "Pernambuco" },
  "27": { sigla: "AL", nome: "Alagoas" },
  "28": { sigla: "SE", nome: "Sergipe" },
  "29": { sigla: "BA", nome: "Bahia" },
  "31": { sigla: "MG", nome: "Minas Gerais" },
  "32": { sigla: "ES", nome: "Espírito Santo" },
  "33": { sigla: "RJ", nome: "Rio de Janeiro" },
  "35": { sigla: "SP", nome: "São Paulo" },
  "41": { sigla: "PR", nome: "Paraná" },
  "42": { sigla: "SC", nome: "Santa Catarina" },
  "43": { sigla: "RS", nome: "Rio Grande do Sul" },
  "50": { sigla: "MS", nome: "Mato Grosso do Sul" },
  "51": { sigla: "MT", nome: "Mato Grosso" },
  "52": { sigla: "GO", nome: "Goiás" },
  "53": { sigla: "DF", nome: "Distrito Federal" },
};

const NOME_POR_SIGLA: Record<string, string> = Object.fromEntries(
  Object.values(ESTADOS_POR_CODIGO).map(({ sigla, nome }) => [sigla, nome])
);

const CODIGO_POR_SIGLA: Record<string, number> = {
  RO: 11, AC: 12, AM: 13, RR: 14, PA: 15, AP: 16, TO: 17,
  MA: 21, PI: 22, CE: 23, RN: 24, PB: 25, PE: 26, AL: 27, SE: 28, BA: 29,
  MG: 31, ES: 32, RJ: 33, SP: 35,
  PR: 41, SC: 42, RS: 43,
  MS: 50, MT: 51, GO: 52, DF: 53,
};

// ─── URLs IBGE ───────────────────────────────────────────────────────────────

const TOPOJSON_URL =
  "https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/json&qualidade=intermediaria&intrarregiao=UF";

// ─── Componente ──────────────────────────────────────────────────────────────

const MapaBrasil: React.FC<MapaBrasilProps> = ({
  estadoSelecionado,
  cidadeSelecionada,
  onEstadoClick,
  onCidadeChange,
  className = "",
}) => {
  const svgRef       = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tooltip,        setTooltip]        = useState<TooltipState | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [geoData,        setGeoData]        = useState<GeoJSON.FeatureCollection | null>(null);

  const [cidades,        setCidades]        = useState<Cidade[]>([]);
  const [loadingCidades, setLoadingCidades] = useState(false);
  const [buscaCidade,    setBuscaCidade]    = useState("");

  // ─── Resolve sigla/nome de um feature bruto ───────────────────────────────
  const resolveEstado = (props: RawProps): EstadoFeature => {
    // Tenta sigla direta
    const siglaDir = props.sigla || props.SIGLA_UF || "";

    // Tenta nome direto
    const nomeDir = props.nome || props.NM_ESTADO || "";

    // Código da área (o IBGE usa codarea = "11", "12", etc.)
    const cod = (props.codarea || props.cod || "").replace(/^0+/, "");

    if (cod && ESTADOS_POR_CODIGO[cod]) {
      return { ...ESTADOS_POR_CODIGO[cod], codarea: cod };
    }
    if (siglaDir && NOME_POR_SIGLA[siglaDir]) {
      return { sigla: siglaDir, nome: NOME_POR_SIGLA[siglaDir], codarea: cod };
    }
    if (nomeDir) {
      const found = Object.values(ESTADOS_POR_CODIGO).find(
        (e) => e.nome.toLowerCase() === nomeDir.toLowerCase()
      );
      if (found) return { ...found, codarea: cod };
    }
    return { sigla: siglaDir || cod, nome: nomeDir || siglaDir || cod, codarea: cod };
  };

  // ─── Carrega GeoJSON/TopoJSON do IBGE ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(TOPOJSON_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const rawJson = await response.json();

        let features: GeoJSON.Feature[] = [];

        if (rawJson.type === "Topology") {
          const topo = rawJson as Topology;
          const objectKey = Object.keys(topo.objects)[0];
          const collection = topojson.feature(
            topo,
            topo.objects[objectKey] as GeometryCollection
          ) as GeoJSON.FeatureCollection;
          features = collection.features;
        } else if (rawJson.type === "FeatureCollection") {
          features = rawJson.features;
        } else {
          throw new Error("Formato desconhecido");
        }

        // Loga as props do primeiro feature para diagnóstico futuro
        if (features.length > 0) {
          console.log("[MapaBrasil] props do primeiro feature:", features[0].properties);
        }

        // Normaliza cada feature com sigla + nome garantidos
        const normalized: GeoJSON.Feature[] = features.map((f) => {
          const raw = (f.properties ?? {}) as RawProps;
          const estado = resolveEstado(raw);
          return { ...f, properties: { ...raw, sigla: estado.sigla, nome: estado.nome } };
        });

        if (!cancelled) {
          setGeoData({ type: "FeatureCollection", features: normalized });
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[MapaBrasil] Erro ao carregar:", err);
          setError("Não foi possível carregar o mapa.");
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, []);

  // ─── Carrega municípios quando o estado muda ──────────────────────────────
  useEffect(() => {
    if (!estadoSelecionado) {
      setCidades([]);
      setBuscaCidade("");
      return;
    }

    const codigoUF = CODIGO_POR_SIGLA[estadoSelecionado];
    if (!codigoUF) return;

    let cancelled = false;
    const fetchCidades = async () => {
      setLoadingCidades(true);
      setBuscaCidade("");
      try {
        const res = await fetch(
          `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${codigoUF}/municipios?orderBy=nome`
        );
        const data: Array<{ id: number; nome: string }> = await res.json();
        if (!cancelled) setCidades(data.map((d) => ({ id: d.id, nome: d.nome })));
      } catch {
        if (!cancelled) setCidades([]);
      } finally {
        if (!cancelled) setLoadingCidades(false);
      }
    };

    fetchCidades();
    return () => { cancelled = true; };
  }, [estadoSelecionado]);

  // ─── Renderiza o mapa com D3 ──────────────────────────────────────────────
  const renderMap = useCallback(() => {
    if (!svgRef.current || !containerRef.current || !geoData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width } = containerRef.current.getBoundingClientRect();
    if (!width) return;
    const height = width * 1.08;
    svg.attr("width", width).attr("height", height);

    const projection = d3.geoMercator().fitSize([width, height], geoData);
    const pathGen    = d3.geoPath().projection(projection);

    const defs   = svg.append("defs");
    const filter = defs
      .append("filter")
      .attr("id", "sombra")
      .attr("x", "-20%").attr("y", "-20%")
      .attr("width", "140%").attr("height", "140%");
    filter.append("feDropShadow")
      .attr("dx", 0).attr("dy", 1)
      .attr("stdDeviation", 2)
      .attr("flood-color", "rgba(0,0,0,0.2)");

    const g = svg.append("g");

    const fillFor   = (sigla: string) => sigla === estadoSelecionado ? "#16a34a" : "#bbf7d0";
    const strokeFor = (sigla: string) => sigla === estadoSelecionado ? 1.5 : 0.5;

    // ── Paths ──────────────────────────────────────────────────────────────
    const paths = g
      .selectAll<SVGPathElement, GeoJSON.Feature>("path.estado")
      .data(geoData.features)
      .join("path")
      .attr("class", "estado")
      .attr("d", (d) => pathGen(d) ?? "")
      .attr("fill",         (d) => fillFor((d.properties as { sigla: string }).sigla))
      .attr("stroke",       "#15803d")
      .attr("stroke-width", (d) => strokeFor((d.properties as { sigla: string }).sigla))
      .attr("filter",       (d) =>
        (d.properties as { sigla: string }).sigla === estadoSelecionado
          ? "url(#sombra)" : "none"
      )
      .style("cursor", "pointer")
      .style("opacity", 0);

    paths
      .transition().duration(500).delay((_, i) => i * 12)
      .style("opacity", 1);

    paths
      .on("mouseenter", function (_ev: MouseEvent, d: GeoJSON.Feature) {
        const { sigla, nome } = d.properties as { sigla: string; nome: string };
        if (sigla !== estadoSelecionado) {
          d3.select(this).attr("fill", "#4ade80").attr("stroke-width", 1);
        }

        // Posição: centróide do estado no SVG → coordenadas relativas ao container
        const [cx, cy]      = pathGen.centroid(d);
        const svgRect       = svgRef.current!.getBoundingClientRect();
        const contRect      = containerRef.current!.getBoundingClientRect();
        const scaleX        = svgRect.width  / width;
        const scaleY        = svgRect.height / height;

        setTooltip({
          x: cx * scaleX + (svgRect.left - contRect.left),
          y: cy * scaleY + (svgRect.top  - contRect.top),
          sigla,
          nome: nome || NOME_POR_SIGLA[sigla] || sigla,
        });
      })
      .on("mouseleave", function (_ev: MouseEvent, d: GeoJSON.Feature) {
        const { sigla } = d.properties as { sigla: string };
        d3.select(this)
          .attr("fill",         fillFor(sigla))
          .attr("stroke-width", strokeFor(sigla));
        setTooltip(null);
      })
      .on("click", function (_ev: MouseEvent, d: GeoJSON.Feature) {
        const { sigla } = d.properties as { sigla: string };
        if (sigla) onEstadoClick?.(sigla);
      });

    // ── Labels de sigla ────────────────────────────────────────────────────
    g.selectAll<SVGTextElement, GeoJSON.Feature>("text.lbl")
      .data(geoData.features)
      .join("text")
      .attr("class", "lbl")
      .attr("x", (d) => pathGen.centroid(d)[0])
      .attr("y", (d) => pathGen.centroid(d)[1])
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-family", "system-ui, sans-serif")
      .attr("font-size", (d) => {
        const a = pathGen.area(d);
        if (a > 8000) return "11px";
        if (a > 3000) return "9px";
        if (a > 800)  return "7px";
        return "5.5px";
      })
      .attr("font-weight", (d) =>
        (d.properties as { sigla: string }).sigla === estadoSelecionado ? "700" : "600"
      )
      .attr("fill", (d) =>
        (d.properties as { sigla: string }).sigla === estadoSelecionado ? "#fff" : "#166534"
      )
      .style("pointer-events", "none")
      .style("user-select", "none")
      .style("opacity", 0)
      .transition().duration(400).delay((_, i) => 350 + i * 10)
      .style("opacity", 1)
      .selection()
      .text((d) => (d.properties as { sigla: string }).sigla || "");

  }, [geoData, estadoSelecionado, onEstadoClick]);

  useEffect(() => { renderMap(); }, [renderMap]);

  useEffect(() => {
    const obs = new ResizeObserver(() => renderMap());
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [renderMap]);

  // ─── Cidades filtradas ────────────────────────────────────────────────────
  const cidadesFiltradas = cidades.filter((c) =>
    c.nome.toLowerCase().includes(buscaCidade.toLowerCase())
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col gap-4 ${className}`}>

      {/* Mapa */}
      <div ref={containerRef} className="relative w-full" style={{ minHeight: 220 }}>

        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-emerald-700 font-medium">Carregando mapa...</span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-red-500 text-center px-4">{error}</p>
          </div>
        )}

        <svg
          ref={svgRef}
          className="w-full"
          style={{ display: loading || error ? "none" : "block" }}
        />

        {/* Tooltip no centróide do estado */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 bg-white border border-emerald-200 rounded-lg shadow-lg px-3 py-1.5 text-sm font-medium text-emerald-800 flex items-center gap-2"
            style={{
              left: tooltip.x,
              top:  tooltip.y,
              transform: "translate(-50%, -130%)",
              whiteSpace: "nowrap",
            }}
          >
            <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
              {tooltip.sigla}
            </span>
            {tooltip.nome}
          </div>
        )}
      </div>

      {/* Badge do estado selecionado */}
      {estadoSelecionado && !loading && (
        <div className="flex justify-center">
          <div className="px-3 py-1 bg-emerald-100 rounded-full text-sm font-semibold text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
            <span className="text-emerald-500">✓</span>
            {NOME_POR_SIGLA[estadoSelecionado] || estadoSelecionado}
            <span className="text-emerald-400 text-xs">({estadoSelecionado})</span>
          </div>
        </div>
      )}

      {/* Seleção de cidade */}
      {estadoSelecionado && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700">
            Cidade em{" "}
            <span className="text-emerald-700 font-semibold">
              {NOME_POR_SIGLA[estadoSelecionado] || estadoSelecionado}
            </span>:
          </label>

          {loadingCidades ? (
            <div className="flex items-center gap-2 px-4 py-3 border border-slate-200 rounded-xl bg-white text-sm text-slate-400">
              <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              Carregando cidades...
            </div>
          ) : (
            <>
              {/* Campo de busca */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar cidade..."
                  value={buscaCidade}
                  onChange={(e) => setBuscaCidade(e.target.value)}
                  className="w-full px-4 py-2.5 pr-9 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm bg-white text-slate-900 transition-all"
                />
                {buscaCidade && (
                  <button
                    type="button"
                    onClick={() => setBuscaCidade("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xl leading-none"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Lista de cidades filtradas */}
              {buscaCidade && cidadesFiltradas.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                  {cidadesFiltradas.map((cidade) => (
                    <button
                      key={cidade.id}
                      type="button"
                      onClick={() => {
                        onCidadeChange?.(cidade.nome);
                        setBuscaCidade(cidade.nome);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-slate-50 last:border-0
                        ${cidadeSelecionada === cidade.nome
                          ? "bg-emerald-50 text-emerald-800 font-semibold"
                          : "text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      {cidade.nome}
                      {cidadeSelecionada === cidade.nome && (
                        <span className="float-right text-emerald-500">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {buscaCidade && cidadesFiltradas.length === 0 && (
                <p className="text-sm text-slate-400 px-1">
                  Nenhuma cidade encontrada para "{buscaCidade}"
                </p>
              )}

              {/* Cidade selecionada (quando não está digitando) */}
              {cidadeSelecionada && !buscaCidade && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-emerald-500">✓</span>
                  <span className="text-sm font-medium text-emerald-800">{cidadeSelecionada}</span>
                  <button
                    type="button"
                    onClick={() => { onCidadeChange?.(""); setBuscaCidade(""); }}
                    className="ml-auto text-emerald-400 hover:text-emerald-600 text-xs underline"
                  >
                    trocar
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MapaBrasil;
export { MapaBrasil };