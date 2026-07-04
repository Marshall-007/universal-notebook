import { useState, useCallback, useRef } from 'react';
import { searchNotes, searchByDateRange, getRecentNotes } from '@/lib/search';
import type { SearchResult, Note } from '@/types';

export function useSearch(userId: string) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [query, setQuery] = useState('');
  // Monotonic request id so out-of-order responses can't clobber newer state.
  const reqId = useRef(0);

  const search = useCallback(async (searchQuery: string) => {
    const myId = ++reqId.current;
    setQuery(searchQuery);
    if (!searchQuery.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const searchResults = await searchNotes(searchQuery, userId);
      if (myId === reqId.current) setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      if (myId === reqId.current) setIsSearching(false);
    }
  }, [userId]);

  const searchByDate = useCallback(async (startDate: string, endDate: string) => {
    setIsSearching(true);
    try {
      const notes = await searchByDateRange(userId, startDate, endDate);
      setResults(notes.map((note) => ({ note, matchedText: '', score: 1 })));
    } catch (error) {
      console.error('Date search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [userId]);

  const getRecent = useCallback(async (limit = 10): Promise<Note[]> => {
    return getRecentNotes(userId, limit);
  }, [userId]);

  const clearResults = useCallback(() => {
    setResults([]);
    setQuery('');
  }, []);

  return {
    results,
    isSearching,
    query,
    search,
    searchByDate,
    getRecent,
    clearResults,
  };
}
