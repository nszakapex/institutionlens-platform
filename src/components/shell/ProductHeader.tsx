import Link from "next/link";
import { LensMark } from "@/components/svg/LensMark";
import { PrimaryNavigation } from "@/components/shell/PrimaryNavigation";
import { MobileNavigation } from "@/components/shell/MobileNavigation";
import { StatusBadge } from "@/components/status/StatusBadge";

type Props = {
  currentPath: string;
  workspaceLabel?: string;
};

export function ProductHeader({
  currentPath,
  workspaceLabel = "Andrew Davidson research workspace",
}: Props) {
  return (
    <header className="il-product-header">
      <div className="il-product-header-inner">
        <div className="il-brand-cluster">
          <Link href="/app" className="il-wordmark">
            <LensMark className="il-wordmark-mark" width={28} height={28} />
            <span>InstitutionLens</span>
          </Link>
          <StatusBadge tone="info">Synthetic demo</StatusBadge>
        </div>

        <div className="il-header-desktop">
          <PrimaryNavigation currentPath={currentPath} />
        </div>

        <div className="il-header-utilities">
          <p className="il-workspace-context">
            <span className="il-eyebrow">Workspace</span>
            <span className="il-workspace-label">{workspaceLabel}</span>
          </p>
          <MobileNavigation />
        </div>
      </div>
    </header>
  );
}
