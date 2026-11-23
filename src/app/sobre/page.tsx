import { PublicPage, publicMetadata } from "@/components/PublicPage";

export const metadata = publicMetadata("/sobre");

export default function Page() {
  return <PublicPage path="/sobre" />;
}
