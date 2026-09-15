import { socialHandleFromUrl } from "@/lib/contracts";
import { Icon } from "@/components/ui/Icon";

type ProfileSocialLinksProps = {
  instagramUrl: string | null;
  tiktokUrl: string | null;
  className?: string;
  compact?: boolean;
};

export function ProfileSocialLinks({
  instagramUrl,
  tiktokUrl,
  className = "",
  compact = false,
}: ProfileSocialLinksProps) {
  if (!instagramUrl && !tiktokUrl) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {instagramUrl ? (
        <SocialChip
          href={instagramUrl}
          icon="instagram"
          label={compact ? "Instagram" : `@${socialHandleFromUrl(instagramUrl)}`}
        />
      ) : null}
      {tiktokUrl ? (
        <SocialChip
          href={tiktokUrl}
          icon="tiktok"
          label={compact ? "TikTok" : `@${socialHandleFromUrl(tiktokUrl)}`}
        />
      ) : null}
    </div>
  );
}

function SocialChip({
  href,
  icon,
  label,
}: {
  href: string;
  icon: "instagram" | "tiktok";
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/60 bg-white px-2.5 py-1 type-caption font-semibold text-on-surface hover:border-primary/40 hover:bg-primary-fixed hover:text-primary"
    >
      <Icon name={icon} className="text-[15px]" />
      {label}
    </a>
  );
}
