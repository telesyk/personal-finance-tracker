import { SignInForm } from './sign-in-form'

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const { invite } = await searchParams
  return <SignInForm inviteToken={invite} />
}
