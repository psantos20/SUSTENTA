import { defineConfig, loadEnv } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Serve as funções da pasta netlify/functions durante o `npm run dev`.
 * Em produção elas rodam na Netlify (/.netlify/functions/<nome>); localmente o
 * Vite não conhece essa rota, então este plugin faz a ponte. Assim as notícias
 * (e a dica de IA) funcionam sem precisar do Netlify CLI.
 *
 * As chaves secretas (NEWS_API_KEY, ANTHROPIC_API_KEY...) são lidas do .env,
 * mas só no servidor do Vite: variáveis sem o prefixo VITE_ nunca vão para o navegador.
 */
function netlifyFunctionsDev(mode: string): Plugin {
  const PREFIXO = "/.netlify/functions/";

  return {
    name: "netlify-functions-dev",
    apply: "serve",
    configureServer(server) {
      const env = loadEnv(mode, process.cwd(), "");
      for (const [chave, valor] of Object.entries(env)) {
        if (!chave.startsWith("VITE_") && process.env[chave] === undefined) {
          process.env[chave] = valor;
        }
      }
      // Reaproveita o projeto do Firebase já configurado para o front-end.
      if (!process.env.FIREBASE_PROJECT_ID && env.VITE_FIREBASE_PROJECT_ID) {
        process.env.FIREBASE_PROJECT_ID = env.VITE_FIREBASE_PROJECT_ID;
      }

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        if (!url.pathname.startsWith(PREFIXO)) return next();

        const nome = decodeURIComponent(url.pathname.slice(PREFIXO.length));
        if (!/^[a-z0-9-]+$/i.test(nome)) {
          res.statusCode = 404;
          res.end("Função não encontrada.");
          return;
        }

        try {
          const corpo = await new Promise<string>((resolve, reject) => {
            const partes: Buffer[] = [];
            req.on("data", (p: Buffer) => partes.push(p));
            req.on("end", () => resolve(Buffer.concat(partes).toString("utf-8")));
            req.on("error", reject);
          });

          const mod = await server.ssrLoadModule(`/netlify/functions/${nome}.js`);
          const resultado = await mod.handler(
            {
              httpMethod: req.method ?? "GET",
              headers: req.headers,
              queryStringParameters: Object.fromEntries(url.searchParams),
              body: corpo || null,
            },
            {}
          );

          res.statusCode = resultado.statusCode;
          for (const [k, v] of Object.entries(resultado.headers ?? {})) {
            res.setHeader(k, String(v));
          }
          res.end(resultado.body ?? "");
        } catch (e) {
          console.error(`[netlify-functions-dev] ${nome}:`, e);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ status: "error", message: "Função indisponível localmente." }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), netlifyFunctionsDev(mode)],
}));
