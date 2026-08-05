import { getRequestConfig } from 'next-intl/server'
import { hasLocale } from 'next-intl'
import { routing } from './routing'

// Explicit map — Turbopack requires statically analysable import paths;
// a bare template-literal import causes "Can't resolve '<dynamic>'" at build time.
const messageLoaders: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  en: () => import('../messages/en.json'),
  uk: () => import('../messages/uk.json'),
  de: () => import('../messages/de.json'),
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale

  const messages = (await (messageLoaders[locale] ?? messageLoaders[routing.defaultLocale])()).default

  return { locale, messages }
})
