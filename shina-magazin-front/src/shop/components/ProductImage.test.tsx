import { describe, it, expect } from 'vitest';
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '../../i18n';
import { ProductImage } from './ProductImage';

function renderImg(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('ProductImage', () => {
  it('src berilsa real rasmni ko\'rsatadi', () => {
    renderImg(<ProductImage src="/x.jpg" alt="Shina X" />);
    const img = screen.getByRole('img', { name: 'Shina X' });
    expect(img).toHaveAttribute('src', '/x.jpg');
  });

  it('fallback=svg — vektor pleysxolder (rasm tegi yo\'q)', () => {
    const { container } = renderImg(<ProductImage alt="Shina" fallback="svg" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it('fallback=photo — shina fotosi + "rasm mavjud emas" yorlig\'i', () => {
    const { container } = renderImg(<ProductImage alt="Shina" fallback="photo" />);
    expect(container.querySelector('img[src="/no-image-tire.png"]')).toBeInTheDocument();
    expect(screen.getByText('Rasm mavjud emas')).toBeInTheDocument();
  });
});
