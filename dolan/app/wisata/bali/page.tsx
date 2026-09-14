import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

export default function WisataBaliRedirectPage() {
  redirect(ROUTES.province("bali"));
}
