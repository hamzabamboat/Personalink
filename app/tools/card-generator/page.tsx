import type { Metadata } from 'next'
import { CardTool } from './card-tool'

export const metadata: Metadata = {
  title: 'Free LinkedIn Quote Card Generator (No Watermark) | PersonaLink',
  description: 'Turn any line into a clean, branded LinkedIn quote, stat, title, or list card — free, no signup, no watermark. Download as a PNG and post in seconds.',
  alternates: { canonical: '/tools/card-generator' },
  openGraph: {
    title: 'Free LinkedIn Quote Card Generator (No Watermark)',
    description: 'Turn any line into a clean, branded LinkedIn card — free, no signup, no watermark.',
    url: '/tools/card-generator',
    type: 'website',
  },
}

export default function CardGeneratorPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="text-center mb-10">
        <div className="text-[12px] font-bold tracking-wider text-[#2B4DFF] uppercase mb-2">Free tool</div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">LinkedIn quote card generator</h1>
        <p className="text-slate-500 mt-3 max-w-2xl mx-auto">
          Turn any line into a crisp, professional LinkedIn graphic — quote, stat, title, or list. Free, no signup, and <strong>no watermark</strong>. Edit on the left, download on the right.
        </p>
      </div>
      <CardTool />
      <p className="text-center text-[12px] text-slate-400 mt-12">
        Built by <a href="/" className="underline hover:text-slate-600">PersonaLink</a> — the LinkedIn growth tool for founders. Cards here use a sample style; inside the app they use <em>your</em> brand colours, logo, and font.
      </p>
    </main>
  )
}
