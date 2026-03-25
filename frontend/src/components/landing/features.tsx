import { Calendar, BarChart, Users } from "lucide-react";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function Features() {
  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="py-20 w-full max-w-4xl mx-auto"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <motion.div variants={itemVariants} className="flex flex-col items-center text-center">
          <Calendar className="w-12 h-12" />
          <h3 className="mt-4 text-xl font-bold">Create Events</h3>
          <p className="mt-2 text-muted-foreground">
            Easily create and manage events of all sizes.
          </p>
        </motion.div>
        <motion.div variants={itemVariants} className="flex flex-col items-center text-center">
          <Users className="w-12 h-12" />
          <h3 className="mt-4 text-xl font-bold">Manage Attendees</h3>
          <p className="mt-2 text-muted-foreground">
            Keep track of your attendees and their information.
          </p>
        </motion.div>
        <motion.div variants={itemVariants} className="flex flex-col items-center text-center">
          <BarChart className="w-12 h-12" />
          <h3 className="mt-4 text-xl font-bold">Analyze Data</h3>
          <p className="mt-2 text-muted-foreground">
            Gain insights into your events with our analytics tools.
          </p>
        </motion.div>
      </div>
    </motion.section>
  );
}
