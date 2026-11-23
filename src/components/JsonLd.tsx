export function JsonLd({ data }: { data: unknown }) {
  // escapa "<" para não fechar a tag <script> por acidente
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
