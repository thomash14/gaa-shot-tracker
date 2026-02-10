import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-primary-dark to-primary p-4">
      <div className="bg-surface rounded-2xl p-8 shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-primary text-center mb-2">KICK ON</h1>
        <p className="text-text-muted text-center text-sm mb-6">GAA Shot Tracker</p>
        <LoginForm />
      </div>
    </div>
  );
}
