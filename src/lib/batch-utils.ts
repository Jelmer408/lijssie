import { debounce, DebouncedFunc } from 'lodash';

interface BatchRequest<T> {
  id: string;
  operation: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}

class BatchProcessor {
  private batchSize: number;
  private batchTimeout: number;
  private pendingBatch: BatchRequest<any>[] = [];
  private batchTimer: NodeJS.Timeout | null = null;

  constructor(batchSize = 10, batchTimeout = 100) {
    this.batchSize = batchSize;
    this.batchTimeout = batchTimeout;
  }

  async add<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: BatchRequest<T> = {
        id: Math.random().toString(36).substring(7),
        operation,
        resolve,
        reject,
      };

      this.pendingBatch.push(request);

      if (this.pendingBatch.length >= this.batchSize) {
        this.processBatch();
      } else if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => this.processBatch(), this.batchTimeout);
      }
    });
  }

  private async processBatch() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    const batch = [...this.pendingBatch];
    this.pendingBatch = [];

    try {
      const results = await Promise.allSettled(
        batch.map(request => request.operation())
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          batch[index].resolve(result.value);
        } else {
          batch[index].reject(result.reason);
        }
      });
    } catch (error) {
      batch.forEach(request => request.reject(error));
    }
  }
}

// Create a singleton instance
export const batchProcessor = new BatchProcessor();

// Debounce function with TypeScript support
export function createDebouncedFunction<T extends (...args: any[]) => any>(
  func: T,
  wait = 300
): DebouncedFunc<T> {
  return debounce(func, wait);
}

// Pagination helper
export interface PaginatedResult<T> {
  data: T[];
  hasMore: boolean;
  nextPage: number | null;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  from?: number;
  to?: number;
}

export async function paginateQuery<T>(
  query: any,  // Supabase query
  params: PaginationParams = {}
): Promise<PaginatedResult<T>> {
  const {
    page = 1,
    pageSize = 50,
    from = (page - 1) * pageSize,
    to = from + pageSize - 1
  } = params;

  const countQuery = query.count();
  const dataQuery = query.range(from, to);

  const [{ count }, { data }] = await Promise.all([
    countQuery,
    dataQuery
  ]);

  return {
    data: data || [],
    hasMore: count > to + 1,
    nextPage: count > to + 1 ? page + 1 : null
  };
} 