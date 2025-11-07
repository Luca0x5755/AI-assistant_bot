import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Trash2, Copy } from "lucide-react";

interface VoiceProfile {
  id: string;
  name: string;
  duration: string;
  date: string;
  embeddingId: string;
}

const VoiceProfileManager = () => {
  const [profiles, setProfiles] = useState<VoiceProfile[]>([
    {
      id: "1",
      name: "Sample Voice 1",
      duration: "00:45",
      date: "2024-01-15",
      embeddingId: "emb_abc123",
    },
    {
      id: "2",
      name: "Sample Voice 2",
      duration: "01:20",
      date: "2024-01-14",
      embeddingId: "emb_def456",
    },
  ]);

  const handleDelete = (id: string) => {
    setProfiles(profiles.filter((p) => p.id !== id));
  };

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-transparent via-muted/5 to-transparent">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-12 text-foreground">
          Voice <span className="text-neon-pink">Profile</span> Manager
        </h2>

        <Card className="bg-glass-gradient backdrop-blur-xl border-2 border-neon-pink/30 rounded-2xl p-8 shadow-2xl">
          {/* Upload Section */}
          <div className="mb-8">
            <div className="border-2 border-dashed border-accent/50 rounded-xl p-12 text-center hover:border-accent transition-colors cursor-pointer bg-accent/5">
              <Upload className="w-12 h-12 text-accent mx-auto mb-4" />
              <p className="text-lg font-semibold text-foreground mb-2">
                Drag & drop audio file
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse (WAV, MP3, FLAC)
              </p>
              <Button className="bg-gold-gradient hover:opacity-90 text-black font-semibold">
                Upload Voice Sample
              </Button>
            </div>
          </div>

          {/* Profile List */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Saved Profiles
            </h3>

            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="bg-muted/30 border border-neon-pink/20 rounded-xl p-6 hover:border-neon-pink/40 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-foreground mb-2">
                      {profile.name}
                    </h4>

                    {/* Waveform Preview */}
                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(30)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-neon-pink/60 rounded-full"
                          style={{
                            height: `${Math.random() * 24 + 8}px`,
                          }}
                        />
                      ))}
                    </div>

                    <div className="flex gap-6 text-sm text-muted-foreground">
                      <span>Duration: {profile.duration}</span>
                      <span>Date: {profile.date}</span>
                      <span className="font-mono text-xs">ID: {profile.embeddingId}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-neon-blue/50 hover:bg-neon-blue/10"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Clone Test
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(profile.id)}
                      className="border-destructive/50 hover:bg-destructive/10 text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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

export default VoiceProfileManager;