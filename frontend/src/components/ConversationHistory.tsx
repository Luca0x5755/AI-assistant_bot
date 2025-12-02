import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Play, Download, Search, Loader2, AlertCircle } from "lucide-react";
import {
  useConversations,
  useSearchConversations,
  useExportConversationSession,
  useConversationAudio
} from "@/hooks/use-avatar-api";

const ConversationHistory = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const perPage = 20;

  // Fetch conversations or search results
  const conversationsQuery = useConversations(currentPage, perPage);
  const searchMutation = useSearchConversations();
  const exportMutation = useExportConversationSession();
  const audioMutation = useConversationAudio();

  // Determine which data to display
  const displayData = isSearching && searchMutation.data
    ? searchMutation.data
    : conversationsQuery.data;

  const sessions = displayData?.sessions || [];
  const totalSessions = displayData?.total || 0;
  const isLoading = conversationsQuery.isLoading || searchMutation.isPending;
  const error = conversationsQuery.error || searchMutation.error;

  // Handle search
  const handleSearch = () => {
    if (searchQuery.trim()) {
      setIsSearching(true);
      searchMutation.mutate({ query: searchQuery, page: 1, perPage });
    } else {
      // Clear search
      setIsSearching(false);
      setCurrentPage(1);
      conversationsQuery.refetch();
    }
  };

  // Handle search on Enter key
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle export
  const handleExport = (sessionId: string, format: 'json' | 'txt' = 'json') => {
    exportMutation.mutate({ sessionId, format });
  };

  // Handle audio playback
  const handlePlayAudio = (sessionId: string, turnNumber: number = 1) => {
    audioMutation.mutate({ sessionId, turnNumber, audioType: 'ai_fast' });
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (isSearching && searchQuery) {
      searchMutation.mutate({ query: searchQuery, page: newPage, perPage });
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery("");
    setIsSearching(false);
    setCurrentPage(1);
    conversationsQuery.refetch();
  };

  // Loading state
  if (isLoading && !displayData) {
    return (
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-foreground">
            Conversation <span className="text-neon-blue">History</span>
          </h2>
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-neon-blue" />
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-foreground">
            Conversation <span className="text-neon-blue">History</span>
          </h2>
          <Card className="bg-red-500/10 border-red-500/50 p-8">
            <div className="flex items-center gap-3 text-red-500">
              <AlertCircle className="w-6 h-6" />
              <div>
                <p className="font-semibold">Error loading conversations</p>
                <p className="text-sm">{(error as Error).message}</p>
              </div>
            </div>
            <Button
              onClick={() => conversationsQuery.refetch()}
              className="mt-4"
              variant="outline"
            >
              Retry
            </Button>
          </Card>
        </div>
      </section>
    );
  }

  const totalPages = Math.ceil(totalSessions / perPage);

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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyPress}
              />
            </div>

            <Button
              onClick={handleSearch}
              disabled={searchMutation.isPending}
              className="bg-neon-gradient hover:opacity-90"
            >
              {searchMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Search
            </Button>

            {isSearching && (
              <Button
                onClick={handleClearSearch}
                variant="outline"
                className="border-accent/50 hover:bg-accent/10"
              >
                Clear Search
              </Button>
            )}
          </div>

          {/* Search Results Info */}
          {isSearching && (
            <div className="mb-6 text-sm text-muted-foreground">
              Found {totalSessions} result{totalSessions !== 1 ? 's' : ''} for "{searchQuery}"
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-6">
            {sessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {isSearching
                  ? `No conversations found matching "${searchQuery}"`
                  : "No conversations yet. Start chatting to see your history here!"
                }
              </div>
            ) : (
              sessions.map((session, index) => (
                <div key={session.session_id} className="relative">
                  {/* Timeline Line */}
                  {index < sessions.length - 1 && (
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
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground mb-1">
                            {new Date(session.created_at).toLocaleString()}
                          </p>
                          <p className="text-foreground mb-2">{session.first_message}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{session.turn_count} turn{session.turn_count !== 1 ? 's' : ''}</span>
                            {session.voice_profile_name && (
                              <>
                                <span>•</span>
                                <span>Voice: {session.voice_profile_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-neon-blue/50 hover:bg-neon-blue/10"
                          onClick={() => handlePlayAudio(session.session_id, 1)}
                          disabled={audioMutation.isPending}
                        >
                          {audioMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Play className="w-4 h-4 mr-2" />
                          )}
                          Play Audio
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="border-accent/50 hover:bg-accent/10"
                          onClick={() => handleExport(session.session_id, 'json')}
                          disabled={exportMutation.isPending}
                        >
                          {exportMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Download className="w-4 h-4 mr-2" />
                          )}
                          Export (JSON)
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="border-accent/50 hover:bg-accent/10"
                          onClick={() => handleExport(session.session_id, 'txt')}
                          disabled={exportMutation.isPending}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export (TXT)
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && sessions.length > 0 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <Button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
                variant="outline"
                size="sm"
              >
                Previous
              </Button>

              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>

              <Button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isLoading}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </div>
          )}

          {/* Loading indicator for pagination */}
          {isLoading && displayData && (
            <div className="flex justify-center mt-4">
              <Loader2 className="w-5 h-5 animate-spin text-neon-blue" />
            </div>
          )}
        </Card>
      </div>
    </section>
  );
};

export default ConversationHistory;