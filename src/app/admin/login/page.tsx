import { redirect } from "next/navigation";

export default async function AdminLoginRedirect({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const qs = params.next
    ? `?next=${encodeURIComponent(params.next)}`
    : "?next=/admin";
  redirect(`/login${qs}`);
}
