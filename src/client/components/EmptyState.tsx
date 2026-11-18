// Centered empty-state box with optional action.
import type { ReactNode } from 'react';

interface Props {
  title: string;
  body?: string;
  action?: ReactNode;
}

export default function EmptyState({ title, body, action }: Props) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {body ? <p>{body}</p> : null}
      {action ? <div className="mt-24">{action}</div> : null}
    </div>
  );
}
