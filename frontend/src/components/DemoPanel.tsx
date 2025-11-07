import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Play, Zap, Cpu, Clock } from "lucide-react";

const DemoPanel = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("Your voice transcript will appear here...");
  const [streamingText, setStreamingText] = useState("");

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setTranscript("Listening...");
    }
  };

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-12 text-foreground">
          Live <span className="text-accent">Demo</span> Panel
        </h2>

        <Card className="bg-glass-gradient backdrop-blur-xl border-2 border-neon-blue/30 rounded-2xl p-8 shadow-2xl">
          {/* Status Chips */}
          <div className="flex flex-wrap gap-3 mb-8">
            <Badge className="bg-neon-blue/20 text-neon-blue border-neon-blue/50 px-4 py-2 text-sm">
              STT ✓
            </Badge>
            <Badge className="bg-neon-pink/20 text-neon-pink border-neon-pink/50 px-4 py-2 text-sm">
              LLM ✓
            </Badge>
            <Badge className="bg-accent/20 text-accent border-accent/50 px-4 py-2 text-sm">
              TTS ✓
            </Badge>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Mic Control & Waveform */}
            <div className="space-y-6">
              {/* Mic Button */}
              <div className="flex justify-center">
                <Button
                  onClick={toggleRecording}
                  size="lg"
                  className={`w-32 h-32 rounded-full transition-all duration-300 ${
                    isRecording
                      ? "bg-destructive hover:bg-destructive/90 animate-pulse shadow-lg shadow-destructive/50"
                      : "bg-neon-gradient hover:opacity-90 shadow-lg shadow-neon-blue/50"
                  }`}
                >
                  {isRecording ? (
                    <MicOff className="w-12 h-12" />
                  ) : (
                    <Mic className="w-12 h-12" />
                  )}
                </Button>
              </div>

              {/* Waveform Visualization */}
              <div className="bg-muted/30 rounded-xl p-6 border border-neon-blue/20">
                <div className="flex items-end justify-center gap-1 h-32">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 bg-neon-gradient rounded-full transition-all duration-300 ${
                        isRecording ? "animate-pulse" : ""
                      }`}
                      style={{
                        height: isRecording ? `${Math.random() * 100 + 20}%` : "20%",
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Transcript Display */}
              <div className="bg-muted/30 rounded-xl p-6 border border-neon-pink/20 min-h-[120px]">
                <p className="text-sm text-muted-foreground mb-2">Your Speech:</p>
                <p className="text-foreground">{transcript}</p>
              </div>
            </div>

            {/* Right: Streaming Response & Controls */}
            <div className="space-y-6">
              {/* Streaming Token Visualization */}
              <div className="bg-muted/30 rounded-xl p-6 border border-accent/20 min-h-[200px]">
                <p className="text-sm text-muted-foreground mb-2">AI Response:</p>
                <p className="text-foreground font-mono typewriter">
                  {streamingText || "AI response will stream here..."}
                </p>
              </div>

              {/* TTS Controls */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1 border-neon-blue/50 hover:bg-neon-blue/10"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Fast TTS
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-accent/50 hover:bg-accent/10"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  HQ TTS
                </Button>
              </div>

              {/* Metrics Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-neon-blue/10 to-transparent border border-neon-blue/30 rounded-lg p-4">
                  <Clock className="w-5 h-5 text-neon-blue mb-2" />
                  <p className="text-xs text-muted-foreground">Latency</p>
                  <p className="text-lg font-bold text-foreground">120ms</p>
                </div>

                <div className="bg-gradient-to-br from-accent/10 to-transparent border border-accent/30 rounded-lg p-4">
                  <Cpu className="w-5 h-5 text-accent mb-2" />
                  <p className="text-xs text-muted-foreground">GPU</p>
                  <p className="text-lg font-bold text-foreground">45%</p>
                </div>

                <div className="bg-gradient-to-br from-neon-pink/10 to-transparent border border-neon-pink/30 rounded-lg p-4">
                  <Zap className="w-5 h-5 text-neon-pink mb-2" />
                  <p className="text-xs text-muted-foreground">Version</p>
                  <p className="text-lg font-bold text-foreground">v2.1</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default DemoPanel;
