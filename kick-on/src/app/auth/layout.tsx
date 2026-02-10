export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth pages render without the sidebar/header shell
  return <>{children}</>;
}
