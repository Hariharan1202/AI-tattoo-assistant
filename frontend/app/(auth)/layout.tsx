export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[var(--surface)] border-r border-[var(--border)] flex-col items-center justify-center p-12">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[var(--accent)]/5 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-[var(--accent)]/3 blur-2xl" />
        </div>
        <div className="relative z-10 text-center max-w-sm">
          <div className="text-6xl mb-6">✦</div>
          <h1 className="text-4xl font-bold text-[var(--foreground)] mb-4 tracking-tight">
            Ink AI
          </h1>
          <p className="text-[var(--foreground-muted)] text-lg leading-relaxed">
            Your AI-powered tattoo studio. Discover styles, generate concepts, and bring your vision to life.
          </p>
          <div className="mt-10 flex flex-col gap-3 text-sm text-[var(--foreground-muted)]">
            {['Multimodal AI chat', 'Voice & image input', 'Style recommendations', 'Concept generation'].map((f) => (
              <div key={f} className="flex items-center gap-2 justify-center">
                <span className="text-[var(--accent)]">✦</span> {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8">
            <div className="text-4xl mb-2">✦</div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Ink AI</h1>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
