"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarDays, ShieldCheck, Zap, Globe, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background py-20 lg:py-32">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-wider text-primary uppercase bg-primary/10 rounded-full">
                The Open Source Event Foundation
              </span>
              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight">
                Empowering <span className="text-primary italic">College Communities</span> with Seamless Ticketing
              </h1>
              <p className="text-xl text-muted-foreground mt-6 leading-relaxed">
                The ultimate platform for tech fests, hackathons, and university workshops. Open-source, transparent, and built by developers for developers.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
              <Link href="/events">
                <Button size="lg" className="h-12 px-8 text-md font-semibold">
                  Browse Events <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline" className="h-12 px-8 text-md font-semibold">
                  Organize an Event
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 -z-10 h-full w-full opacity-10 blur-3xl">
          <div className="absolute top-1/2 right-0 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-primary" />
          <div className="absolute top-1/4 left-0 h-[300px] w-[300px] -translate-y-1/2 rounded-full bg-amber-500" />
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <Zap className="h-10 w-10 text-primary" />,
                title: "Fast Setup",
                description: "Launch your event in minutes with our intuitive organizer dashboard."
              },
              {
                icon: <ShieldCheck className="h-10 w-10 text-green-500" />,
                title: "Secure Check-ins",
                description: "Validate attendees with high-performance QR scanners."
              },
              {
                icon: <Globe className="h-10 w-10 text-blue-500" />,
                title: "Open Source",
                description: "Built on a transparent architecture that scales for thousands."
              },
              {
                icon: <CalendarDays className="h-10 w-10 text-amber-500" />,
                title: "Any Event Type",
                description: "From 24-hour hackathons to week-long tech extravaganzas."
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
                className="p-6 bg-card rounded-2xl border shadow-sm space-y-4"
              >
                {feature.icon}
                <h3 className="text-xl font-bold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Tech Stack Callout */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-12">Powered by Modern Technology</h2>
          <div className="flex flex-wrap justify-center items-center gap-12 grayscale opacity-60">
            <span className="text-2xl font-bold">NEXT.JS</span>
            <span className="text-2xl font-bold">TS</span>
            <span className="text-2xl font-bold">PRISMA</span>
            <span className="text-2xl font-bold">NODE</span>
            <span className="text-2xl font-bold">POSTGRES</span>
          </div>
        </div>
      </section>

      <footer className="border-t py-12 bg-background">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2026 DevEvent Foundation. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
