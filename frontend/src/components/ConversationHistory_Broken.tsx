import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Play, Download, Search, Calendar } from "lucide-react";

interface Conversation {
  id: string;
  timestamp: string;
  transcript: string;
  duration: string;
}

const ConversationHistory = () => {
  const [conversations] = useState<Conversation[]>([
    {
      id: "1",
      timestamp: "2024-01-15 14:30",
      transcript: "User asked about local AI capabilities and received detailed response...",
      duration: "02:45",
    },
    {
      id: "2",
      timestamp: "2024-01-15 12:15",
      transcript: "Discussion about voice cloning technology and privacy concerns...",
      duration: "01:30",
    },
    {
      id: "3",
      timestamp: "2024-01-14 16:45",
      transcript: "Testing different voice models and comparing output quality...",
      duration: "03:12",
    },
  ]);

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-12 text-foreground">
          Conversation <span className="text-neon-blue">History</span>
        </h2>

        <Card className="bg-glass-gradient backdrop-blur-xl border-2 border-neon-blue/30 rounded-2xl p-8 shadow-2xl">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                className="pl-10 bg-muted/30 border-neon-blue/20 focus:border-neon-blue"
              />
            </div>

            <Button
              variant="outline"
              className="border-accent/50 hover:bg-accent/10"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Filter by Date
            </Button>
          </div>

          {/* Timeline */}
          <div className="space-y-6">
            {conversations.map((conv, index) => (
              <div key={conv.id} className="relative">
                {/* Timeline Line */}
                {index < conversations.length - 1 && (
                  <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-gradient-to-b from-neon-blue to-transparent" />
                )}

                <div className="flex gap-6 group">
                  {/* Timeline Dot */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-neon-gradient flex items-center justify-center shadow-lg shadow-neon-blue/50 group-hover:scale-110 transition-transform">
                      <div className="w-4 h-4 rounded-full bg-background" />
                    </div>
                  </div>

                  {/* Content Card */}
                  <div className="flex-1 bg-muted/30 border border-neon-blue/20 rounded-xl p-6 hover:border-neon-blue/40 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {conv.timestamp}
                        </p>
                        <p className="text-foreground">{conv.transcript}</p>
                      </div>
                      <span className="text-sm font-mono text-accent">
                        {conv.duration}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-neon-blue/50 hover:bg-neon-blue/10"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Play Audio
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="border-accent/50 hover:bg-accent/10"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export (JSON)
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
};

export default ConversationHistory;
