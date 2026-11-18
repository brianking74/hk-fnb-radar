// Page heading: optional letterspaced serif kicker, serif H1, double hairline
// rule (1px charcoal over 1px brass).
import type { ReactNode } from 'react';

interface Props {
  kicker?: string;
  kickerBrass?: boolean;
  title: ReactNode;
  children?: ReactNode;
}

export default function PageHeading({ kicker, kickerBrass, title, children }: Props) {
  return (
    <div>
      {kicker ? <p className={`kicker${kickerBrass ? ' kicker--brass' : ''}`}>{kicker}</p> : null}
      <h1 className="page-title">{title}</h1>
      <div className="rule-double" aria-hidden="true" />
      {children ? <div className="page-intro">{children}</div> : null}
    </div>
  );
}
