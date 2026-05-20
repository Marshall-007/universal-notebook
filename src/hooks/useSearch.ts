import { useState, useCallback } from 'react';
import { searchNotes, searchByDateRange, getRecentNotes } from '@/lib/search';
import type { SearchResult, Note } from '@/types';

export function useSearch(userId: string) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [query, setQuery] = useState('');

  const search = useCallback(async (searchQuery: string) => {
    setQuery(searchQuery);
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const searchResults = await searchNotes(searchQuery, userId);
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
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
