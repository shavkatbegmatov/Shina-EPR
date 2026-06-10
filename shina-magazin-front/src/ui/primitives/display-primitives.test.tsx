import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Package } from 'lucide-react';
import { StatCard, Badge, Card, EmptyState, Skeleton } from '@/ui';

describe('display-primitives', () => {
  it('StatCard renders title, value and trend % when trend given', () => {
    render(<StatCard title="Sotuvlar" value="1 240" icon={Package} trend={12.5} />);

    expect(screen.getByText('Sotuvlar')).toBeInTheDocument();
    expect(screen.getByText('1 240')).toBeInTheDocument();
    // trend formatted to one decimal with % suffix
    expect(screen.getByText('12.5%')).toBeInTheDocument();
  });

  it('StatCard omits the trend pill when no trend is provided', () => {
    render(<StatCard title="Ombor" value={42} icon={Package} />);

    expect(screen.getByText('Ombor')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });

  it('Badge with tone="success" gets a success-tinted class', () => {
    render(<Badge tone="success">Faol</Badge>);

    const badge = screen.getByText('Faol');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('text-success');
  });

  it('Card renders children and maps padding="lg" to p-6', () => {
    render(
      <Card padding="lg">
        <span>Karta ichi</span>
      </Card>,
    );

    const child = screen.getByText('Karta ichi');
    expect(child).toBeInTheDocument();
    expect(child.parentElement).toHaveClass('p-6');
  });

  it('EmptyState renders title, description and the action node', () => {
    render(
      <EmptyState
        icon={Package}
        title="Hech narsa yo'q"
        description="Ro'yxat bo'sh"
        action={<button type="button">Qo'shish</button>}
      />,
    );

    expect(screen.getByText("Hech narsa yo'q")).toBeInTheDocument();
    expect(screen.getByText("Ro'yxat bo'sh")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Qo'shish" })).toBeInTheDocument();
  });

  it('Skeleton has the skeleton class', () => {
    render(<Skeleton data-testid="sk" />);

    expect(screen.getByTestId('sk')).toHaveClass('skeleton');
  });
});
