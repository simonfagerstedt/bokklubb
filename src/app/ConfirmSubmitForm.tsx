"use client";

/**
 * A plain <form> that asks for confirmation before submitting — for
 * destructive server actions (e.g. deleting a book) bound with
 * `action.bind(null, id)` and passed in from a Server Component.
 */
export function ConfirmSubmitForm({
  action,
  confirmText,
  className,
  children,
}: {
  action: (formData: FormData) => void;
  confirmText: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
      className={className}
    >
      {children}
    </form>
  );
}
