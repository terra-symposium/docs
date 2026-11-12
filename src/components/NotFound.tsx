/**
 * src/components/NotFound.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// COMPONENTS
import {
  Badge,
  ButtonLink,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardHeading,
} from '@terra-symposium/styling/ui';

// TYPES
import type { JSX } from 'react';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Shows a themed 404 card that returns visitors to the host application's home page.
 *
 * @param appName - Product name used in the return-link label.
 * @param homeHref - Destination for the return link.
 * @param description - Explanation shown below the not-found heading.
 * @returns The styled 404 page with the host-specific return link.
 */
export function DocsNotFound({
  appName = 'Docs',
  homeHref = '/',
  description = 'The page may have moved, or the link may be out of date.',
}: {
  appName?: string;
  homeHref?: string;
  description?: string;
}): JSX.Element {
  return (
    <div className="docs-theme-scope">
      <main className="docs-workspace flex min-h-screen items-center justify-center bg-background px-5 py-12 text-primary-12">
        <Card variant="primary-outline" size="sm" className="w-full text-center sm:max-w-lg">
          <CardHeader className="items-center text-center">
            <Badge variant="destructive-default" size="sm" rounded="md" aria-label="Error 404">
              404
            </Badge>
            <CardHeading as="h1" className="font-serif text-4xl italic tracking-tight">
              Page not found
            </CardHeading>
          </CardHeader>
          <CardContent className="text-center">
            <CardDescription className="text-base leading-relaxed">{description}</CardDescription>
          </CardContent>
          <CardFooter className="justify-center">
            <ButtonLink href={homeHref} variant="primary-tonal" size="sm">
              Return to {appName}
            </ButtonLink>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
