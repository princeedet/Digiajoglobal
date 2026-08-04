import React from 'react'
import { Link } from 'react-router-dom'
import { twMerge } from 'tailwind-merge'
type Variant =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'outline'
  | 'ghost'
  | 'white'
type Size = 'sm' | 'md' | 'lg'
const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand disabled:opacity-60 disabled:cursor-not-allowed'
const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark shadow-sm hover:shadow-md',
  secondary: 'bg-brand-50 text-brand-dark hover:bg-brand-100',
  accent:
    'bg-accent text-brand-dark hover:bg-accent-dark shadow-sm hover:shadow-md',
  outline: 'border-2 border-brand text-brand hover:bg-brand hover:text-white',
  ghost: 'text-brand-dark hover:bg-brand-50',
  white: 'bg-white text-brand-dark hover:bg-brand-50 shadow-sm',
}
const sizes: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
}
interface CommonProps {
  variant?: Variant
  size?: Size
  className?: string
  children: React.ReactNode
}
type ButtonAsButton = CommonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    to?: undefined
    href?: undefined
  }
type ButtonAsLink = CommonProps & {
  to: string
  href?: undefined
}
type ButtonAsAnchor = CommonProps &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string
    to?: undefined
  }
type ButtonProps = ButtonAsButton | ButtonAsLink | ButtonAsAnchor
export function Button(props: ButtonProps) {
  const { variant = 'primary', size = 'md', className, children } = props
  const classes = twMerge(base, variants[variant], sizes[size], className)
  if ('to' in props && props.to) {
    return (
      <Link to={props.to} className={classes}>
        {children}
      </Link>
    )
  }
  if ('href' in props && props.href) {
    const { href, ...rest } = props as ButtonAsAnchor
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        {...rest}
      >
        {children}
      </a>
    )
  }
  const {
    variant: _v,
    size: _s,
    className: _c,
    children: _ch,
    ...rest
  } = props as ButtonAsButton
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  )
}
