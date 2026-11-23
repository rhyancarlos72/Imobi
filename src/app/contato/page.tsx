import { PublicPage, publicMetadata } from "@/components/PublicPage";

export const metadata = publicMetadata("/contato");

export default function Page() {
  return <PublicPage path="/contato" />;
}
