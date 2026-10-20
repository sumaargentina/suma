"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  keywords?: string;
  meta?: Record<string, unknown>;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  fallbackOptionsOnSearch?: SearchableSelectOption[];
  value?: string;
  onValueChange: (value: string, option?: SearchableSelectOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  name?: string;
}

const normalizeStr = (str: string) =>
  (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export function SearchableSelect({
  options,
  fallbackOptionsOnSearch,
  value,
  onValueChange,
  placeholder = 'Seleccionar o escribir...',
  searchPlaceholder = 'Escribe las primeras letras para filtrar...',
  emptyMessage = 'No se encontraron coincidencias.',
  disabled = false,
  className,
  triggerClassName,
  name,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () =>
      options.find((o) => o.value === value || normalizeStr(o.value) === normalizeStr(value || '')) ||
      fallbackOptionsOnSearch?.find(
        (o) => o.value === value || normalizeStr(o.value) === normalizeStr(value || '')
      ),
    [options, fallbackOptionsOnSearch, value]
  );

  // Filtrar y ordenar inteligentemente:
  // 1° Los que empiezan exactamente con las letras escritas
  // 2° Los que tienen alguna palabra que empieza con las letras escritas
  // 3° Los que contienen las letras en cualquier parte o en sublabel/keywords
  const filteredOptions = useMemo(() => {
    const q = normalizeStr(query);
    if (!q) return options;

    const rankPool = (pool: SearchableSelectOption[]) => {
      const startsWithFull: SearchableSelectOption[] = [];
      const startsWithWord: SearchableSelectOption[] = [];
      const containsMatch: SearchableSelectOption[] = [];

      for (const opt of pool) {
        const normLabel = normalizeStr(opt.label);
        const normSub = normalizeStr(opt.sublabel || '');
        const normKey = normalizeStr(opt.keywords || '');

        if (normLabel.startsWith(q)) {
          startsWithFull.push(opt);
        } else if (
          normLabel.split(/[\s\-(),/]+/).some((w) => w.startsWith(q)) ||
          normSub.startsWith(q)
        ) {
          startsWithWord.push(opt);
        } else if (
          normLabel.includes(q) ||
          normSub.includes(q) ||
          normKey.includes(q)
        ) {
          containsMatch.push(opt);
        }
      }
      return [...startsWithFull, ...startsWithWord, ...containsMatch];
    };

    const primaryMatches = rankPool(options);
    if (!fallbackOptionsOnSearch || fallbackOptionsOnSearch.length === 0) {
      return primaryMatches;
    }

    const primaryKeys = new Set(primaryMatches.map((o) => `${normalizeStr(o.value)}|${normalizeStr(o.sublabel || '')}`));
    const secondaryMatches = rankPool(fallbackOptionsOnSearch).filter(
      (o) => !primaryKeys.has(`${normalizeStr(o.value)}|${normalizeStr(o.sublabel || '')}`)
    );

    return [...primaryMatches, ...secondaryMatches];
  }, [options, fallbackOptionsOnSearch, query]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, isOpen]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-enfocar el input cuando se abre
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    }
  }, [isOpen]);

  const handleSelect = (opt: SearchableSelectOption) => {
    onValueChange(opt.value, opt);
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setIsOpen(true);
        setQuery(e.key);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredOptions.length > 0 ? (prev + 1) % filteredOptions.length : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredOptions.length > 0
          ? (prev - 1 + filteredOptions.length) % filteredOptions.length
          : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setQuery('');
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {name && <input type="hidden" name={name} value={value || ''} />}

      {/* Trigger / Input directo */}
      {!isOpen ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex h-9 md:h-10 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-xs md:text-sm ring-offset-background transition-colors hover:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50 text-left',
            triggerClassName
          )}
        >
          <span className={cn('truncate', !selectedOption && !value && 'text-muted-foreground')}>
            {selectedOption ? selectedOption.label : value || placeholder}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
        </button>
      ) : (
        <div
          className={cn(
            'flex h-9 md:h-10 w-full items-center rounded-md border-2 border-teal-500 bg-white px-2.5 py-1 shadow-xs',
            triggerClassName
          )}
        >
          <Search className="h-3.5 w-3.5 text-teal-600 shrink-0 mr-2" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedOption ? selectedOption.label : searchPlaceholder}
            className="w-full bg-transparent text-xs md:text-sm outline-none placeholder:text-slate-400"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setQuery('');
              }}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <ChevronDown className="h-4 w-4 rotate-180 transition-transform" />
            </button>
          )}
        </div>
      )}

      {/* Lista desplegable filtrada en vivo */}
      {isOpen && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-50 animate-in fade-in-50 duration-100"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => {
              const isSelected =
                opt.value === value || normalizeStr(opt.value) === normalizeStr(value || '');
              const isHighlighted = idx === highlightedIndex;

              return (
                <button
                  key={`${opt.value}-${opt.sublabel || idx}`}
                  type="button"
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => handleSelect(opt)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-xs md:text-sm flex items-center justify-between gap-2 transition-colors',
                    isHighlighted ? 'bg-teal-50/90 text-teal-950' : 'hover:bg-slate-50 text-slate-800',
                    isSelected && 'font-semibold bg-teal-50/50 text-teal-800'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{opt.label}</div>
                    {opt.sublabel && (
                      <div className="text-[11px] text-teal-600 font-medium truncate">
                        {opt.sublabel}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {opt.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && <Check className="h-4 w-4 text-teal-600" />}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-3 text-xs text-slate-500 text-center">{emptyMessage}</div>
          )}
        </div>
      )}
    </div>
  );
}
