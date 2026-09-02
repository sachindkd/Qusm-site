import { redirect } from "next/navigation";

export default function LoginPage() {
  redirect("/authorize?next=/admin");
}
