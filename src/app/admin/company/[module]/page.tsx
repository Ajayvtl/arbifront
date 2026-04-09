"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import PlaceholderPage from "@/components/PlaceholderPage";

function toTitleCase(input: string) {
  return input
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function CompanyModulePlaceholderPage() {
  const params = useParams<{ module: string }>();
  const title = useMemo(() => {
    const moduleName = String(params?.module || "module");
    return `Company Admin ${toTitleCase(moduleName)}`;
  }, [params]);

  return <PlaceholderPage title={title} />;
}
