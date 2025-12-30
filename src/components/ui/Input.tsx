import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-white/70 font-inter">
            {label}
          </label>
        )}
        <input
          className={cn(
            'flex h-12 w-full rounded-glass bg-white/5 backdrop-blur-glass border border-white/8 px-4 py-3 text-sm font-inter text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-single-malt focus:border-single-malt disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300',
            error && 'border-red-400/50 focus:ring-red-400 focus:border-red-400',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-400 font-inter">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };