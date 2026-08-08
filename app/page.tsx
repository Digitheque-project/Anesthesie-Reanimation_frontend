import { redirect } from 'next/navigation';

// Redirige vers /bloc en conservant la query string : le SSO central redirige ici avec
// ?accessToken=... après connexion, ce paramètre doit survivre à la redirection.
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') qs.set(key, value);
  }
  const suffix = qs.toString();
  redirect(suffix ? `/bloc?${suffix}` : '/bloc');
}
