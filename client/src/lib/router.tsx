"use client";

import { useMemo } from "react";
import NextLink from "next/link";
import { useParams as useNextParams, usePathname, useRouter } from "next/navigation";

export function useLocation(): [string, (to: string) => void] {
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  return [
    pathname,
    (to: string) => {
      if (to === pathname) return;
      router.push(to);
    },
  ];
}

export function useParams<
  T extends Record<string, string | undefined> = Record<string, string | undefined>,
>() {
  const params = useNextParams<Record<string, string | string[]>>();

  return useMemo(
    () =>
      Object.fromEntries(
        Object.entries(params ?? {}).map(([key, value]) => [
          key,
          Array.isArray(value) ? value[0] : value,
        ]),
      ) as T,
    [params],
  );
}

type LinkProps = React.ComponentProps<typeof NextLink>;

export function Link({ href, ...props }: LinkProps) {
  return <NextLink href={href} {...props} />;
}
