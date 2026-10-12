import { ConversationTurn, SavedMemoryItem } from '../types/assistant';

const STORAGE_KEY_TURNS = 'tamanna_conversation_history_v1';
const STORAGE_KEY_MEMORIES = 'tamanna_saved_memories_v1';
const MAX_STORED_TURNS = 60;

export class ConversationMemory {
  private static instance: ConversationMemory;
  private history: ConversationTurn[] = [];
  private memories: SavedMemoryItem[] = [];
  private listeners: Set<(history: ConversationTurn[]) => void> = new Set();
  private memoryListeners: Set<(memories: SavedMemoryItem[]) => void> = new Set();

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): ConversationMemory {
    if (!ConversationMemory.instance) {
      ConversationMemory.instance = new ConversationMemory();
    }
    return ConversationMemory.instance;
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const rawTurns = localStorage.getItem(STORAGE_KEY_TURNS);
      if (rawTurns) {
        const parsed = JSON.parse(rawTurns);
        if (Array.isArray(parsed)) {
          this.history = parsed.slice(-MAX_STORED_TURNS);
        }
      }

      const rawMemories = localStorage.getItem(STORAGE_KEY_MEMORIES);
      if (rawMemories) {
        const parsedMem = JSON.parse(rawMemories);
        if (Array.isArray(parsedMem)) {
          this.memories = parsedMem;
        }
      }
    } catch (e) {
      console.warn('[ConversationMemory] Error loading history from localStorage:', e);
      this.history = [];
      this.memories = [];
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_TURNS, JSON.stringify(this.history.slice(-MAX_STORED_TURNS)));
      localStorage.setItem(STORAGE_KEY_MEMORIES, JSON.stringify(this.memories));
    } catch (e) {
      console.warn('[ConversationMemory] Error saving to localStorage:', e);
    }
  }

  public addTurn(
    role: 'user' | 'assistant',
    text: string,
    toolInvocations?: Array<{ name: string; args?: any; success: boolean }>
  ): ConversationTurn {
    const trimmed = text.trim();
    if (!trimmed) {
      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role,
        text: '',
        timestamp: Date.now(),
      };
    }

    const turn: ConversationTurn = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role,
      text: trimmed,
      toolInvocations,
      timestamp: Date.now(),
    };

    this.history.push(turn);
    if (this.history.length > MAX_STORED_TURNS) {
      this.history = this.history.slice(-MAX_STORED_TURNS);
    }

    this.saveToStorage();
    this.notify();
    return turn;
  }

  public deleteTurn(id: string): void {
    this.history = this.history.filter((t) => t.id !== id);
    this.saveToStorage();
    this.notify();
  }

  public editTurn(id: string, newText: string): void {
    const idx = this.history.findIndex((t) => t.id === id);
    if (idx >= 0) {
      this.history[idx] = {
        ...this.history[idx],
        text: newText.trim(),
      };
      this.saveToStorage();
      this.notify();
    }
  }

  public getHistory(): ConversationTurn[] {
    return [...this.history];
  }

  public getRecentContext(turnsLimit: number = 8): string {
    const recent = this.history.slice(-turnsLimit);
    if (recent.length === 0) return '';

    return recent
      .map((t) => {
        const toolsPart = t.toolInvocations && t.toolInvocations.length > 0
          ? ` [Action: ${t.toolInvocations.map((ti) => `${ti.name}(${ti.success ? 'succeeded' : 'failed'})`).join(', ')}]`
          : '';
        return `${t.role === 'user' ? 'User' : 'Tamanna'}: ${t.text}${toolsPart}`;
      })
      .join('\n');
  }

  public clearHistory(): void {
    this.history = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_TURNS);
    }
    this.notify();
  }

  // --- Saved Long-Term Memories Methods ---

  public addMemory(
    category: SavedMemoryItem['category'],
    label: string,
    content: string
  ): SavedMemoryItem {
    const item: SavedMemoryItem = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category,
      label: label.trim(),
      content: content.trim(),
      timestamp: Date.now(),
    };
    this.memories.unshift(item);
    this.saveToStorage();
    this.notifyMemories();
    return item;
  }

  public updateMemory(id: string, label: string, content: string): void {
    const idx = this.memories.findIndex((m) => m.id === id);
    if (idx >= 0) {
      this.memories[idx] = {
        ...this.memories[idx],
        label: label.trim(),
        content: content.trim(),
      };
      this.saveToStorage();
      this.notifyMemories();
    }
  }

  public deleteMemory(id: string): void {
    this.memories = this.memories.filter((m) => m.id !== id);
    this.saveToStorage();
    this.notifyMemories();
  }

  public clearMemories(): void {
    this.memories = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_MEMORIES);
    }
    this.notifyMemories();
  }

  public getMemories(): SavedMemoryItem[] {
    return [...this.memories];
  }

  public getMemoriesContext(): string {
    if (this.memories.length === 0) return '';
    return this.memories
      .map((m) => `[${m.category.toUpperCase()} - ${m.label}]: ${m.content}`)
      .join('\n');
  }

  public subscribe(listener: (history: ConversationTurn[]) => void): () => void {
    this.listeners.add(listener);
    listener([...this.history]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeMemories(listener: (memories: SavedMemoryItem[]) => void): () => void {
    this.memoryListeners.add(listener);
    listener([...this.memories]);
    return () => {
      this.memoryListeners.delete(listener);
    };
  }

  private notify() {
    const copy = [...this.history];
    this.listeners.forEach((listener) => {
      try {
        listener(copy);
      } catch (err: any) {
        console.warn('[ConversationMemory] Listener error handled:', err?.message || err);
      }
    });
  }

  private notifyMemories() {
    const copy = [...this.memories];
    this.memoryListeners.forEach((listener) => {
      try {
        listener(copy);
      } catch (err: any) {
        console.warn('[ConversationMemory] Memory listener error handled:', err?.message || err);
      }
    });
  }
}
