import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, UploadCloud } from 'lucide-react'
import Button from '../ui/Button'

export default function CTA() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl bg-brand-gradient px-6 py-16 text-center shadow-glow sm:px-16"
        >
          <div className="absolute inset-0 opacity-30 [background:radial-gradient(500px_300px_at_50%_0,white,transparent)]" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to transform your interview process?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">
              Join thousands of teams making smarter, fairer hiring decisions with AI.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/register">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 hover:shadow-none">
                  Get Started Free
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/upload">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/40 bg-white/10 text-white hover:bg-white/20"
                >
                  <UploadCloud className="h-5 w-5" />
                  Upload Interview
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
