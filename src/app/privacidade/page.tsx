import { PublicPage, publicMetadata } from "@/components/PublicPage";

export const metadata = publicMetadata("/privacidade");

export default function Page() {
  return <PublicPage path="/privacidade" />;
}
