import { useEffect, useMemo, useState } from 'react';
import { GripVertical, HelpCircle, ArrowUp, ArrowDown, ListOrdered } from 'lucide-react';
import type { Question } from '../data/questions';

interface PolicyOrdererProps {
  question: Question;
  selectedOptions: string[];
  isSubmitted: boolean;
  isLoading: boolean;
  onOptionToggle: (option: string) => void;
  /** Replaces the whole ordering in one step. */
  onOrderChange?: (order: string[]) => void;
}

/**
 * Drag-and-drop ordering for firewall policies.
 *
 * Pointer dragging is the primary interaction, but it is not the only one:
 * the move-up / move-down buttons are real controls, not a fallback, so the
 * exercise works with a keyboard, on a phone, and with a screen reader.
 * Native HTML5 drag events are used rather than a drag library — the
 * portal ships no new dependencies for this.
 */
export default function PolicyOrderer({
  question, selectedOptions, isSubmitted, isLoading, onOptionToggle, onOrderChange,
}: PolicyOrdererProps) {
  // `options` is the scrambled presentation order; `selectedOptions` is the
  // learner's current arrangement once they have touched it.
  const initial = useMemo(() => question.options, [question.options]);
  const [order, setOrder] = useState<string[]>(() => (selectedOptions.length === initial.length ? selectedOptions : initial));
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  // A new question must reset the arrangement, or the previous answer leaks in.
  // The presented order is also seeded into the answer immediately, so the
  // learner can submit a deliberate "this is already correct" without having
  // to make a pointless move first.
  useEffect(() => {
    const next = selectedOptions.length === initial.length ? selectedOptions : initial;
    setOrder(next);
    setDragging(null);
    setOver(null);
    if (selectedOptions.length !== initial.length && !isSubmitted) onOrderChange?.(next);
  }, [initial, question.id]);

  const commit = (next: string[]) => {
    setOrder(next);
    if (onOrderChange) onOrderChange(next);
    else next.forEach(label => onOptionToggle(label));
  };

  const move = (from: number, to: number) => {
    if (isSubmitted || isLoading) return;
    if (to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commit(next);
  };

  const correctOrder = question.correctAnswers;
  const details = question.orderingDetails ?? {};

  return (
    <div className="flex flex-col space-y-4">
      <div className="p-5 bg-watchguard-dark/60 rounded-xl border border-watchguard-border relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-watchguard-orange" />
        <div className="flex items-start space-x-3.5">
          <HelpCircle className="w-5 h-5 text-watchguard-orange flex-shrink-0 mt-0.5" />
          <p className="text-gray-100 font-medium text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
            {question.question}
          </p>
        </div>
        <p className="text-xs text-watchguard-orange font-mono mt-3 pl-8 flex items-center gap-1.5">
          <ListOrdered className="w-3.5 h-3.5" />
          Position 1 is evaluated first. Drag the handle, or use the arrows.
        </p>
      </div>

      <ol className="space-y-2.5 pl-0 sm:pl-4" aria-label="Firewall policy processing order">
        {order.map((label, index) => {
          const isDragging = dragging === index;
          const isOver = over === index && dragging !== null && dragging !== index;

          let style = 'bg-watchguard-dark/40 border-watchguard-border hover:border-watchguard-orange/40 text-gray-200';
          if (isOver) style = 'bg-watchguard-orange/10 border-watchguard-orange border-dashed text-gray-100';
          if (isDragging) style = 'bg-watchguard-orange/15 border-watchguard-orange text-watchguard-orange opacity-70';
          if (isSubmitted) {
            style = label === correctOrder[index]
              ? 'bg-green-500/10 border-green-500 text-green-300'
              : 'bg-red-500/10 border-red-500 text-red-300';
          }

          return (
            <li
              key={label}
              draggable={!isSubmitted && !isLoading}
              onDragStart={() => setDragging(index)}
              onDragEnter={() => setOver(index)}
              onDragOver={event => event.preventDefault()}
              onDragEnd={() => { setDragging(null); setOver(null); }}
              onDrop={event => {
                event.preventDefault();
                if (dragging !== null) move(dragging, index);
                setDragging(null); setOver(null);
              }}
              className={`rounded-xl border transition-all px-3 py-3 flex items-start gap-3 ${style} ${isSubmitted ? '' : 'cursor-grab active:cursor-grabbing'}`}
            >
              <span className="font-mono font-bold text-xs bg-watchguard-dark border border-watchguard-border/60 rounded px-2 py-0.5 mt-0.5 flex-shrink-0">
                {index + 1}
              </span>
              <GripVertical className="w-4 h-4 text-gray-500 flex-shrink-0 mt-1" aria-hidden="true" />
              <span className="flex-1 min-w-0">
                <span className="block text-xs sm:text-sm font-semibold font-mono break-words">{label}</span>
                {details[label] && (
                  <span className="block text-[11px] text-gray-400 mt-0.5 break-words leading-relaxed">{details[label]}</span>
                )}
                {isSubmitted && label !== correctOrder[index] && (
                  <span className="block text-[10px] text-red-300 mt-1 font-mono">
                    Belongs at position {correctOrder.indexOf(label) + 1}
                  </span>
                )}
              </span>
              {!isSubmitted && (
                <span className="flex flex-col gap-1 flex-shrink-0">
                  <button
                    type="button"
                    aria-label={`Move ${label} up`}
                    disabled={index === 0 || isLoading}
                    onClick={() => move(index, index - 1)}
                    className="p-1 rounded border border-watchguard-border/60 text-gray-400 hover:text-white hover:border-watchguard-orange/50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-transparent"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${label} down`}
                    disabled={index === order.length - 1 || isLoading}
                    onClick={() => move(index, index + 1)}
                    className="p-1 rounded border border-watchguard-border/60 text-gray-400 hover:text-white hover:border-watchguard-orange/50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-transparent"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
