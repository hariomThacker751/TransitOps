import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import * as THREE from 'three'
import { motion } from 'framer-motion'
import { 
  ArrowRight, GitMerge, Lock, BarChart3, Database, 
  CarFront, User, Map, Wrench, Fuel, IndianRupee, FileText
} from 'lucide-react'

// Common reveal animation config
const reveal = {
  hidden: { opacity: 0, y: 32 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
  }
}

export default function Landing() {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    let reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // --- THREE.JS SCENE SETUP ---
    let scene, camera, renderer, truckGroup, sceneGroup
    let cards = [], particles
    let mouseX = 0, mouseY = 0
    let targetRotX = 0, targetRotY = 0
    let animationFrameId

    function makeCardTexture(label, value) {
      const c = document.createElement('canvas')
      c.width = 256
      c.height = 128
      const ctx = c.getContext('2d')
      
      // Card background
      ctx.fillStyle = 'rgba(15,23,42,0.85)'
      ctx.beginPath()
      ctx.roundRect(0, 0, 256, 128, 16)
      ctx.fill()
      
      // Border
      ctx.strokeStyle = 'rgba(99,102,241,0.35)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(1, 1, 254, 126, 15)
      ctx.stroke()
      
      // Value
      ctx.fillStyle = '#818cf8'
      ctx.font = 'bold 44px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(value, 128, 48)
      
      // Label
      ctx.fillStyle = '#94a3b8'
      ctx.font = '500 22px Inter, sans-serif'
      ctx.fillText(label, 128, 88)
      
      const tex = new THREE.CanvasTexture(c)
      tex.needsUpdate = true
      return tex
    }

    function buildTruck() {
      const g = new THREE.Group()
      const bodyMat = new THREE.MeshStandardMaterial({color: 0x4f46e5, emissive: 0x6366f1, emissiveIntensity: 0.4, metalness: 0.3, roughness: 0.4})
      const cabinMat = new THREE.MeshStandardMaterial({color: 0x4338ca, emissive: 0x6366f1, emissiveIntensity: 0.3, metalness: 0.3, roughness: 0.4})
      const wheelMat = new THREE.MeshStandardMaterial({color: 0x1e293b, metalness: 0.5, roughness: 0.6})
      const glassMat = new THREE.MeshStandardMaterial({color: 0x818cf8, emissive: 0x6366f1, emissiveIntensity: 0.5, transparent: true, opacity: 0.6})

      // Cargo box
      const cargo = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2, 2), bodyMat)
      cargo.position.set(-0.4, 0.5, 0)
      g.add(cargo)
      
      // Cabin
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.5, 1.9), cabinMat)
      cabin.position.set(1.9, 0.2, 0)
      g.add(cabin)
      
      // Windshield
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 1.7), glassMat)
      glass.position.set(2.55, 0.4, 0)
      g.add(glass)
      
      // Wheels
      const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 20)
      const positions = [[-1.2, -0.8, 1.1], [-1.2, -0.8, -1.1], [1.4, -0.8, 1.1], [1.4, -0.8, -1.1]]
      positions.forEach(pos => {
        const w = new THREE.Mesh(wheelGeo, wheelMat)
        w.rotation.x = Math.PI / 2
        w.position.set(pos[0], pos[1], pos[2])
        g.add(w)
      })
      
      // Headlight glow
      const lightMat = new THREE.MeshBasicMaterial({color: 0xa5b4fc})
      const lh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), lightMat)
      lh.position.set(2.6, 0.2, 0.7)
      g.add(lh)
      const lh2 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), lightMat)
      lh2.position.set(2.6, 0.2, -0.7)
      g.add(lh2)

      return g
    }

    function initThree() {
      scene = new THREE.Scene()
      camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100)
      camera.position.set(0, 1, 11)

      renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, alpha: true })
      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

      // Lights
      scene.add(new THREE.AmbientLight(0x6366f1, 0.5))
      const key = new THREE.DirectionalLight(0x818cf8, 1.2)
      key.position.set(5, 8, 6)
      scene.add(key)
      
      const rim = new THREE.DirectionalLight(0x4f46e5, 0.8)
      rim.position.set(-6, 2, -4)
      scene.add(rim)
      
      const point = new THREE.PointLight(0x6366f1, 1.5, 20)
      point.position.set(0, 2, 4)
      scene.add(point)

      sceneGroup = new THREE.Group()
      scene.add(sceneGroup)

      // Truck
      truckGroup = buildTruck()
      truckGroup.scale.set(0.85, 0.85, 0.85)
      sceneGroup.add(truckGroup)

      // Orbiting KPI cards
      const cardData = [
        { label: 'Vehicles', value: '16' },
        { label: 'Drivers', value: '18' },
        { label: 'Utilization', value: '31%' },
        { label: 'Alerts', value: '7' }
      ]
      
      cardData.forEach((data, i) => {
        const tex = makeCardTexture(data.label, data.value)
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true })
        const sprite = new THREE.Sprite(mat)
        sprite.scale.set(2.2, 1.1, 1)
        sprite.userData = {
          angle: (i / cardData.length) * Math.PI * 2,
          radius: 5.5,
          speed: 0.003
        }
        cards.push(sprite)
        sceneGroup.add(sprite)
      })

      // Particle starfield
      const pCount = 400
      const pGeo = new THREE.BufferGeometry()
      const pPos = new Float32Array(pCount * 3)
      for (let j = 0; j < pCount; j++) {
        pPos[j * 3]     = (Math.random() - 0.5) * 40
        pPos[j * 3 + 1] = (Math.random() - 0.5) * 25
        pPos[j * 3 + 2] = (Math.random() - 0.5) * 30 - 5
      }
      pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
      const pMat = new THREE.PointsMaterial({
        color: 0x818cf8, size: 0.06, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending
      })
      particles = new THREE.Points(pGeo, pMat)
      scene.add(particles)

      clock = 0
      animate()
    }

    let clock = 0
    function animate() {
      animationFrameId = requestAnimationFrame(animate)
      clock += 0.016

      if (!reduceMotion) {
        // Float bob
        sceneGroup.position.y = Math.sin(clock * 0.8) * 0.4
        // Slow Y rotation
        truckGroup.rotation.y += 0.005
        // Orbit cards
        cards.forEach(card => {
          card.userData.angle += card.userData.speed
          const a = card.userData.angle
          const r = card.userData.radius
          card.position.x = Math.cos(a) * r
          card.position.z = Math.sin(a) * r
          card.position.y = Math.sin(a * 2) * 0.8
        })
        // Particle drift
        particles.rotation.y += 0.0003
      }

      // Mouse parallax
      targetRotX += (mouseY * 0.14 - targetRotX) * 0.05
      targetRotY += (mouseX * 0.14 - targetRotY) * 0.05
      sceneGroup.rotation.x = THREE.MathUtils.clamp(targetRotX, -0.14, 0.14)
      sceneGroup.rotation.y = THREE.MathUtils.clamp(targetRotY, -0.14, 0.14)

      renderer.render(scene, camera)
    }

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    function onMouseMove(e) {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1
      mouseY = (e.clientY / window.innerHeight) * 2 - 1
    }

    initThree()
    window.addEventListener('resize', onResize)
    window.addEventListener('mousemove', onMouseMove)

    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMouseMove)
      cancelAnimationFrame(animationFrameId)
      renderer.dispose()
    }
  }, [])

  return (
    <div className="bg-[#020617] text-slate-200 min-h-screen overflow-x-hidden font-sans selection:bg-brand-500/30">
      
      {/* 1. HERO */}
      <section className="relative min-h-screen flex items-center justify-center text-center overflow-hidden bg-[radial-gradient(ellipse_80%_60%_at_50%_45%,rgba(99,102,241,0.18)_0%,transparent_70%)]">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0 pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl px-6 flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/25 font-mono text-xs text-brand-400 mb-7"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shadow-[0_0_8px_rgba(129,140,248,1)]"></span>
            TransitOps · Odoo Hackathon 2026
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-[clamp(36px,6vw,72px)] font-extrabold tracking-tight leading-[1.08] text-slate-50 mb-6"
          >
            Rules-Driven Fleet Operations,<br/>
            <span className="bg-gradient-to-br from-brand-300 via-brand-500 to-brand-600 bg-clip-text text-transparent">
              Without the Spreadsheet Chaos.
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-[clamp(16px,2vw,20px)] text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Dispatch validation, automatic status transitions, maintenance locking, and live KPI analytics — all enforced by a real business-rules engine.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <Link 
              to="/login" 
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-brand-600 text-white font-semibold text-[15px] transition-all hover:-translate-y-0.5 hover:bg-brand-500 shadow-[0_0_0_1px_rgba(99,102,241,0.12),0_8px_24px_-8px_rgba(99,102,241,0.35)] hover:shadow-[0_0_0_1px_rgba(99,102,241,0.3),0_12px_32px_-8px_rgba(99,102,241,0.5)]"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
            <Link 
              to="/login" 
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-transparent border border-brand-500/30 text-slate-200 font-semibold text-[15px] transition-all hover:-translate-y-0.5 hover:bg-brand-500/10 hover:border-brand-500"
            >
              View Demo
            </Link>
          </motion.div>
        </div>

        <motion.div 
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-slate-500 text-[13px]"
        >
          scroll to explore
        </motion.div>
      </section>

      {/* 2. STATS TICKER */}
      <div className="bg-[#0f172a] border-y border-brand-500/15 py-4 overflow-hidden whitespace-nowrap group">
        <div className="inline-flex gap-12 animate-[scroll-x_30s_linear_infinite] group-hover:[animation-play-state:paused] will-change-transform">
          {[...Array(2)].map((_, i) => (
            <React.Fragment key={i}>
              <span className="inline-flex items-center gap-2.5 font-mono text-[15px] text-slate-300">
                <span className="text-brand-400 font-semibold">16</span> Total Vehicles
              </span><span className="text-slate-700">·</span>
              <span className="inline-flex items-center gap-2.5 font-mono text-[15px] text-slate-300">
                <span className="text-brand-400 font-semibold">18</span> Drivers
              </span><span className="text-slate-700">·</span>
              <span className="inline-flex items-center gap-2.5 font-mono text-[15px] text-slate-300">
                <span className="text-brand-400 font-semibold">5</span> Active Trips
              </span><span className="text-slate-700">·</span>
              <span className="inline-flex items-center gap-2.5 font-mono text-[15px] text-slate-300">
                <span className="text-brand-400 font-semibold">31%</span> Fleet Utilization
              </span><span className="text-slate-700">·</span>
              <span className="inline-flex items-center gap-2.5 font-mono text-[15px] text-slate-300">
                <span className="text-brand-400 font-semibold">7</span> Safety Alerts
              </span><span className="text-slate-700">·</span>
              <span className="inline-flex items-center gap-2.5 font-mono text-[15px] text-slate-300">
                <span className="text-brand-400 font-semibold">₹85K</span> Monthly Fuel Cost
              </span><span className="text-slate-700">·</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 3. FEATURES GRID */}
      <section className="py-[120px] max-w-[1200px] mx-auto px-6 relative z-10">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={reveal}
        >
          <div className="font-mono text-[13px] tracking-[0.08em] uppercase text-brand-400 mb-4">Core Engine</div>
          <h2 className="text-[44px] font-extrabold tracking-tight leading-[1.15] text-slate-50 mb-4">
            Built on rules, not guesswork
          </h2>
          <p className="text-[18px] text-slate-400 max-w-[640px]">
            Every dispatch passes through a 13-check validation engine before a single wheel turns. No spreadsheets, no manual cross-referencing, no double-booked trucks.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-14">
          <FeatureCard 
            icon={<Database className="w-6 h-6" />}
            title="13-Rule Dispatch Engine"
            desc="Intelligent eligibility checks before every trip dispatch — license validity, vehicle status, cargo limits, and double-assignment prevention, all in one pass."
            delay={0}
          />
          <FeatureCard 
            icon={<GitMerge className="w-6 h-6" />}
            title="Atomic Status Sync"
            desc="Vehicle and driver statuses update together, atomically, in a single database transaction. Dispatch a trip and both flip to 'On Trip' — or neither does."
            delay={0.1}
          />
          <FeatureCard 
            icon={<Lock className="w-6 h-6" />}
            title="Maintenance Locking"
            desc="Vehicles in maintenance are automatically blocked from dispatch. The engine checks active maintenance records before allowing any trip to go out."
            delay={0.2}
          />
          <FeatureCard 
            icon={<BarChart3 className="w-6 h-6" />}
            title="Live KPI Analytics"
            desc="ROI, cost breakdown, fleet utilization — all live from the database. No exports, no stale snapshots, just real numbers the moment you load the dashboard."
            delay={0.3}
          />
        </div>
      </section>

      {/* 4. ROLE-BASED ACCESS */}
      <section className="py-[120px] bg-[#0f172a] relative z-10">
        <div className="max-w-[1200px] mx-auto px-6">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={reveal}
          >
            <div className="font-mono text-[13px] tracking-[0.08em] uppercase text-brand-400 mb-4">RBAC</div>
            <h2 className="text-[44px] font-extrabold tracking-tight leading-[1.15] text-slate-50 mb-4">
              Built for every team member
            </h2>
            <p className="text-[18px] text-slate-400 max-w-[640px]">
              Role-based access control means each user sees exactly what they need — and nothing they shouldn't. Four roles, one source of truth.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-14">
            <RoleCard letter="F" title="Fleet Manager" scope="fleet_manager" desc="Full access: vehicles, drivers, trips, dispatch, maintenance, expenses, and reports." gradient="from-brand-500 to-indigo-700" delay={0} />
            <RoleCard letter="D" title="Driver" scope="driver" desc="Trips, fuel logs, and expenses — focused on the road, not the back office." gradient="from-blue-500 to-blue-700" delay={0.1} />
            <RoleCard letter="S" title="Safety Officer" scope="safety_officer" desc="Drivers, maintenance oversight, and reports — keeping the fleet compliant and road-safe." gradient="from-amber-500 to-amber-700" delay={0.2} />
            <RoleCard letter="F" title="Financial Analyst" scope="financial_analyst" desc="Expenses, fuel logs, and reports — the numbers side of fleet operations, live." gradient="from-emerald-500 to-emerald-700" delay={0.3} />
          </div>
        </div>
      </section>

      {/* 5. MODULE SHOWCASE */}
      <section className="py-[120px] bg-[#0f172a] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
          backgroundImage: `repeating-linear-gradient(60deg, #6366f1 0, #6366f1 1px, transparent 1px, transparent 40px),
                            repeating-linear-gradient(-60deg, #6366f1 0, #6366f1 1px, transparent 1px, transparent 40px)`
        }}></div>
        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={reveal}
          >
            <div className="font-mono text-[13px] tracking-[0.08em] uppercase text-brand-400 mb-4">Modules</div>
            <h2 className="text-[44px] font-extrabold tracking-tight leading-[1.15] text-slate-50 mb-4">
              Everything your fleet needs
            </h2>
            <p className="text-[18px] text-slate-400 max-w-[640px]">
              Eight integrated modules covering the full operational lifecycle — from dispatch to settlement.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-14">
            <ModulePill icon={<BarChart3 />} label="Dashboard" delay={0} />
            <ModulePill icon={<CarFront />} label="Vehicles" delay={0.05} />
            <ModulePill icon={<User />} label="Drivers" delay={0.1} />
            <ModulePill icon={<Map />} label="Trips" delay={0.15} />
            <ModulePill icon={<Wrench />} label="Maintenance" delay={0.2} />
            <ModulePill icon={<Fuel />} label="Fuel Logs" delay={0.25} />
            <ModulePill icon={<IndianRupee />} label="Expenses" delay={0.3} />
            <ModulePill icon={<FileText />} label="Reports" delay={0.35} />
          </div>
        </div>
      </section>

      {/* 6. TECH TRUST BAR */}
      <section className="bg-[#020617] border-y border-white/5 py-10 relative z-10">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <div className="font-mono text-[12px] text-slate-500 uppercase tracking-widest mb-6">Powered by</div>
          <div className="flex flex-wrap justify-center gap-3">
            {['React', 'Vite', 'Node.js', 'Express', 'MySQL', 'JWT Auth'].map(tech => (
              <span key={tech} className="font-mono text-[13px] text-slate-400 px-4 py-2 rounded-lg bg-white/5 border border-white/10 transition-all hover:text-brand-400 hover:border-brand-500/30">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 7. CTA FOOTER */}
      <section className="text-center py-[120px] px-6 bg-[radial-gradient(ellipse_60%_80%_at_50%_100%,rgba(99,102,241,0.15)_0%,transparent_70%)] bg-[#020617] relative z-10">
        <motion.h2 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={reveal}
          className="text-[clamp(32px,5vw,52px)] font-extrabold tracking-tight text-slate-50 mb-4"
        >
          Ready to take control<br/>of your fleet?
        </motion.h2>
        <motion.p 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{...reveal, visible: {...reveal.visible, transition: {delay: 0.1, duration: 0.7}}}}
          className="text-[17px] text-slate-400 mb-10"
        >
          Dispatch with confidence. Every trip validated. Every status synced.
        </motion.p>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{...reveal, visible: {...reveal.visible, transition: {delay: 0.2, duration: 0.7}}}}
        >
          <Link 
            to="/login" 
            className="group relative overflow-hidden bg-brand-600 text-white px-10 py-4 rounded-xl font-bold text-[17px] inline-flex items-center gap-2.5 shadow-[0_0_0_1px_rgba(99,102,241,0.12),0_8px_24px_-8px_rgba(99,102,241,0.35)] transition-transform hover:-translate-y-1"
          >
            Launch Console <ArrowRight className="w-5 h-5" />
            <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-all duration-700 ease-out group-hover:left-[100%]"></div>
          </Link>
          <div className="mt-8 font-mono text-[13px] text-slate-500">
            Odoo Hackathon 2026 · Virtual Round
          </div>
        </motion.div>
      </section>

      {/* Tailwind specific animations appended dynamically */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scroll-x {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}} />
    </div>
  )
}

function FeatureCard({ icon, title, desc, delay }) {
  const tiltRef = useRef(null)
  
  const handleMouseMove = (e) => {
    if (!tiltRef.current) return
    const rect = tiltRef.current.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    const rx = (py - 0.5) * -16
    const ry = (px - 0.5) * 16
    tiltRef.current.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`
  }
  
  const handleMouseLeave = () => {
    if (!tiltRef.current) return
    tiltRef.current.style.transform = ''
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={{...reveal, visible: {...reveal.visible, transition: {delay, duration: 0.6}}}}
    >
      <div 
        ref={tiltRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="group bg-white/5 border border-brand-500/20 rounded-2xl p-8 backdrop-blur-md transition-all duration-300 ease-out hover:shadow-[0_0_0_1px_rgba(99,102,241,0.12),0_8px_24px_-8px_rgba(99,102,241,0.35)] cursor-default will-change-transform"
      >
        <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/25 flex items-center justify-center mb-5 text-brand-400 transition-transform duration-300 group-hover:rotate-6">
          {icon}
        </div>
        <h3 className="text-[19px] font-bold text-slate-100 mb-2.5">{title}</h3>
        <p className="text-[14px] text-slate-400 leading-[1.6]">{desc}</p>
      </div>
    </motion.div>
  )
}

function RoleCard({ letter, title, scope, desc, gradient, delay }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={{...reveal, visible: {...reveal.visible, transition: {delay, duration: 0.6}}}}
    >
      <div className="bg-white/5 border border-white/10 rounded-2xl p-7 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-500/50 hover:shadow-[0_0_0_1px_rgba(99,102,241,0.12),0_8px_24px_-8px_rgba(99,102,241,0.35)]">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-[22px] font-extrabold text-white mb-4 bg-gradient-to-br ${gradient}`}>
          {letter}
        </div>
        <h3 className="text-[17px] font-bold text-slate-100 mb-1.5">{title}</h3>
        <div className="font-mono text-[12px] text-slate-500 mb-3">{scope}</div>
        <p className="text-[13px] text-slate-400 leading-[1.55]">{desc}</p>
      </div>
    </motion.div>
  )
}

function ModulePill({ icon, label, delay }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={{...reveal, visible: {...reveal.visible, transition: {delay, duration: 0.5}}}}
      className="group flex flex-col items-center gap-3 p-7 rounded-2xl bg-[#0f172a]/60 border border-white/5 transition-all duration-300 hover:border-brand-500/50 hover:-translate-y-1 hover:shadow-[0_0_0_1px_rgba(99,102,241,0.12),0_8px_24px_-8px_rgba(99,102,241,0.35)]"
    >
      <div className="text-brand-400 transition-transform duration-300 group-hover:scale-110">
        {React.cloneElement(icon, { className: "w-7 h-7" })}
      </div>
      <span className="text-[14px] font-semibold text-slate-300">{label}</span>
    </motion.div>
  )
}
