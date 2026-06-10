import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '@/ui';

describe('ConfirmDialog', () => {
  it('renders the title and both confirm + cancel buttons when open', () => {
    render(
      <ConfirmDialog
        open
        onClose={() => {}}
        onConfirm={() => {}}
        title="Mahsulotni o'chirish"
      />,
    );

    expect(screen.getByText("Mahsulotni o'chirish")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tasdiqlash' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bekor qilish' })).toBeInTheDocument();
  });

  it('renders custom confirm and cancel labels', () => {
    render(
      <ConfirmDialog
        open
        onClose={() => {}}
        onConfirm={() => {}}
        title="Tasdiq"
        confirmText="Ha, o'chir"
        cancelText="Yo'q"
      />,
    );

    expect(screen.getByRole('button', { name: "Ha, o'chir" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Yo'q" })).toBeInTheDocument();
  });

  it('calls onConfirm when the confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        onClose={() => {}}
        onConfirm={onConfirm}
        title="Tasdiq"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Tasdiqlash' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        open
        onClose={onClose}
        onConfirm={() => {}}
        title="Tasdiq"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Bekor qilish' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders neither the title nor the buttons when open=false', () => {
    render(
      <ConfirmDialog
        open={false}
        onClose={() => {}}
        onConfirm={() => {}}
        title="Yashirin sarlavha"
      />,
    );

    expect(screen.queryByText('Yashirin sarlavha')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tasdiqlash' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bekor qilish' })).not.toBeInTheDocument();
  });

  it('uses the btn-error class on the confirm button when danger=true', () => {
    render(
      <ConfirmDialog
        open
        danger
        onClose={() => {}}
        onConfirm={() => {}}
        title="O'chirish"
      />,
    );

    expect(screen.getByRole('button', { name: 'Tasdiqlash' })).toHaveClass('btn-error');
  });

  it('does not use btn-error on the confirm button by default', () => {
    render(
      <ConfirmDialog
        open
        onClose={() => {}}
        onConfirm={() => {}}
        title="Saqlash"
      />,
    );

    expect(screen.getByRole('button', { name: 'Tasdiqlash' })).not.toHaveClass('btn-error');
  });
});
