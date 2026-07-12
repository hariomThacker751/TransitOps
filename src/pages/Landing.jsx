import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import { motion } from 'framer-motion'
import { useNavigate, Navigate } from 'react-router-dom'
import { Truck, ArrowRight, Activity, ShieldCheck, Zap } from 'lucide-react'
import { APP } from '@/utils/constants'
import { useAuth } from '@/context/AuthContext'

// Simple helper to generate random points within a sphere
const generateSpherePoints = (count, radius) => {
  const buffer = new Float32Array(count * 3)
  for (let i = 0; i < buffer.length; i += 3) {
    const u = Math.random()
    const v = Math.random()
    const theta = 2 * Math.PI * u
    const phi = Math.acos(2 * v - 1)
    const r = Math.cbrt(Math.random()) * radius
    buffer[i] = r * Math.sin(phi) * Math.cos(theta)
    buffer[i + 1] = r * Math.sin(phi) * Math.sin(theta)
    buffer[i + 2] = r * Math.cos(phi)
  }
  return buffer
}

function Starfield(props) {
  const ref = useRef()
  // Generate 5000 points (5000 * 3 float values)
  const sphere = useMemo(() => generateSpherePoints(5000, 1.5), [])
  
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 10
      ref.current.rotation.y -= delta / 15
    }
  })
  
  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={sphere} stride={3} frustumCulled={false} {...props}>
        <PointMaterial transparent color="#4F46E5" size={0.005} sizeAttenuation={true} depthWrite={false} />
      </Points>
    </group>
  )
}

function Scene() {
  return (
    <div className="absolute inset-0 z-0 bg-ink-950">
      <Canvas camera={{ position: [0, 0, 1] }}>
        <Starfield />
      </Canvas>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink-950/80 to-ink-950" />
    </div>
  )
}

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
}

export default function Landing() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="relative min-h-screen bg-ink-950 text-white overflow-hidden font-sans">
      <Scene />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 shadow-[0_0_20px_rgba(79,70,229,0.5)]">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">{APP.name}</span>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] ring-focus"
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 pt-32 text-center lg:px-12 lg:pt-48">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="max-w-4xl"
        >
          <motion.div variants={fadeUp} className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-sm font-medium text-brand-300 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500"></span>
            </span>
            Next-Gen Fleet Operations
          </motion.div>
          
          <motion.h1 variants={fadeUp} className="mb-8 text-5xl font-extrabold tracking-tight sm:text-7xl lg:text-8xl">
            Command Your Fleet <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-indigo-400 to-purple-400">
              With Precision.
            </span>
          </motion.h1>
          
          <motion.p variants={fadeUp} className="mx-auto mb-10 max-w-2xl text-lg text-ink-300 sm:text-xl">
            The rules-driven operations console designed for modern logistics. Real-time dispatching, automated compliance, and intelligent maintenance guardrails.
          </motion.p>
          
          <motion.div variants={fadeUp} className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={() => navigate('/login')}
              className="group flex items-center gap-2 rounded-full bg-brand-600 px-8 py-4 text-base font-semibold text-white shadow-[0_0_30px_rgba(79,70,229,0.4)] transition-all hover:bg-brand-500 hover:shadow-[0_0_40px_rgba(79,70,229,0.6)] ring-focus"
            >
              Access Console
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          </motion.div>
        </motion.div>

        {/* Feature Bento Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="mt-32 grid w-full max-w-6xl grid-cols-1 gap-6 pb-24 md:grid-cols-3"
        >
          <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-md transition-all hover:border-brand-500/50 hover:bg-white/10">
            <div className="mb-6 inline-flex rounded-2xl bg-brand-500/20 p-4">
              <Activity className="h-6 w-6 text-brand-400" />
            </div>
            <h3 className="mb-3 text-xl font-bold">Real-Time Dispatch</h3>
            <p className="text-ink-400 leading-relaxed text-sm">Instantly route vehicles with our deterministic rules engine. No more double bookings or expired licenses slipping through.</p>
          </div>
          
          <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-md transition-all hover:border-purple-500/50 hover:bg-white/10">
            <div className="mb-6 inline-flex rounded-2xl bg-purple-500/20 p-4">
              <ShieldCheck className="h-6 w-6 text-purple-400" />
            </div>
            <h3 className="mb-3 text-xl font-bold">Intelligent Guardrails</h3>
            <p className="text-ink-400 leading-relaxed text-sm">Proactive maintenance locks and safety checks ensure your fleet is always compliant and road-ready before dispatch.</p>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-md transition-all hover:border-indigo-500/50 hover:bg-white/10">
            <div className="mb-6 inline-flex rounded-2xl bg-indigo-500/20 p-4">
              <Zap className="h-6 w-6 text-indigo-400" />
            </div>
            <h3 className="mb-3 text-xl font-bold">Automated Workflows</h3>
            <p className="text-ink-400 leading-relaxed text-sm">From automatic fuel logging to background cron jobs checking driver eligibility, TransitOps works while you sleep.</p>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
