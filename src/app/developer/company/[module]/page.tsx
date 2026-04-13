import { redirect } from "next/navigation";

export default async function DeveloperCompanyModuleAliasPage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  redirect(`/admin/company/${encodeURIComponent(module)}`);
}
