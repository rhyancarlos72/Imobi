# Imobi Studio

App para imobiliárias, corretores e prestadores de serviço transformarem fotos de imóveis em vídeos com IA (Seedance, Kling), com mobília virtual, editor de vídeo e créditos pagos via Pix (Woovi ou Efí).

## O que tem

- **Cadastro com tipo de conta**: imobiliária, corretor(a) ou prestador de serviço. Ganha 10 créditos de teste.
- **Criar (6 etapas)**: tipo de vídeo → fotos → descrição → estilo visual → movimento de câmera → modelo, duração, som e versões. O botão **GERAR** mostra o custo em créditos antes de confirmar.
  - *Animar foto*, *Antes e depois* (mobília virtual com IA vira o último quadro) e *Transição entre fotos*.
- **Créditos**: o preço é sempre recalculado no servidor. O débito é atômico no banco e, **se a IA falhar, o crédito volta sozinho**.
- **Pix**: pacotes de créditos, QR Code + copia e cola, confirmação automática (webhook + consulta direta ao provedor, nunca confia só no webhook). Woovi e Efí, com fallback de um para o outro.
- **Galeria** com todas as gerações.
- **Editor**: linha do tempo com Texto, Vídeo e Música, dividir no cursor, cortar arrastando as bordas, reordenar, 8 curvas de velocidade (Constante, Impacto, Bullet time, Montagem, Flash, Acelerar, Desacelerar, Entrada rápida), fotos com movimento (zoom/panorâmica), textos animados, música com fade, marca automática (logo, WhatsApp, CRECI), cartão do imóvel (preço, quartos, vagas, m²), aviso “Imagem ilustrativa” em mobília virtual, formatos 9:16 / 16:9 / 1:1 / 4:5, desfazer/refazer, salvamento automático e **exportação em MP4 1080p no próprio navegador**.

## Rodar local

```bash
npm install
cp .env.example .env.local   # pode deixar vazio para o modo demonstração
npm run dev
```

Sem chaves, o app roda em **modo demonstração**: login, Pix e IA são simulados (precisa do `ffmpeg` instalado para simular os vídeos).

## Colocar em produção

1. **Supabase**: crie um projeto e rode `supabase/migrations/0001_init.sql` no SQL Editor. Copie URL, anon key e service role key para o `.env`.
   - Em *Authentication > URL Configuration* coloque `https://SEU-DOMINIO/auth/callback` nas Redirect URLs.
2. **fal.ai**: crie a chave em https://fal.ai/dashboard/keys e coloque em `FAL_KEY`.
   - Os modelos e preços ficam em `src/lib/models.ts`. **Confira o schema e o preço de cada endpoint no fal.ai antes de lançar**, porque mudam com frequência.
3. **Woovi**: crie o AppID e cadastre o webhook `https://SEU-DOMINIO/api/webhooks/woovi` (evento de cobrança paga).
4. **Efí** (opcional): gere o certificado .p12, converta para base64 e preencha as variáveis `EFI_*`. Depois cadastre o webhook uma vez:
   ```bash
   curl -X POST "https://SEU-DOMINIO/api/webhooks/efi/setup?secret=SEU_WEBHOOK_SECRET"
   ```
5. Deploy na Vercel (ou outro host Node). As rotas de geração usam até 60 s (`maxDuration`).

## Onde mexer

| O quê | Arquivo |
| --- | --- |
| Modelos de IA, endpoints e custo | `src/lib/models.ts` |
| Pacotes de créditos e fórmula de preço | `src/lib/pricing.ts` + `.env` |
| Movimentos de câmera, estilos, prompts | `src/lib/creative.ts` |
| Regras de geração, débito e reembolso | `src/lib/generation.ts` |
| Pix Woovi / Efí | `src/lib/payments/` |
| Motor do editor (desenho e exportação) | `src/lib/editor/engine.ts` |
| Banco de dados e segurança (RLS) | `supabase/migrations/0001_init.sql` |

## Publicar na Hostinger

O app é Next.js com servidor Node (não é site estático). Na Hostinger ele roda em:
- **Hospedagem com "Node.js Web App"** (planos Business ou Cloud): hPanel → *Websites* → *Adicionar site* → *Node.js Apps* → *Importar repositório do GitHub*; ou
- **VPS** (com Node 20+), rodando `npm ci && npm run build && npm start` atrás do Nginx/PM2.

Configuração no hPanel:

| Campo | Valor |
| --- | --- |
| Framework | Next.js |
| Versão do Node | 20 ou 22 |
| Comando de build | `npm run build` |
| Comando de início | `npm start` |
| Diretório | `/` (raiz) |

Variáveis de ambiente (copie do `.env.example`): no mínimo `NEXT_PUBLIC_APP_URL` (seu domínio com https), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FAL_KEY` e as do Pix (`WOOVI_APP_ID` e/ou `EFI_*`). Também as `NEXT_PUBLIC_*` de preço.
As variáveis `NEXT_PUBLIC_*` entram no build: depois de mudar alguma, faça um novo deploy.

Depois do primeiro deploy:
1. Supabase → *Authentication* → *URL Configuration*: *Site URL* = seu domínio e adicione `https://SEU-DOMINIO/auth/callback` nas *Redirect URLs*.
2. Woovi → webhook `https://SEU-DOMINIO/api/webhooks/woovi`.
3. Efí → `curl -X POST "https://SEU-DOMINIO/api/webhooks/efi/setup?secret=SEU_WEBHOOK_SECRET"`.
4. Crie uma conta no app e gere um vídeo de teste.
