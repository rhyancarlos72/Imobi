import { PublicPage, publicMetadata } from "@/components/PublicPage";

export const metadata = publicMetadata("/termos");

export default function Page() {
  return <PublicPage path="/termos" />;
}
