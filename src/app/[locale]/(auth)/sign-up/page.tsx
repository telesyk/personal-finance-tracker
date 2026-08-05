import { SignUpForm } from './sign-up-form'

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const { invite } = await searchParams
  return <SignUpForm inviteToken={invite} />
}
