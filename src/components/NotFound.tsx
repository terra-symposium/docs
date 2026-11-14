/**
 * src/components/NotFound.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// COMPONENTS
import { Badge, ButtonLink, Card, CardContent, CardDescription, CardFooter, CardHeader, CardHeading } from '@terra-symposium/styling/ui/terra-original';

// TYPES
import type { JSX } from 'react';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Renders a themed not-found page with a link back to the host's home route.
 *
 * @param appName Host name displayed in the return link.
 * @param homeHref Route linked by the return action.
 * @param description Explanation shown below the not-found title.
 *
 * @return Themed not-found page element.
 */
export function DocsNotFound({
	appName = 'Terra Docs',
	homeHref = '/',
	description = 'The page may have moved, or the link may be out of date.',
}: {
	appName?: string;
	homeHref?: string;
	description?: string;
}): JSX.Element {
	return (
		<main className='terra-docs-workspace flex items-center justify-center bg-background px-5 text-primary-12'>
			<Card variant='primary-outline' size='sm' className='w-full text-center sm:max-w-lg'>
				<CardHeader className='items-center text-center'>
					<Badge variant='primary' size='sm' rounded='md' aria-label='Error 404'>
						404
					</Badge>
					<CardHeading as='h1' className='font-serif text-4xl italic tracking-tight'>
						Page not found
					</CardHeading>
				</CardHeader>
				<CardContent className='text-center'>
					<CardDescription className='text-base leading-relaxed'>{description}</CardDescription>
				</CardContent>
				<CardFooter className='justify-center'>
					<ButtonLink href={homeHref} variant='primary-tonal' size='sm'>
						Return to {appName}
					</ButtonLink>
				</CardFooter>
			</Card>
		</main>
	);
}
