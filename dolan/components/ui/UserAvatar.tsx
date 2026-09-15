import { Icon } from "@/components/ui/Icon";

type UserAvatarProps = {
  src?: string | null;
  alt?: string;
  className?: string;
  iconClassName?: string;
};

export function UserAvatar({
  src,
  alt = "",
  className = "",
  iconClassName = "text-[20px]",
}: UserAvatarProps) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} className={`object-cover ${className}`} src={src} />
    );
  }

  return (
    <span
      className={`flex items-center justify-center bg-surface-container-high text-on-surface-variant ${className}`}
      aria-hidden={alt ? undefined : true}
      aria-label={alt || undefined}
    >
      <Icon name="person" className={iconClassName} />
    </span>
  );
}
