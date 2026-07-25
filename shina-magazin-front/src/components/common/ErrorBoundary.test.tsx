import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useState } from 'react';
import '../../i18n'; // global i18n instance (useTranslation uchun)
import { ErrorBoundary } from './ErrorBoundary';

/**
 * Xato chegarasi OQ EKRANNI oldini olishini qulflaydi.
 *
 * Ilgari kod bazasida bitta ham chegara yo'q edi: React 16+ da ushlanmagan
 * render xatosi butun daraxtni yechib tashlaydi, ya'ni bitta komponentdagi
 * `undefined.map(...)` operatorga bo'sh oq sahifa berardi — na xabar, na
 * tiklanish yo'li.
 */

function Boom({ shouldThrow }: { shouldThrow: boolean }): React.ReactElement {
  if (shouldThrow) {
    throw new Error('render paytida yiqildi');
  }
  return <div>Kontent</div>;
}

function renderBoundary(ui: React.ReactNode, resetKeys?: unknown[]) {
  return render(
    <MemoryRouter>
      <ErrorBoundary resetKeys={resetKeys}>{ui}</ErrorBoundary>
    </MemoryRouter>
  );
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React ushlangan xatoni baribir konsolga yozadi — testda shovqin bo'lmasin
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("xatosiz holatda bolalarni odatdagidek ko'rsatadi", () => {
    renderBoundary(<Boom shouldThrow={false} />);
    expect(screen.getByText('Kontent')).toBeInTheDocument();
  });

  it('render xatosini ushlab, oq ekran o\'rniga xabar ko\'rsatadi', () => {
    renderBoundary(<Boom shouldThrow />);

    // Sahifa bo'sh EMAS — foydalanuvchi nima bo'lganini ko'radi
    expect(screen.getByText(/Nimadir noto'g'ri ketdi/i)).toBeInTheDocument();
    expect(screen.queryByText('Kontent')).not.toBeInTheDocument();
  });

  it('tiklanish yo\'lini beradi: qayta urinish, yangilash, bosh sahifa', () => {
    renderBoundary(<Boom shouldThrow />);

    expect(screen.getByRole('button', { name: /Qayta urinish/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sahifani yangilash/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Bosh sahifa/i })).toBeInTheDocument();
  });

  it('"Qayta urinish" chegarani tiklaydi — sabab yo\'qolgan bo\'lsa kontent qaytadi', () => {
    function Recoverable() {
      const [broken, setBroken] = useState(true);
      return (
        <>
          <button onClick={() => setBroken(false)}>Tuzatish</button>
          <ErrorBoundary>
            <Boom shouldThrow={broken} />
          </ErrorBoundary>
        </>
      );
    }

    render(<MemoryRouter><Recoverable /></MemoryRouter>);
    expect(screen.getByText(/Nimadir noto'g'ri ketdi/i)).toBeInTheDocument();

    // Sababni yo'qotamiz, so'ng chegarani tiklaymiz
    fireEvent.click(screen.getByText('Tuzatish'));
    fireEvent.click(screen.getByRole('button', { name: /Qayta urinish/i }));

    expect(screen.getByText('Kontent')).toBeInTheDocument();
  });

  // Bu eng oson unutiladigan xatti-harakat: chegarasi tiklanmasa, bir marta
  // yiqilgan sahifadan keyin BOSHQA sahifaga o'tilganda ham xato ko'rinib turardi.
  it('resetKeys o\'zgarganda (marshrut almashganda) o\'zini tiklaydi', () => {
    const { rerender } = render(
      <MemoryRouter>
        <ErrorBoundary resetKeys={['/mahsulotlar']}>
          <Boom shouldThrow />
        </ErrorBoundary>
      </MemoryRouter>
    );
    expect(screen.getByText(/Nimadir noto'g'ri ketdi/i)).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <ErrorBoundary resetKeys={['/sotuvlar']}>
          <Boom shouldThrow={false} />
        </ErrorBoundary>
      </MemoryRouter>
    );

    expect(screen.getByText('Kontent')).toBeInTheDocument();
    expect(screen.queryByText(/Nimadir noto'g'ri ketdi/i)).not.toBeInTheDocument();
  });

  it('resetKeys o\'zgarmasa xato holatida qoladi', () => {
    const { rerender } = renderBoundary(<Boom shouldThrow />, ['/mahsulotlar']);
    expect(screen.getByText(/Nimadir noto'g'ri ketdi/i)).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <ErrorBoundary resetKeys={['/mahsulotlar']}>
          <Boom shouldThrow={false} />
        </ErrorBoundary>
      </MemoryRouter>
    );

    expect(screen.getByText(/Nimadir noto'g'ri ketdi/i)).toBeInTheDocument();
  });
});
