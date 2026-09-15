import { Link } from "@tanstack/react-router"

import { cn } from "@/lib/utils"
import icon from "/assets/images/moonwake-icon.png"
import logo from "/assets/images/horilogo.svg"

interface LogoProps {
  variant?: "full" | "icon" | "responsive"
  className?: string
  asLink?: boolean
}

export function Logo({
  variant = "full",
  className,
  asLink = true,
}: LogoProps) {
  const content =
    variant === "responsive" ? (
      <>
        <img
          src={logo}
          alt="Moonwake Coffee Roasters"
          className={cn(
            "h-16 w-auto mx-auto group-data-[collapsible=icon]:hidden",
            className,
          )}
        />
        <img
          src={icon}
          alt="Moonwake Coffee Roasters"
          className={cn(
            "size-5 hidden group-data-[collapsible=icon]:block",
            className,
          )}
        />
      </>
    ) : (
      <img
        src={variant === "full" ? logo : icon}
        alt="Moonwake Coffee Roasters"
        className={cn(
          variant === "full" ? "h-8 w-auto mx-auto" : "size-5",
          className,
        )}
      />
    )

  if (!asLink) {
    return content
  }

  return <Link to="/">{content}</Link>
}
