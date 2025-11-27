import eagleLogo from "@/assets/eagle-logo.png";
import { cn } from "@/lib/utils";

interface EagleLogoProps {
  size?: "small" | "medium" | "large" | "extra-large";
  className?: string;
}

const sizeClasses = {
  small: "h-10 w-10",
  medium: "h-16 w-16",
  large: "h-20 w-20",
  "extra-large": "h-24 w-24 md:h-28 md:w-28",
};

export const EagleLogo = ({ size = "medium", className }: EagleLogoProps) => {
  return (
    <img
      src={eagleLogo}
      alt="Eagle Report Logo"
      className={cn(sizeClasses[size], "object-contain", className)}
    />
  );
};
