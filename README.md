RainbowKit authentication provider for Parse Server with Next.js integration. This package provides a seamless integration between RainbowKit's SIWE (Sign-In with Ethereum) authentication and Parse Server authentication system.

**This package extends [parse-server-nextjs](https://github.com/0xtiby/parse-server-nextjs)** to add Web3/Ethereum authentication capabilities using RainbowKit and SIWE (Sign-In with Ethereum).

## Installation

```bash
npm install parse-server-nextjs-rainbowkit-authentication
# or
pnpm add parse-server-nextjs-rainbowkit-authentication
# or
yarn add parse-server-nextjs-rainbowkit-authentication
```

## Peer Dependencies

Make sure you have these dependencies installed in your project:

- `@rainbow-me/rainbowkit` >= 1.0.0
- `next` >= 13.0.0
- `parse-server-nextjs` >= 1.0.0
- `react` >= 18.0.0
- `viem` >= 1.0.0

## Usage

### Basic Setup

```typescript
"use client";
import "@rainbow-me/rainbowkit/styles.css";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { SessionProvider } from "parse-server-nextjs/client";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ParseNextAuthRainbowKitAuthProvider } from "parse-server-nextjs-rainbowkit-authentication";
import { mainnet } from "viem/chains";

const config = getDefaultConfig({
  appName: "Your App Name",
  projectId: "YOUR_WALLET_CONNECT_PROJECT_ID",
  chains: [mainnet],
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      enableColorScheme
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>
          <SessionProvider refreshInterval={60 * 1000}>
            <ParseNextAuthRainbowKitAuthProvider>
              <RainbowKitProvider>{children}</RainbowKitProvider>
            </ParseNextAuthRainbowKitAuthProvider>
          </SessionProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </NextThemesProvider>
  );
}
```

### Provider Props

```typescript
interface RainbowKitSiweNextAuthProviderProps {
  enabled?: boolean; // Enable/disable the auth provider
  getSiweMessageOptions?: GetSiweMessageOptions; // Custom SIWE message options
  children: ReactNode;
  shouldRedirect?: boolean; // Auto-redirect after successful auth
  redirectUrl?: string; // Redirect URL (default: "/")
  onAuthenticationComplete?: (session: any) => void; // Custom callback after successful auth
}
```

### Advanced Configuration

```typescript
import { ParseNextAuthRainbowKitAuthProvider } from "parse-server-nextjs-rainbowkit-authentication";

// Custom SIWE message options
const getSiweMessageOptions = () => ({
  statement: "Sign in to your custom app with your Ethereum wallet",
  domain: "your-domain.com",
  uri: "https://your-domain.com",
  version: "1",
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ParseNextAuthRainbowKitAuthProvider
        enabled={true}
        getSiweMessageOptions={getSiweMessageOptions}
        shouldRedirect={true}
        redirectUrl="/dashboard"
      >
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </ParseNextAuthRainbowKitAuthProvider>
    </SessionProvider>
  );
}
```

### Custom Authentication Handling

Use `onAuthenticationComplete` callback for custom post-authentication logic:

#### Basic Custom Redirect

```typescript
export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <SessionProvider>
      <ParseNextAuthRainbowKitAuthProvider
        onAuthenticationComplete={(session) => {
          // Custom redirect logic
          router.push("/welcome");
        }}
      >
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </ParseNextAuthRainbowKitAuthProvider>
    </SessionProvider>
  );
}
```

#### Handling Query Parameters (e.g., `?from`)

```typescript
export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <SessionProvider>
      <ParseNextAuthRainbowKitAuthProvider
        onAuthenticationComplete={(session) => {
          // Get redirect URL from query params
          const params = new URLSearchParams(window.location.search);
          const from = params.get("from") || "/dashboard";
          router.push(from);
        }}
      >
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </ParseNextAuthRainbowKitAuthProvider>
    </SessionProvider>
  );
}
```

#### Advanced Post-Authentication Logic

```typescript
export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <SessionProvider>
      <ParseNextAuthRainbowKitAuthProvider
        onAuthenticationComplete={(session) => {
          // Analytics tracking
          analytics.track("user_authenticated", {
            address: session.user.authData.siwe.address,
            timestamp: new Date().toISOString(),
          });

          // Custom redirect based on user state
          const params = new URLSearchParams(window.location.search);
          const from = params.get("from");
          const isNewUser = session.user.createdAt === session.user.updatedAt;

          if (from) {
            router.push(from);
          } else if (isNewUser) {
            router.push("/onboarding");
          } else {
            router.push("/dashboard");
          }
        }}
      >
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </ParseNextAuthRainbowKitAuthProvider>
    </SessionProvider>
  );
}
```

**Priority Logic:**

1. If `onAuthenticationComplete` is provided → Uses the callback (no automatic redirect)
2. Else if `shouldRedirect=true` → Automatic redirect to `redirectUrl`
3. Else → No redirect

## API Reference

### ParseNextAuthRainbowKitAuthProvider

The main authentication provider component that bridges RainbowKit SIWE authentication with Parse Server.

#### Props

- `enabled?: boolean` - Enable or disable the authentication provider (default: `true`)
- `getSiweMessageOptions?: () => ConfigurableMessageOptions` - Function to provide custom SIWE message options
- `children: ReactNode` - Child components to render
- `shouldRedirect?: boolean` - Whether to redirect after successful authentication (default: `false`)
- `redirectUrl?: string` - URL to redirect to after authentication (default: `"/"`)
- `onAuthenticationComplete?: (session: any) => void` - Custom callback function called after successful authentication. When provided, takes priority over automatic redirect.

#### Features

- ✅ Automatic synchronization between RainbowKit and Parse Server authentication states
- ✅ SIWE (Sign-In with Ethereum) message creation and verification
- ✅ Seamless integration with Parse Server's third-party authentication
- ✅ Customizable SIWE message options
- ✅ Auto-redirect functionality after successful authentication
- ✅ TypeScript support with full type safety

## Development

### Build

```bash
npm run build
```

### Setup Branch Protection

```bash
npm run setup:branch-protection
```

## License

MIT
