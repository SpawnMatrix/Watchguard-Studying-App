import { useLearningTrack } from '../engine/LearningTrack';
import { FLASHCARDS } from '../data/flashcards';
import { readJSON, writeStudyValue } from "../account/storage";
import { FLASHCARD_SRS_KEY, dueDeck, gradeCard, validFlashcardSrs, type FlashcardSrs } from "../engine/flashcardSrs";
import React, { useState, useMemo } from "react";
import { AlertCircle, CalendarCheck, RotateCcw, ThumbsUp } from "lucide-react";
import FlashcardStudioStats from "./FlashcardStudioStats";
import FlashcardStudioSidebar from "./FlashcardStudioSidebar";
import FlashcardStudioCard from "./FlashcardStudioCard";
import FlashcardStudioControls from "./FlashcardStudioControls";
import FlashcardStudioResources from "./FlashcardStudioResources";
import { isTypingTarget } from "../engine/shortcuts";

export default function FlashcardStudio() {
  const {track}=useLearningTrack();
  const trackCards=useMemo(()=>FLASHCARDS.filter(c=>track==='network-plus'?c.category==='Network+':track==='cloud'?c.category==='Cloud':c.category!=='Network+'&&c.category!=='Cloud'),[track]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Track study progress locally in state
  const [masteredIds, setMasteredIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem("watchguard_mastered_flashcards");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Today's deck is the default: it is the part of the routine that cannot be done by paging.
  const [mode, setMode] = useState<"due" | "browse">("due");
  const [schedule, setSchedule] = useState<FlashcardSrs>(() => { const saved = readJSON<unknown>(FLASHCARD_SRS_KEY, {}); return validFlashcardSrs(saved) ? saved : {}; });
  const [now, setNow] = useState(() => Date.now());
  React.useEffect(() => { if (Object.keys(schedule).length) writeStudyValue(FLASHCARD_SRS_KEY, JSON.stringify(schedule)); }, [schedule]);

  const categories = ["All", ...new Set<string>(trackCards.map(c=>c.category))];
  React.useEffect(()=>{setSelectedCategory("All");setCurrentIndex(0);setIsFlipped(false);},[track]);

  // Filter cards based on category and search query
  const filteredCards = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    return trackCards.filter(card => {
      const matchesCategory = selectedCategory === "All" || card.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!lowerQuery) return true;

      return card.question.toLowerCase().includes(lowerQuery) ||
             card.answer.toLowerCase().includes(lowerQuery) ||
             card.keyConcept.toLowerCase().includes(lowerQuery);
    });
  }, [selectedCategory, searchQuery, trackCards]);

  // Adjust index if out of bounds of current filtered list
  React.useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [selectedCategory, searchQuery, trackCards]);

  const deck = useMemo(() => dueDeck(filteredCards.map(c => c.id), schedule, masteredIds, now), [filteredCards, schedule, masteredIds, now]);
  const byId = useMemo(() => new Map(filteredCards.map(c => [c.id, c])), [filteredCards]);
  const activeCard = mode === "due" ? byId.get(deck.cards[0]) ?? null : filteredCards[currentIndex] || null;

  const grade = (knew: boolean) => {
    if (!activeCard) return;
    const at = Date.now();
    setSchedule(previous => gradeCard(previous, activeCard.id, knew, at));
    setNow(at);
    setIsFlipped(false);
  };

  const handleNext = () => {
    if (filteredCards.length === 0) return;
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % filteredCards.length);
    }, 150);
  };

  const handlePrev = () => {
    if (filteredCards.length === 0) return;
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
    }, 150);
  };

  // Left and right arrows move through the deck; the card itself flips with Enter or Space.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isTypingTarget(e.target)) return;
      if (mode === "due") {
        if (isFlipped && e.key === "1") { e.preventDefault(); grade(false); }
        else if (isFlipped && e.key === "2") { e.preventDefault(); grade(true); }
        return;
      }
      if (e.key === "ArrowRight") { e.preventDefault(); handleNext(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); handlePrev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const handleToggleMastered = (id: number) => {
    setMasteredIds((prev) => {
      const updated = prev.includes(id) 
        ? prev.filter(item => item !== id) 
        : [...prev, id];
      writeStudyValue("watchguard_mastered_flashcards", JSON.stringify(updated));
      return updated;
    });
  };

  const handleResetProgress = () => {
    if (window.confirm("Clear the mastered mark from every flashcard on all three tracks? Quiz history and lab progress are not affected.")) {
      setMasteredIds([]);
      writeStudyValue("watchguard_mastered_flashcards", null);
    }
  };

  const masteredCount = useMemo(() => {
    return trackCards.filter(c => masteredIds.includes(c.id)).length;
  }, [masteredIds,trackCards]);

  const progressPercent = Math.round((masteredCount / trackCards.length) * 100);

  return (
    <div className="space-y-6">
      
      <FlashcardStudioStats
        progressPercent={progressPercent}
        masteredCount={masteredCount}
        totalCount={trackCards.length}
        handleResetProgress={handleResetProgress}
      />

      <div className="console-tabs" role="group" aria-label="Flashcard mode">
        <button type="button" aria-pressed={mode === "due"} className={mode === "due" ? "is-active" : ""} onClick={() => { setMode("due"); setIsFlipped(false); setNow(Date.now()); }}>
          <CalendarCheck size={15} className="inline mr-1.5 -mt-0.5" />Due today ({deck.cards.length})
        </button>
        <button type="button" aria-pressed={mode === "browse"} className={mode === "browse" ? "is-active" : ""} onClick={() => { setMode("browse"); setIsFlipped(false); }}>
          Browse all
        </button>
      </div>

      {/* Main Flashcard Interface Arena */}
      <div className="bg-watchguard-gray border border-watchguard-border rounded-xl p-6 shadow-2xl flex flex-col md:flex-row gap-6">
        
        <FlashcardStudioSidebar
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredCardsLength={filteredCards.length}
          currentIndex={currentIndex}
          positionText={mode === "due" ? `${deck.cards.length} left today: ${deck.reviews} to review, ${deck.fresh} new.` : undefined}
        />

        {/* Right Side: Flashcard Display Stage */}
        <div className="flex-1 flex flex-col items-center justify-between min-h-[400px] bg-watchguard-dark/20 rounded-xl border border-watchguard-border/60 p-6 space-y-6">
          
          <div className="w-full text-center">
            {activeCard && (
              <span className="text-[9px] font-mono bg-watchguard-orange/10 border border-watchguard-orange/30 text-watchguard-orange px-2.5 py-1 rounded uppercase tracking-widest font-bold">
                {activeCard.category}
              </span>
            )}
          </div>

          <div className="w-full max-w-xl flex-1 flex items-center justify-center">
            {mode === "due" && filteredCards.length > 0 && !activeCard ? (
              <div className="text-center space-y-3 py-12" role="status">
                <CalendarCheck className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-sm text-gray-200">You are done for today.</p>
                <p className="text-xs text-gray-400">
                  {deck.nextDue ? `The next card comes back ${new Date(deck.nextDue).toLocaleString(undefined, { weekday: "long", hour: "numeric", minute: "2-digit" })}.` : "Every card here is retained or marked mastered."}
                </p>
                <button type="button" onClick={() => setMode("browse")} className="text-xs bg-watchguard-orange/10 border border-watchguard-orange/30 text-watchguard-orange hover:bg-watchguard-orange/20 px-3 py-1.5 rounded transition-all font-mono cursor-pointer">
                  Browse all cards
                </button>
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="text-center space-y-3 py-12">
                <AlertCircle className="w-10 h-10 text-gray-500 mx-auto" />
                <p className="text-sm text-gray-400 font-mono">No cards match this topic and search.</p>
                <button 
                  onClick={() => { setSelectedCategory("All"); setSearchQuery(""); }}
                  className="text-xs bg-watchguard-orange/10 border border-watchguard-orange/30 text-watchguard-orange hover:bg-watchguard-orange/20 px-3 py-1.5 rounded transition-all font-mono cursor-pointer"
                >
                  Clear topic and search
                </button>
              </div>
            ) : (
              activeCard && (
                <FlashcardStudioCard
                  activeCard={activeCard}
                  isFlipped={isFlipped}
                  setIsFlipped={setIsFlipped}
                />
              )
            )}
          </div>

          {activeCard && mode === "due" && (
            <div className="w-full max-w-xl flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-watchguard-border/40">
              {isFlipped ? (
                <div className="flex gap-3" role="group" aria-label="How well did you know it?">
                  <button type="button" onClick={() => grade(false)} className="secondary-button flex items-center gap-2 px-4 py-2 rounded-lg text-xs"><RotateCcw size={15} />Again <kbd className="opacity-60">1</kbd></button>
                  <button type="button" onClick={() => grade(true)} className="primary-button flex items-center gap-2 px-4 py-2 rounded-lg text-xs"><ThumbsUp size={15} />Knew it <kbd className="opacity-60">2</kbd></button>
                </div>
              ) : (
                <p className="text-xs text-gray-400">Answer in your own words, then reveal the card to grade yourself.</p>
              )}
              <span className="text-xs text-gray-400 font-mono">{schedule[String(activeCard.id)] ? `Box ${schedule[String(activeCard.id)].box} of 5` : "New card"}</span>
            </div>
          )}

          {activeCard && mode === "browse" && (
            <FlashcardStudioControls
              activeCardId={activeCard.id}
              masteredIds={masteredIds}
              handleToggleMastered={handleToggleMastered}
              handlePrev={handlePrev}
              handleNext={handleNext}
              currentIndex={currentIndex}
              filteredCardsLength={filteredCards.length}
            />
          )}

        </div>
      </div>

      <FlashcardStudioResources />

    </div>
  );
}
