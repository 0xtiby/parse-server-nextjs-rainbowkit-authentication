import {
  RainbowKitAuthenticationProvider,
  createAuthenticationAdapter,
} from "@rainbow-me/rainbowkit";

import { useAuth, useSession } from "parse-server-nextjs/client";
import { useRouter } from "next/navigation";
import React, { type ReactNode, useMemo, useState, useEffect } from "react";
import type { Address } from "viem";
import { type SiweMessage, createSiweMessage, parseSiweMessage } from "viem/siwe";

type UnconfigurableMessageOptions = {
  address: Address;
  chainId: number;
  nonce: string;
  expirationTime: Date;
};

type ConfigurableMessageOptions = Partial<
  Omit<SiweMessage, keyof UnconfigurableMessageOptions>
> & {
  [_Key in keyof UnconfigurableMessageOptions]?: never;
};

export type GetSiweMessageOptions = () => ConfigurableMessageOptions;

interface RainbowKitSiweNextAuthProviderProps {
  enabled?: boolean;
  getSiweMessageOptions?: GetSiweMessageOptions;
  children: ReactNode;
  shouldRedirect?: boolean;
  redirectUrl?: string;
}

interface SiweResponseData {
  siwe: {
    nonce: string;
    expirationTime: string;
  };
}

export function ParseNextAuthRainbowKitAuthProvider({
  children,
  enabled,
  getSiweMessageOptions,
  shouldRedirect = false,
  redirectUrl = "/",
}: RainbowKitSiweNextAuthProviderProps) {
  const { challenge, login, logout } = useAuth();
  const { status: parseStatus, setSession } = useSession();
  const [rainbowKitStatus, setRainbowKitStatus] = useState<
    "loading" | "authenticated" | "unauthenticated"
  >("loading");

  const router = useRouter();

  // Sync RainbowKit status with Parse status
  useEffect(() => {
    if (parseStatus === "loading") {
      setRainbowKitStatus("loading");
    } else if (parseStatus === "authenticated") {
      setRainbowKitStatus("authenticated");
    } else {
      setRainbowKitStatus("unauthenticated");
    }
  }, [parseStatus]);

  const adapter = useMemo(
    () =>
      createAuthenticationAdapter({
        createMessage: ({ address, chainId, nonce: authDataStringified }) => {
          const defaultConfigurableOptions: Required<
            Pick<ConfigurableMessageOptions, "domain" | "uri" | "version" | "statement">
          > = {
            domain: window.location.host,
            statement: "Siwe Authentication xxxx",
            uri: window.location.origin,
            version: "1",
          };

          const { nonce, expirationTime } = JSON.parse(authDataStringified);

          const unconfigurableOptions: UnconfigurableMessageOptions = {
            address,
            chainId,
            nonce,
            expirationTime: new Date(expirationTime),
          };

          return createSiweMessage({
            ...defaultConfigurableOptions,
            // Spread custom SIWE message options provided by the consumer
            ...getSiweMessageOptions?.(),
            // Spread unconfigurable options last so they can't be overridden
            ...unconfigurableOptions,
          });
        },
        getNonce: async () => {
          const response = await challenge({
            siwe: {
              responseType: "nonce-expiration",
            },
          });

          if (!response.success) {
            throw new Error(response.error?.message);
          }
          const { siwe } = (response as any).challengeData as SiweResponseData;

          return JSON.stringify(siwe);
        },

        signOut: async () => {
          // Only logout if we're not in loading state and actually authenticated
          if (rainbowKitStatus !== "loading" && parseStatus === "authenticated") {
            await logout();
            setRainbowKitStatus("unauthenticated");
          }
        },

        verify: async ({ message, signature }) => {
          const { nonce, address } = parseSiweMessage(message);
          const response = await login("third-party", {
            providerName: "siwe",
            authData: { message, signature, nonce, id: address },
          });

          if (response.success) {
            setSession((response as any).session as any);
            setRainbowKitStatus("authenticated");
            if (shouldRedirect) {
              router.push(redirectUrl);
            }
          } else {
            setRainbowKitStatus("unauthenticated");
          }

          return response.success;
        },
      }),
    [getSiweMessageOptions, rainbowKitStatus, parseStatus]
  );

  return (
    <RainbowKitAuthenticationProvider
      adapter={adapter}
      enabled={enabled}
      status={rainbowKitStatus}
    >
      {children}
    </RainbowKitAuthenticationProvider>
  );
}
