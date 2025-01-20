import type { PropsWithChildren } from 'react';

export function SafeContainer({ children }: PropsWithChildren) {
  return (
    <div className="safe-container">
      {children}
    </div>
  );
} 