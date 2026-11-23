// Conteúdo das páginas públicas em Markdown: a mesma fonte vira HTML (para pessoas)
// e Markdown puro (para agentes de IA que pedem Accept: text/markdown).
import { AUDIENCE, FAQ, FEATURES, phoneDisplay, pricingList, site } from "./site";

function contactLines() {
  const lines: string[] = [];
  if (site.email) lines.push(`- E-mail: [${site.email}](mailto:${site.email})`);
  if (site.whatsapp) lines.push(`- WhatsApp: [${phoneDisplay(site.whatsapp)}](https://wa.me/${site.whatsapp})`);
  if (site.sameAs.length) lines.push(...site.sameAs.map((u) => `- ${new URL(u).hostname.replace(/^www\./, "")}: [${u}](${u})`));
  lines.push(`- Site: [${site.url}](${site.url})`);
  return lines.join("\n");
}

const company = () => site.legalName || site.name;

export function homeMarkdown() {
  return `# ${site.name}

${site.tagline}

${site.description}

## Para quem é
${AUDIENCE.map((a) => `- ${a}`).join("\n")}

## O que você pode fazer
${FEATURES.map((f) => `- **${f.name}:** ${f.text}`).join("\n")}

## Como funciona
1. Envie as fotos do imóvel (uma por cômodo).
2. Escolha o movimento de câmera, o estilo e a IA (Seedance ou Kling).
3. Receba os vídeos em poucos minutos, junte no editor com sua marca e publique.

## Preços
Créditos pré-pagos via Pix, sem mensalidade. Detalhes em [Preços](${site.url}/precos).

## Perguntas frequentes
${FAQ.map((f) => `### ${f.q}\n${f.a}`).join("\n\n")}

## Links
- [Criar conta grátis](${site.url}/cadastro)
- [Sobre](${site.url}/sobre)
- [Preços](${site.url}/precos)
- [Contato](${site.url}/contato)
- [Termos de uso](${site.url}/termos)
- [Política de privacidade](${site.url}/privacidade)
`;
}

export function pageMarkdown(path: string): { title: string; description: string; md: string } | null {
  switch (path) {
    case "/":
      return { title: `${site.name}: vídeos de imóveis com IA`, description: site.tagline, md: homeMarkdown() };
    case "/sobre":
      return {
        title: "Sobre o Imobi Studio",
        description: "Quem somos e por que criamos uma plataforma de vídeos com IA para o mercado imobiliário.",
        md: `# Sobre o ${site.name}

O ${site.name} é uma plataforma brasileira de produtividade e marketing imobiliário. Ajudamos imobiliárias, corretores e agências a transformar fotos de imóveis em vídeos profissionais para redes sociais e anúncios, sem precisar contratar editor nem dominar ferramentas complexas.

## O problema que resolvemos
Anunciar com vídeo chama mais atenção nas redes, mas produzir vídeo de cada imóvel toma tempo e custa caro. Com o ${site.name}, as fotos que você já tem viram vídeos com movimento de câmera em poucos minutos, com a sua identidade visual aplicada em todos.

## Para quem é
${AUDIENCE.map((a) => `- ${a}`).join("\n")}

## O que entregamos
${FEATURES.map((f) => `- **${f.name}:** ${f.text}`).join("\n")}

## Nosso compromisso
- Você vê o custo antes de gerar e os créditos voltam se a IA falhar.
- Vídeos com mobília virtual recebem o aviso “Imagem ilustrativa”.
- Não prometemos resultados de venda: entregamos praticidade, tempo e qualidade na divulgação.

Fale com a gente na página de [contato](${site.url}/contato).
`,
      };
    case "/precos":
      return {
        title: "Preços do Imobi Studio",
        description: "Créditos pré-pagos via Pix, sem mensalidade. Veja os pacotes e quanto custa cada vídeo.",
        md: `# Preços

Você compra créditos com Pix e usa quando quiser. **Sem mensalidade e os créditos não expiram.** O custo de cada vídeo aparece antes de gerar e, se a IA falhar, os créditos voltam.

## Pacotes de créditos
${pricingList().map((p) => `- **${p.name}:** ${p.credits} créditos por ${p.price}. ${p.description}.`).join("\n")}

## Quanto custa cada vídeo (5 segundos)
- Kling 3.0: 4 créditos
- Kling 3.0 Pro (1080p): 5 créditos
- Seedance 2.0 Fast: 6 créditos
- Seedance 2.0: 9 créditos
- Mobília virtual (1 foto): 1 crédito

Novos cadastros ganham créditos de teste. Valores sujeitos a alteração; o preço vigente aparece sempre dentro do app antes de gerar.

[Criar conta grátis](${site.url}/cadastro)
`,
      };
    case "/contato":
      return {
        title: "Contato",
        description: `Fale com o ${site.name}: suporte, dúvidas comerciais e planos para imobiliárias e agências.`,
        md: `# Contato

Dúvidas, suporte ou planos para imobiliárias e agências com volume? Fale com a gente:

${contactLines()}

Atendemos de segunda a sexta, em horário comercial.
`,
      };
    case "/termos":
      return {
        title: "Termos de uso",
        description: `Termos de uso da plataforma ${site.name}.`,
        md: `# Termos de uso

Última atualização: ${new Date(2026, 10, 22).toLocaleDateString("pt-BR")}

Estes termos regem o uso da plataforma ${site.name}, oferecida por ${company()}${site.cnpj ? `, CNPJ ${site.cnpj}` : ""}. Ao criar uma conta você concorda com eles.

## 1. O serviço
A plataforma gera vídeos e imagens a partir de fotos enviadas pelo usuário, usando modelos de inteligência artificial de terceiros, e oferece um editor de vídeo.

## 2. Conta
Você é responsável pelos dados informados, pela guarda da sua senha e pelas atividades na sua conta.

## 3. Créditos e pagamentos
- Os créditos são pré-pagos via Pix e não expiram.
- O custo de cada geração é exibido antes da confirmação.
- Se a geração falhar por problema técnico, os créditos são devolvidos automaticamente.
- Créditos já utilizados não são reembolsáveis. Pedidos de reembolso de créditos não utilizados seguem o Código de Defesa do Consumidor.

## 4. Conteúdo do usuário
Você declara ter direito de uso sobre as fotos enviadas e é responsável pelo conteúdo publicado. Os vídeos gerados pertencem a você.

## 5. Uso adequado e mobília virtual
É proibido usar a plataforma para conteúdo ilegal, enganoso ou que viole direitos de terceiros. Imagens com mobília virtual devem ser identificadas como ilustrativas nos anúncios.

## 6. Limitações
Os resultados da IA podem variar. Não garantimos resultados comerciais ou de vendas decorrentes do uso da plataforma.

## 7. Alterações
Podemos atualizar estes termos e avisaremos sobre mudanças relevantes.

## 8. Contato
Dúvidas: veja a página de [contato](${site.url}/contato).
`,
      };
    case "/privacidade":
      return {
        title: "Política de privacidade",
        description: `Como o ${site.name} coleta, usa e protege seus dados pessoais (LGPD).`,
        md: `# Política de privacidade

Última atualização: ${new Date(2026, 10, 22).toLocaleDateString("pt-BR")}

Esta política explica como ${company()} trata dados pessoais na plataforma ${site.name}, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).

## Dados que coletamos
- **Cadastro:** nome, e-mail, tipo de conta, empresa, CRECI e WhatsApp.
- **Conteúdo:** fotos, vídeos, músicas e logos que você envia, e os vídeos gerados.
- **Pagamentos:** registro das cobranças Pix (valor, status e identificador). Não armazenamos dados bancários.
- **Uso:** registros técnicos necessários para segurança e funcionamento.
- **Navegação e anúncios:** usamos o Pixel da Meta e a PayTracking para medir visitas e o resultado dos nossos anúncios. Eles podem usar cookies e um identificador anônimo salvo no seu navegador.

## Para que usamos
- Prestar o serviço: gerar e armazenar seus vídeos e aplicar sua marca.
- Processar pagamentos e manter o saldo de créditos.
- Suporte e comunicação sobre a sua conta.

## Com quem compartilhamos
Somente com fornecedores necessários ao serviço: hospedagem e banco de dados, provedores de IA que processam suas imagens para gerar os vídeos, o intermediador de pagamentos Pix e as ferramentas de medição de anúncios (Meta e PayTracking). Não vendemos dados pessoais.

## Seus direitos
Você pode pedir acesso, correção, portabilidade ou exclusão dos seus dados pela página de [contato](${site.url}/contato).

## Segurança e retenção
Usamos controle de acesso por usuário e conexões criptografadas. Mantemos os dados enquanto a conta estiver ativa ou conforme exigido por lei.
`,
      };
    default:
      return null;
  }
}
