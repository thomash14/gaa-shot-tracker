import SignupForm from '@/components/auth/SignupForm';

export default function SignupPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-primary-dark to-primary p-4 py-8">
      <div className="bg-surface rounded-2xl p-8 shadow-lg w-full max-w-md max-h-[95dvh] overflow-y-auto">
        <h1 className="text-2xl font-bold text-primary text-center mb-2">KICK ON</h1>
        <p className="text-text-muted text-center text-sm mb-6">GAA Shot Tracker</p>
        <SignupForm />
      </div>
    </div>
  );
}
