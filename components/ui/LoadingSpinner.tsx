type LoadingSpinnerProps = {
  message?: string;
  fullScreen?: boolean;
};

type InlineSpinnerProps = {
  label: string;
};

export default function LoadingSpinner({
  message = 'Loading...',
  fullScreen = false,
}: LoadingSpinnerProps) {
  return (
    <div className={fullScreen ? 'loader-wrap loader-wrap-fullscreen' : 'loader-wrap'} role="status" aria-live="polite">
      <span className="circle-loader" aria-hidden="true" />
      <p className="loader-message">{message}</p>
    </div>
  );
}

export function InlineSpinner({ label }: InlineSpinnerProps) {
  return (
    <span className="inline-loader-content" role="status" aria-live="polite">
      <span className="inline-loader" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
