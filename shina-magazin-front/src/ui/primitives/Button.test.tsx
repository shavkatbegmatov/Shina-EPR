import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, buttonVariants } from '@/ui';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Saqlash</Button>);
    expect(screen.getByRole('button', { name: 'Saqlash' })).toBeInTheDocument();
  });

  it('applies DaisyUI variant + size classes', () => {
    render(<Button variant="primary" size="sm">X</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('btn', 'btn-primary', 'btn-sm');
  });

  it('variant="default" adds no color class', () => {
    render(<Button variant="default">X</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('btn');
    expect(btn).not.toHaveClass('btn-primary');
  });

  it('loading disables the button and sets aria-busy', () => {
    render(<Button loading>X</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });

  it('calls onClick when pressed', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>X</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('buttonVariants() emits btn classes for links/anchors', () => {
    const cls = buttonVariants({ variant: 'outline' });
    expect(cls).toContain('btn');
    expect(cls).toContain('btn-outline');
  });
});
