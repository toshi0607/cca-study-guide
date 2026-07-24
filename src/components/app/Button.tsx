import type { ComponentChildren, JSX } from 'preact';
import { buttonClass, type ButtonVariant } from './ui';

type ButtonProps = Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'class' | 'type'> & {
  variant?: ButtonVariant;
  wide?: boolean;
  type?: 'button' | 'submit' | 'reset';
  class?: string;
  children?: ComponentChildren;
};

// Renders the shared .btn component. `type` defaults to "button" (the app never
// wants an accidental implicit submit); pass type="submit" to override.
export function Button({ variant, wide, class: cls, type = 'button', children, ...rest }: ButtonProps) {
  return (
    <button type={type} class={buttonClass(variant, { wide, class: cls })} {...rest}>
      {children}
    </button>
  );
}
