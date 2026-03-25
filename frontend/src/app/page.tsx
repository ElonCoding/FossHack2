"use client";

import { Button } from "@/components/ui/button";
import { Twitter, Github, Linkedin } from "lucide-react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";

const Features = dynamic(() => import("@/components/landing/features").then((mod) => mod.Features), {
  ssr: false,
});

export default function Home() {
  return (
    <div className="flex flex-col min-h-full">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center py-20"
        >
          <h1 className="text-6xl font-bold">
            The Future of Event Management
          </h1>
          <p className="mt-3 text-2xl">
            A modern, open-source platform for creating and managing events.
          </p>
          <Button className="mt-8" asChild>
            <Link href="/signup">Get Started</Link>
          </Button>
        </motion.section>

        <Features />

      <footer className="border-t">
        <div className="container flex items-center justify-between py-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Event Platform. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" target="_blank" rel="noreferrer">
              <Twitter className="w-6 h-6" />
            </a>
            <a href="#" target="_blank" rel="noreferrer">
              <Github className="w-6 h-6" />
            </a>
            <a href="#" target="_blank" rel="noreferrer">
              <Linkedin className="w-6 h-6" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
