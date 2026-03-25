import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

interface EventCardProps {
  event: {
    id: string;
    title: string;
    date: string;
    location: string;
    image: string;
    description?: string;
  };
}

export function EventCard({ event }: EventCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
    >
      <Card>
        <CardHeader>
          <Image src={event.image} alt={event.title} className="rounded-t-lg" width={400} height={200} />
        </CardHeader>
        <CardContent>
          <CardTitle>{event.title}</CardTitle>
          <p className="text-muted-foreground">{event.date}</p>
          <p className="text-muted-foreground">{event.location}</p>
          {event.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{event.description}</p>}
        </CardContent>
        <CardFooter>
          <Button variant="outline" asChild>
            <Link href={`/events/${event.id}`}>View Details</Link>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
