"use client";

/**
 * A plain <form> that asks for confirmation before submitting — for
 * destructive server actions (e.g. deleting a book) bound with
 * `action.bind(null, id)` and passed in from a Server Component.
 */
export function ConfirmSubmitForm({
  action,
  confirmText,
  id,
  className,
  children,
}: {
  action: (formData: FormData) => void;
  confirmText: string;
  /** Lets a button elsewhere submit this form via its `form` attribute. */
  id?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <form
      id={id}
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
